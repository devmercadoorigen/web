// POST /functions/v1/payment-status
// Estado REAL de un pago para /pago/resultado (nunca se confía en la URL):
//   { id }                          -> id de transacción que Wompi pone en ?id=
//   { order_number, access_token }  -> el pedido guardado en el navegador
// Consulta a Wompi con la llave privada del ambiente en que se creó el pago
// (prueba o producción) y aplica el estado igual que el webhook
// (así funciona aunque el webhook todavía no haya llegado o no alcance el localhost).
import { admin, cors, fail, json } from '../_shared/http.ts';
import { fetchTransaction, getMode, isMode, MODES, wompiKeys, type WompiMode } from '../_shared/wompi.ts';
import { processOutbox } from '../_shared/email.ts';

const mask = (email: string) => email.replace(/^(.{2}).*(@.*)$/, (_m, a, b) => `${a}•••${b}`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return fail(req, 'Método no permitido', 405);
  let body: { id?: string; order_number?: string; access_token?: string };
  try {
    body = await req.json();
  } catch {
    return fail(req, 'Solicitud inválida.');
  }
  const sb = admin();
  let reference: string | null = null;
  let txId = body.id && /^[\w-]{5,80}$/.test(body.id) ? body.id : null;
  let env: WompiMode | null = null;
  let byToken = false;

  if (!txId && body.order_number && body.access_token) {
    const { data: o } = await sb
      .from('orders')
      .select('id, access_token, payments (reference, wompi_transaction_id, status, environment, created_at)')
      .eq('order_number', body.order_number)
      .maybeSingle();
    if (!o || o.access_token !== body.access_token) return fail(req, 'No encontramos ese pedido.', 404);
    const last = [...(o.payments ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    reference = last?.reference ?? null;
    txId = last?.wompi_transaction_id ?? null;
    env = isMode(last?.environment) ? last.environment : null;
    byToken = true;
  } else if (txId) {
    const { data: p } = await sb.from('payments').select('reference, environment').eq('wompi_transaction_id', txId).maybeSingle();
    if (p) {
      reference = p.reference;
      env = isMode(p.environment) ? p.environment : null;
    }
  }

  // Consulta a Wompi y aplica el estado. Si aún no sabemos el ambiente de la
  // transacción, se prueba primero el modo activo y luego el otro.
  if (txId) {
    const active = await getMode(sb);
    const order = env ? [env] : [active, ...MODES.filter((m) => m !== active)];
    for (const mode of order) {
      if (!wompiKeys(mode).privateKey) continue;
      try {
        const tx = await fetchTransaction(txId, mode);
        if (!tx) continue;
        // La transacción solo cuenta si su pago se creó en ese mismo ambiente.
        const { data: pay } = await sb.from('payments').select('environment').eq('reference', String(tx.reference)).maybeSingle();
        if (pay && pay.environment !== mode) {
          console.warn(`Transacción ${txId} de ${mode} para un pago de ${pay.environment}: ignorada`);
          break;
        }
        reference = String(tx.reference);
        const { data: result, error } = await sb.rpc('apply_wompi_transaction', { p_tx: tx });
        if (error) console.error('apply_wompi_transaction', error);
        else if (result?.just_approved) await processOutbox(sb, 5).catch((e) => console.error(e));
        break;
      } catch (e) {
        console.error('Consulta a Wompi', e);
      }
    }
  }

  if (!reference) return fail(req, 'Aún no tenemos noticias de este pago. Revisa tu correo o vuelve a intentarlo en un momento.', 404);

  const { data: s } = await sb.rpc('payment_summary', { p_reference: reference });
  if (!s) return fail(req, 'No encontramos ese pago.', 404);
  return json(req, {
    order_number: s.order_number,
    order_status: s.order_status,
    payment_status: s.payment_status,
    payment_method_type: s.payment_method_type,
    total: s.total,
    email: mask(s.email),
    has_account: !!s.user_id,
    // El token del invitado solo vuelve a quien ya lo tenía.
    access_token: byToken ? s.access_token : undefined,
  });
});
