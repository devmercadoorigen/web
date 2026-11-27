// POST /functions/v1/create-order
// Crea el pedido con precios, stock, cupón y envío calculados en el SERVIDOR
// (función SQL checkout_create) y devuelve los datos firmados para abrir Wompi.
//   { action: 'create', ...datos del checkout }   -> pedido nuevo
//   { action: 'retry', order_number, access_token } -> nuevo intento de pago del mismo pedido
// Al navegador solo vuelven: llave pública, referencia, monto, firma y vencimiento.
import { admin, cors, fail, json, sessionUser, siteUrl } from '../_shared/http.ts';
import { getMode, integritySignature, keyProblems, wompiKeys } from '../_shared/wompi.ts';

const CHECKOUT_MINUTES = 60; // el checkout de Wompi vence en 1 hora

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return fail(req, 'Método no permitido', 405);

  const sb = admin();
  // Modo activo (prueba / producción) elegido en /admin/pagos.
  const mode = await getMode(sb);
  const problems = keyProblems(mode).filter((p) => p.name.endsWith('PUBLIC_KEY') || p.name.endsWith('INTEGRITY_SECRET'));
  if (problems.length) {
    console.error(`Wompi ${mode} sin configurar:`, problems);
    return fail(req, 'Los pagos no están disponibles en este momento. Escríbenos por WhatsApp.', 503);
  }
  const { publicKey, integrity } = wompiKeys(mode);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(req, 'Solicitud inválida.');
  }
  if (JSON.stringify(body).length > 20_000) return fail(req, 'Solicitud demasiado grande.', 413);

  const user = await sessionUser(req, sb);

  let order: Record<string, unknown>;
  if (body.action === 'retry') {
    const { data, error } = await sb.rpc('checkout_retry_payment', {
      p_order_number: String(body.order_number ?? ''),
      p_access_token: String(body.access_token ?? ''),
    });
    if (error) return fail(req, error.code?.startsWith('P0') ? error.message : 'No pudimos reintentar el pago.', 409);
    order = data;
  } else {
    // El usuario sale del JWT verificado, nunca del cuerpo de la solicitud.
    const { action: _a, user_id: _u, ...payload } = body;
    const { data, error } = await sb.rpc('checkout_create', { p: payload, p_user_id: user?.id ?? null });
    if (error) {
      const known = ['P0001', 'P0002', '22023'].includes(error.code ?? '');
      if (!known) console.error('checkout_create', error);
      let problems: unknown = undefined;
      try { problems = error.details ? JSON.parse(error.details) : undefined; } catch { /* sin detalle */ }
      return fail(req, known ? error.message : 'No pudimos crear tu pedido. Inténtalo de nuevo.', known ? 422 : 500, { problems });
    }
    order = data;
    // Sesión de navegación del comprador: liga la compra a sus recomendaciones
    // (también si compra como invitado). Solo un id aleatorio, sin datos personales.
    const sid = typeof body.session_id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(body.session_id) ? body.session_id : null;
    if (sid) await sb.from('orders').update({ session_id: sid }).eq('id', order.order_id);
  }

  // Este intento de pago queda ligado al ambiente con el que se firmó.
  const { error: envErr } = await sb.from('payments').update({ environment: mode }).eq('reference', String(order.reference));
  if (envErr) console.error('payments.environment', envErr);

  const amount = Number(order.amount_in_cents);
  const expiration = new Date(Date.now() + CHECKOUT_MINUTES * 60_000).toISOString();
  const signature = await integritySignature(String(order.reference), amount, 'COP', expiration, integrity);

  return json(req, {
    order_number: order.order_number,
    access_token: order.access_token,
    total: order.total,
    // En un reintento el navegador puede no tener los datos: se devuelven los del pedido.
    customer: body.action === 'retry'
      ? { email: order.email, full_name: order.customer_name, phone: order.customer_phone, address: order.shipping_address }
      : undefined,
    wompi: {
      mode,
      publicKey,
      currency: 'COP',
      amountInCents: amount,
      reference: order.reference,
      signature: { integrity: signature },
      expirationTime: expiration,
      redirectUrl: `${siteUrl()}/pago/resultado`,
    },
  });
});
