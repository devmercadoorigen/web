// Costo del envío para el checkout.
// checkout_build calcula el pedido (incluido el peso y volumen del paquete). Si el envío
// se cobra con Hoko y no hay cotización válida, aquí se cotiza (o se reutiliza una de la
// caché), se guarda en shipping_quotes y se recalcula el pedido con shipping_quote_id.
// La usan shipping-quote (resumen del checkout) y create-order (crear el pedido), así
// el valor que ve el cliente y el que se cobra salen de la misma cotización.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { HokoError, hokoConfigured, quotation, syncCities, type HokoQuotation } from './hoko.ts';

const HOKO_TTL_MIN = 6 * 60;   // una cotización de Hoko sirve 6 horas
const FALLBACK_TTL_MIN = 10;   // la tarifa propia (Hoko caído) se reintenta a los 10 minutos
const PAYMENT_CREDIT = 1;      // el cliente ya pagó en Wompi: nada que recaudar al entregar

type Pkg = { weight_g: number; volume_cm3: number; declared_value: number };
type Quote = Record<string, any> & { shipping_pending?: boolean; package?: Pkg; problems?: unknown[] };

const roundUp = (v: number, step = 100) => Math.ceil(v / step) * step;

/** Caja para Hoko: peso en kg (redondeado hacia arriba, mínimo 1) y un cubo con el volumen + 20 % de holgura. */
export function boxFor(pkg: Pkg, boxWeightG: number) {
  const weight = Math.max(1, Math.ceil((pkg.weight_g + boxWeightG) / 1000));
  const side = Math.max(10, Math.ceil(Math.cbrt(Math.max(pkg.volume_cm3, 1) * 1.2)));
  return { weight, length: side, width: side, height: side };
}

/** La más barata; a igual precio, la más rápida. */
export function pickCourier(list: HokoQuotation[]): HokoQuotation | null {
  const days = (d: string) => Number(String(d ?? '').match(/\d+/g)?.pop() ?? 99);
  return [...list].sort((a, b) => Number(a.freight) - Number(b.freight) || days(a.days) - days(b.days))[0] ?? null;
}

type Ensure = { id: string | null; message?: string };

async function ensureQuote(sb: SupabaseClient, city: string, department: string, pkg: Pkg): Promise<Ensure> {
  const { data: set } = await sb.from('shipping_settings').select('hoko_stock_id, hoko_extra, box_weight_g').maybeSingle();
  const [keyR, cityR] = await Promise.all([
    sb.rpc('shipping_address_key', { p_city: city, p_department: department }),
    sb.rpc('hoko_find_city', { p_city: city, p_department: department }),
  ]);
  if (keyR.error) throw keyR.error;
  const addressKey = keyR.data as string;
  let cityId = (cityR.data as number | null) ?? null;

  // Primera vez: aún no se han copiado las ciudades de Hoko.
  if (cityId === null && hokoConfigured()) {
    const { count } = await sb.from('hoko_cities').select('id', { count: 'exact', head: true });
    if (!count) {
      try {
        await syncCities(sb);
        const again = await sb.rpc('hoko_find_city', { p_city: city, p_department: department });
        cityId = (again.data as number | null) ?? null;
      } catch (e) {
        console.error('hoko syncCities', e);
      }
    }
  }

  // Caché: misma dirección, mismo paquete y mismo valor declarado.
  const { data: cached } = await sb.from('shipping_quotes').select('id')
    .eq('address_key', addressKey).eq('weight_g', pkg.weight_g).eq('declared_value', pkg.declared_value)
    .gt('expires_at', new Date(Date.now() + 2 * 60_000).toISOString())
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (cached) return { id: cached.id };

  const box = boxFor(pkg, set?.box_weight_g ?? 300);
  const base = { address_key: addressKey, city_id: cityId, weight_g: pkg.weight_g, declared_value: pkg.declared_value, package: box };

  let hokoDown = !hokoConfigured() || !set?.hoko_stock_id;
  if (!hokoDown && cityId !== null) {
    try {
      const options = await quotation(sb, {
        stockIds: String(set!.hoko_stock_id), cityTo: cityId, payment: PAYMENT_CREDIT, declaredValue: pkg.declared_value, ...box,
      });
      const best = pickCourier(options);
      if (!best) {
        return { id: null, message: 'Por ahora ninguna transportadora llega a esa ciudad. Escríbenos por WhatsApp y buscamos cómo enviártelo.' };
      }
      const freight = Math.round(Number(best.freight));
      const { data, error } = await sb.from('shipping_quotes').insert({
        ...base, source: 'hoko', freight, charge: roundUp(freight + (set?.hoko_extra ?? 0)),
        courier_id: best.courier_id, courier_name: best.courier_name, days: best.days, payment: PAYMENT_CREDIT,
        options, expires_at: new Date(Date.now() + HOKO_TTL_MIN * 60_000).toISOString(),
      }).select('id').single();
      if (error) throw error;
      return { id: data.id };
    } catch (e) {
      // Datos inválidos (ciudad, stock): no se adivina con una tarifa propia.
      if (e instanceof HokoError && e.status === 422) {
        console.error('hoko quotation 422', e.message, e.code);
        return { id: null, message: 'No pudimos cotizar el envío a esa ciudad. Revisa la dirección o escríbenos por WhatsApp.' };
      }
      console.error('hoko quotation', e);
      hokoDown = true;
    }
  }

  if (cityId === null && !hokoDown) {
    return { id: null, message: `No encontramos «${city}» en ${department}. Elige la ciudad de la lista o revisa cómo está escrita.` };
  }

  // Hoko no responde o no está configurado: tarifa propia (por ciudad, departamento o general).
  const { data: rate } = await sb.rpc('shipping_fallback_rate', { p_city: city, p_department: department });
  if (rate === null || rate === undefined) {
    return { id: null, message: 'No pudimos calcular el envío en este momento. Inténtalo de nuevo en unos minutos.' };
  }
  const { data, error } = await sb.from('shipping_quotes').insert({
    ...base, source: 'tarifa', freight: Number(rate), charge: Number(rate),
    expires_at: new Date(Date.now() + FALLBACK_TTL_MIN * 60_000).toISOString(),
  }).select('id').single();
  if (error) throw error;
  return { id: data.id };
}

/**
 * Resumen del pedido con el envío resuelto. Devuelve el payload que debe usarse para
 * crear el pedido (con shipping_quote_id cuando aplica) y el resumen.
 */
export async function withShipping(sb: SupabaseClient, payload: Record<string, unknown>, userId: string | null) {
  // El id de cotización nunca viene del navegador.
  const { shipping_quote_id: _ignored, ...clean } = payload;
  const build = async (p: Record<string, unknown>) => {
    const { data, error } = await sb.rpc('checkout_build', { p, p_user_id: userId, p_create: false });
    if (error) throw error;
    return data as Quote;
  };

  const quote = await build(clean);
  const addr = (clean.address ?? {}) as Record<string, unknown>;
  const city = String(addr.city ?? '').trim();
  const department = String(addr.department ?? '').trim();
  if (!quote.shipping_pending || !quote.package || city.length < 2 || !department) {
    return { payload: clean, quote };
  }

  const r = await ensureQuote(sb, city, department, quote.package);
  if (!r.id) {
    quote.problems = [...(quote.problems ?? []), { type: 'shipping', message: r.message }];
    return { payload: clean, quote };
  }
  const withId = { ...clean, shipping_quote_id: r.id };
  return { payload: withId, quote: await build(withId) };
}
