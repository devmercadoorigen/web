// POST /functions/v1/shipping-quote
//   { action: 'quote', items, coupon_code, email, address: {city, department} }
//       Resumen del checkout (como la RPC checkout_quote) con el envío cotizado en Hoko.
//   { action: 'sync_cities' }                        (solo admin) copia las ciudades de Hoko
//   { action: 'test', city, department, weight_g? }   (solo admin) cotización de prueba con todas las transportadoras
import { admin, cors, fail, json, sessionUser } from '../_shared/http.ts';
import { hokoConfigured, quotation, syncCities } from '../_shared/hoko.ts';
import { boxFor, withShipping } from '../_shared/shipping.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return fail(req, 'Método no permitido', 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(req, 'Solicitud inválida.');
  }
  if (JSON.stringify(body).length > 20_000) return fail(req, 'Solicitud demasiado grande.', 413);

  const sb = admin();
  const user = await sessionUser(req, sb);
  const action = body.action ?? 'quote';

  if (action === 'quote') {
    const { action: _a, user_id: _u, ...payload } = body;
    try {
      const { quote } = await withShipping(sb, payload, user?.id ?? null);
      return json(req, quote);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const known = ['P0001', 'P0002', '22023'].includes(err.code ?? '');
      if (!known) console.error('shipping-quote', e);
      return fail(req, known ? String(err.message) : 'No pudimos calcular tu pedido. Inténtalo de nuevo.', known ? 422 : 500);
    }
  }

  // ---- Acciones de administración
  if (!user) return fail(req, 'Inicia sesión como administrador.', 401);
  const { data: me } = await sb.from('profiles').select('role, is_active').eq('id', user.id).single();
  if (me?.role !== 'admin' || !me.is_active) return fail(req, 'Solo los administradores pueden hacer esto.', 403);
  if (!hokoConfigured()) return fail(req, 'Faltan los secretos HOKO_EMAIL y HOKO_PASSWORD en Supabase.', 503);

  try {
    if (action === 'sync_cities') {
      const count = await syncCities(sb);
      await sb.from('audit_log').insert({ actor_id: user.id, action: 'hoko_sync_cities', entity: 'hoko_cities', entity_id: 'all', payload: { count } });
      return json(req, { count });
    }

    if (action === 'test') {
      const { data: set } = await sb.from('shipping_settings').select('hoko_stock_id, box_weight_g, hoko_extra').maybeSingle();
      if (!set?.hoko_stock_id) return fail(req, 'Primero guarda el ID del stock de Hoko.');
      const city = String(body.city ?? ''), department = String(body.department ?? '');
      const { data: cityId } = await sb.rpc('hoko_find_city', { p_city: city, p_department: department });
      if (!cityId) return fail(req, `No encontramos «${city}» en ${department || 'Colombia'} entre las ciudades de Hoko. ¿Ya las sincronizaste?`);
      const weight_g = Math.max(1, Number(body.weight_g) || 1000);
      const box = boxFor({ weight_g, volume_cm3: weight_g * 2, declared_value: 0 }, set.box_weight_g ?? 300);
      const declared = Math.max(10000, Number(body.declared_value) || 100000);
      const options = await quotation(sb, { stockIds: String(set.hoko_stock_id), cityTo: cityId, payment: 1, declaredValue: declared, ...box });
      return json(req, { city_id: cityId, box, declared_value: declared, extra: set.hoko_extra ?? 0, options });
    }
  } catch (e) {
    console.error(`shipping-quote ${action}`, e);
    return fail(req, `Hoko respondió con un error: ${(e as Error).message}`, 502);
  }

  return fail(req, 'Acción desconocida.');
});
