// POST /functions/v1/wompi-webhook  (URL de eventos configurada en comercios.wompi.co)
// 1. Verifica el checksum con el secreto de eventos del ambiente del evento
//    (WOMPI_TEST_EVENTS_SECRET o WOMPI_PROD_EVENTS_SECRET) y el header X-Event-Checksum.
// 2. Ignora eventos cuyo ambiente no coincide con el del pago y eventos repetidos (idempotente).
// 3. Aplica el estado: si queda APPROVED, la base descuenta stock, suma ventas
//    y liquida a los embajadores, y encola el correo de confirmación (se envía aquí mismo).
// Wompi espera HTTP 200; si no lo recibe, reintenta a los 30 min, 3 h y 24 h.
import { admin } from '../_shared/http.ts';
import { getMode, modeFromEvent, verifyEvent, wompiKeys } from '../_shared/wompi.ts';
import { processOutbox } from '../_shared/email.ts';

const ok = (msg: string) => new Response(JSON.stringify({ ok: true, msg }), { status: 200, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  let evt;
  try {
    evt = await req.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }

  // Cada ambiente (test / prod) se verifica con su propio secreto de eventos.
  const mode = modeFromEvent(evt?.environment);
  if (!mode) return ok(`ambiente ${evt?.environment} ignorado`);
  const secret = wompiKeys(mode).events;
  const sb = admin();
  if (!secret) {
    const active = await getMode(sb);
    if (mode !== active) return ok(`sin secreto de eventos para ${mode}: ignorado`);
    console.error(`Falta el secreto de eventos de Wompi (${mode})`);
    return new Response('No configurado', { status: 503 }); // Wompi reintentará
  }

  if (!(await verifyEvent(evt, secret, req.headers.get('X-Event-Checksum')))) {
    console.warn('Evento con checksum inválido ignorado');
    return new Response('Checksum inválido', { status: 401 });
  }
  if (evt.event !== 'transaction.updated') return ok(`evento ${evt.event} ignorado`);

  const tx = evt.data?.transaction;
  if (!tx?.id || !tx?.reference) return ok('sin transacción');

  // Un evento de prueba nunca toca un pago de producción (ni al revés).
  const { data: pay } = await sb.from('payments').select('environment').eq('reference', String(tx.reference)).maybeSingle();
  if (pay && pay.environment !== mode) {
    console.warn(`Evento ${mode} para un pago de ${pay.environment}: ignorado`);
    return ok('ambiente distinto al del pago');
  }

  // Idempotencia: el mismo evento (transacción + estado + timestamp) se procesa una sola vez.
  const { data: fresh, error: dupErr } = await sb
    .from('payment_events')
    .upsert({ event_key: `${tx.id}:${tx.status}:${evt.timestamp}`, payload: evt }, { onConflict: 'event_key', ignoreDuplicates: true })
    .select('id');
  if (dupErr) {
    console.error('payment_events', dupErr);
    return new Response('Error', { status: 500 });
  }
  if (!fresh?.length) return ok('evento repetido');

  const { data: result, error } = await sb.rpc('apply_wompi_transaction', { p_tx: tx });
  if (error) {
    console.error('apply_wompi_transaction', error);
    return new Response('Error', { status: 500 }); // Wompi reintentará
  }
  if (result?.just_approved) {
    try {
      await processOutbox(sb, 5);   // el trigger ya encoló la confirmación
    } catch (e) {
      console.error('Correo de confirmación', e);
    }
  }
  return ok(result?.result ?? 'procesado');
});
