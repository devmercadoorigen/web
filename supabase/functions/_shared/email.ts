// Correos transaccionales con Resend, a partir de la cola email_outbox.
// Sin RESEND_API_KEY los correos quedan como "omitido" (se registran en el log).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { siteUrl } from './http.ts';
import { PAYMENT_LABEL } from './wompi.ts';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const first = (name: unknown) => String(name ?? '').trim().split(/\s+/)[0] || 'hola';

type Sent = { ok: true } | { skipped: true } | { ok: false; error: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<Sent> {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'Mercado Origen <onboarding@resend.dev>';
  if (!key) {
    console.log(`[correo no enviado: falta RESEND_API_KEY] ${subject}`);
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
  return { ok: true };
}

function shell(title: string, body: string) {
  return `<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#FAFAF6;font-family:Nunito,'Segoe UI',Arial,sans-serif;color:#23302A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:28px;overflow:hidden">
<tr><td style="height:6px;background:linear-gradient(90deg,#0B7A3B 0 33%,#FFFFFF 33% 66%,#F2B705 66%)"></td></tr>
<tr><td style="padding:32px 32px 28px">
<p style="margin:0 0 6px;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#0B7A3B">Mercado Origen · Huila</p>
${body}
</td></tr></table>
<p style="max-width:560px;margin:18px auto 0;font-size:12px;color:#6B7870">¿Dudas? Escríbenos por WhatsApp al +57 314 239 8821.</p>
</td></tr></table></body></html>`;
}
const h1 = (t: string) => `<h1 style="margin:0 0 10px;font-size:28px;line-height:1.1;font-weight:900">${t}</h1>`;
const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#4A5850">${t}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:24px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#F2B705;color:#23302A;text-decoration:none;font-weight:900;padding:14px 26px;border-radius:999px">${esc(label)}</a></p>`;

type Order = {
  id: string; order_number: string; email: string; customer_name: string; user_id: string | null; access_token: string;
  subtotal: number; discount: number; shipping: number; total: number; status: string;
  carrier: string | null; tracking_code: string | null; estimated_delivery: string | null;
  shipping_address: Record<string, string> | null;
  items: { name: string; sku: string; quantity: number; line_total: number; ambassador?: { brand_name: string } }[];
  payments: { status: string; payment_method_type: string | null }[];
};

async function loadOrder(sb: SupabaseClient, id: string): Promise<Order | null> {
  const { data } = await sb.from('orders')
    .select('id, order_number, email, customer_name, user_id, access_token, subtotal, discount, shipping, total, status, carrier, tracking_code, estimated_delivery, shipping_address, items:order_items (name, sku, quantity, line_total, ambassador:ambassadors (brand_name)), payments (status, payment_method_type)')
    .eq('id', id).single();
  return data as Order | null;
}
const orderLink = (o: Order) => (o.user_id ? `${siteUrl()}/cuenta/pedidos/${o.order_number}` : `${siteUrl()}/pedido/${o.order_number}?t=${o.access_token}`);

function itemsTable(o: Order) {
  const rows = (o.items ?? []).map((i) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #EEE"><b>${esc(i.name)}</b><br><span style="font-size:12px;color:#6B7870">${esc(i.ambassador?.brand_name)} · ${esc(i.sku)} · ${i.quantity} und.</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #EEE;font-weight:800">${money(i.line_total)}</td></tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
<tr><td style="padding:8px 0;color:#6B7870">Subtotal</td><td align="right">${money(o.subtotal)}</td></tr>
${o.discount ? `<tr><td style="padding:4px 0;color:#6B7870">Descuento</td><td align="right">−${money(o.discount)}</td></tr>` : ''}
<tr><td style="padding:4px 0;color:#6B7870">Envío</td><td align="right">${o.shipping ? money(o.shipping) : 'Gratis'}</td></tr>
<tr><td style="padding:10px 0;font-size:18px;font-weight:900">Total</td><td align="right" style="font-size:18px;font-weight:900">${money(o.total)}</td></tr></table>`;
}

/** Confirmación: pago aprobado, con los productos y el resumen. */
function orderConfirmed(o: Order) {
  const method = o.payments?.find((x) => x.status === 'APPROVED')?.payment_method_type;
  const a = o.shipping_address ?? {};
  return {
    subject: `Pedido ${o.order_number} confirmado · Mercado Origen`,
    html: shell(`Pedido ${o.order_number}`, `${h1(`¡Gracias, ${esc(first(o.customer_name))}!`)}
${p(`Recibimos el pago de tu pedido <b>${esc(o.order_number)}</b>${method ? ` con ${esc(PAYMENT_LABEL[method] ?? method)}` : ''}. Los embajadores ya están alistando tus productos y te los enviamos juntos en una sola caja desde el Huila.`)}
${itemsTable(o)}
<p style="margin:18px 0 0;font-size:14px;color:#4A5850"><b>Envío a:</b> ${esc(a.recipient)} · ${esc(a.address_line)}, ${esc(a.city)}, ${esc(a.department)}</p>
${button(orderLink(o), 'Seguir mi pedido')}`),
  };
}

/** Cambios de estado que le importan al cliente. */
function orderStatus(o: Order, status: string) {
  const n = esc(o.order_number);
  const date = o.estimated_delivery ? new Date(o.estimated_delivery).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }) : null;
  const copy: Record<string, { subject: string; title: string; body: string; cta: [string, string] }> = {
    enviado: {
      subject: `Tu pedido ${o.order_number} va en camino`,
      title: '¡Tu caja del Huila va en camino!',
      body: p(`Despachamos tu pedido <b>${n}</b>${o.carrier ? ` con <b>${esc(o.carrier)}</b>` : ''}.${o.tracking_code ? ` Tu número de guía es <b style="font-family:monospace">${esc(o.tracking_code)}</b>.` : ''}${date ? ` Llegada estimada: <b>${esc(date)}</b>.` : ''}`),
      cta: [orderLink(o), 'Ver el seguimiento'],
    },
    entregado: {
      subject: `Tu pedido ${o.order_number} fue entregado`,
      title: `¡Llegó tu pedido, ${esc(first(o.customer_name))}!`,
      body: p(`Esperamos que disfrutes los productos del Huila. Si tienes un minuto, califícalos: tu opinión ayuda a cada embajador a crecer.`),
      cta: [o.user_id ? `${siteUrl()}/cuenta/pedidos/${o.order_number}` : orderLink(o), 'Calificar mis productos'],
    },
    cancelado: {
      subject: `Tu pedido ${o.order_number} fue cancelado`,
      title: 'Cancelamos tu pedido',
      body: p(`El pedido <b>${n}</b> quedó cancelado. Si alcanzaste a pagar, te devolvemos el dinero por el mismo medio de pago. Si no reconoces este cambio, escríbenos por WhatsApp.`),
      cta: [`${siteUrl()}/tienda`, 'Volver a la tienda'],
    },
    reembolsado: {
      subject: `Reembolso del pedido ${o.order_number}`,
      title: 'Hicimos tu reembolso',
      body: p(`Devolvimos ${money(o.total)} del pedido <b>${n}</b> por el mismo medio de pago. Según tu banco, puede tardar algunos días hábiles en verse reflejado.`),
      cta: [orderLink(o), 'Ver el pedido'],
    },
  };
  const c = copy[status];
  if (!c) return null;
  return { subject: `${c.subject} · Mercado Origen`, html: shell(c.subject, `${h1(c.title)}${c.body}${button(c.cta[0], c.cta[1])}`) };
}

/** Al embajador: su producto fue aprobado o necesita cambios. */
async function productReviewed(sb: SupabaseClient, id: string, payload: { status?: string; reason?: string }) {
  const { data: pr } = await sb.from('products').select('name, slug, sku, ambassador:ambassadors (brand_name)').eq('id', id).single();
  if (!pr) return null;
  const brand = (pr as { ambassador?: { brand_name?: string } }).ambassador?.brand_name;
  if (payload.status === 'aprobado') {
    return {
      subject: `¡${pr.name} ya está en la tienda! · Mercado Origen`,
      html: shell('Producto aprobado', `${h1('¡Tu producto ya está publicado!')}
${p(`Hola${brand ? `, ${esc(brand)}` : ''}. Revisamos <b>${esc(pr.name)}</b> (SKU <span style="font-family:monospace">${esc(pr.sku)}</span>) y ya está visible para los compradores de Mercado Origen.`)}
${p('Mantén el stock al día desde tu panel para no perder ventas.')}
${button(`${siteUrl()}/producto/${pr.slug}`, 'Ver mi producto en la tienda')}`),
    };
  }
  return {
    subject: `${pr.name} necesita cambios · Mercado Origen`,
    html: shell('Producto con observaciones', `${h1('Tu producto necesita algunos ajustes')}
${p(`Hola${brand ? `, ${esc(brand)}` : ''}. Revisamos <b>${esc(pr.name)}</b> y todavía no lo podemos publicar.`)}
${payload.reason ? `<p style="margin:0 0 16px;padding:14px 16px;border-radius:16px;background:#FFF7DD;font-size:15px;line-height:1.5"><b>Qué ajustar:</b> ${esc(payload.reason)}</p>` : ''}
${p('Haz los cambios desde tu panel y vuelve a enviarlo a revisión.')}
${button(`${siteUrl()}/panel/productos`, 'Ir a mi panel')}`),
  };
}

export type OutboxRow = { id: number; kind: string; to_email: string; ref_id: string; payload: Record<string, string>; attempts: number };

/** Redacta un correo de la cola. null = ya no aplica (p. ej. el pedido no existe). */
export async function render(sb: SupabaseClient, row: OutboxRow) {
  if (row.kind === 'producto_revisado') return productReviewed(sb, row.ref_id, row.payload);
  const o = await loadOrder(sb, row.ref_id);
  if (!o) return null;
  if (row.kind === 'pedido_confirmado') return orderConfirmed(o);
  if (row.kind === 'pedido_estado') return orderStatus(o, row.payload.status);
  return null;
}

/** Procesa un lote de la cola. Devuelve cuántos se enviaron, omitieron o fallaron. */
export async function processOutbox(sb: SupabaseClient, limit = 20) {
  const { data: rows, error } = await sb.rpc('claim_emails', { p_limit: limit });
  if (error) throw error;
  const stats = { enviado: 0, omitido: 0, error: 0 };
  for (const row of (rows ?? []) as OutboxRow[]) {
    let status: keyof typeof stats = 'error';
    let lastError: string | null = null;
    try {
      const mail = await render(sb, row);
      if (!mail) status = 'omitido';
      else {
        const r = await sendEmail(row.to_email, mail.subject, mail.html);
        if ('skipped' in r) status = 'omitido';
        else if (r.ok) status = 'enviado';
        else lastError = r.error;
      }
    } catch (e) {
      lastError = String(e).slice(0, 300);
    }
    stats[status]++;
    await sb.from('email_outbox').update({
      status, last_error: lastError, sent_at: status === 'enviado' ? new Date().toISOString() : null,
    }).eq('id', row.id);
  }
  return stats;
}
