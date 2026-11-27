// Correos transaccionales con Resend, a partir de la cola email_outbox.
// Sin RESEND_API_KEY los correos quedan como "omitido" (se registran en el log).
// El diseño vive en email-layout.js (el mismo que usan las plantillas de Supabase Auth).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { siteUrl } from './http.ts';
import { PAYMENT_LABEL } from './wompi.ts';
import { button, callout, code, esc, facts, features, h2, layout, money, p, small, steps, timeline } from './email-layout.js';

const first = (name: unknown) => String(name ?? '').trim().split(/\s+/)[0] || '';
const hi = (name: unknown) => (first(name) ? `, ${esc(first(name))}` : '');

type Mail = { subject: string; html: string } | null;
type Sent = { ok: true } | { skipped: true } | { ok: false; error: string };
type Contact = Record<string, string>;

export async function sendEmail(to: string, subject: string, html: string): Promise<Sent> {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'Mercado Origen <onboarding@resend.dev>';
  const replyTo = Deno.env.get('RESEND_REPLY_TO');
  if (!key) {
    console.log(`[correo no enviado: falta RESEND_API_KEY] ${subject}`);
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
  return { ok: true };
}

/** Marco común con la URL del sitio y las redes de site_settings.contact. */
const frame = (ctx: Ctx, o: Omit<Parameters<typeof layout>[0], 'siteUrl' | 'contact'>) =>
  layout({ ...o, siteUrl: siteUrl(), contact: ctx.contact });

type Ctx = { sb: SupabaseClient; contact: Contact };

// ------------------------------------------------------------------ pedidos
type Order = {
  id: string; order_number: string; email: string; customer_name: string; phone?: string; user_id: string | null; access_token: string;
  subtotal: number; discount: number; shipping: number; total: number; status: string; created_at: string;
  carrier: string | null; tracking_code: string | null; estimated_delivery: string | null; coupon_code: string | null;
  shipping_address: Record<string, string> | null;
  items: { name: string; sku: string; quantity: number; unit_price: number; line_total: number; ambassador_id: string; ambassador?: { brand_name: string } }[];
  payments: { status: string; payment_method_type: string | null; status_message: string | null; updated_at: string }[];
};

async function loadOrder(sb: SupabaseClient, id: string): Promise<Order | null> {
  const { data } = await sb.from('orders')
    .select('id, order_number, email, customer_name, user_id, access_token, subtotal, discount, shipping, total, status, created_at, carrier, tracking_code, estimated_delivery, coupon_code, shipping_address, items:order_items (name, sku, quantity, unit_price, line_total, ambassador_id, ambassador:ambassadors (brand_name)), payments (status, payment_method_type, status_message, updated_at)')
    .eq('id', id).single();
  return data as Order | null;
}
const orderLink = (o: Order) => (o.user_id ? `${siteUrl()}/cuenta/pedidos/${o.order_number}` : `${siteUrl()}/pedido/${o.order_number}?t=${o.access_token}`);
const longDate = (d: string) => new Date(d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' });

function itemRows(items: Order['items'], showMaker = true) {
  return items.map((i) =>
    `<tr><td style="padding:12px 0;border-bottom:1px solid #ECE6D6;font-size:15px;color:#23302A"><b>${esc(i.name)}</b><br>
<span style="font-size:12px;color:#6B7870">${showMaker && i.ambassador?.brand_name ? `${esc(i.ambassador.brand_name)} · ` : ''}${i.quantity} × ${money(i.unit_price)}</span></td>
<td align="right" valign="top" style="padding:12px 0;border-bottom:1px solid #ECE6D6;font-size:15px;font-weight:800;color:#23302A;white-space:nowrap">${money(i.line_total)}</td></tr>`).join('');
}

function itemsTable(o: Order) {
  const row = (k: string, v: string, strong = false) =>
    `<tr><td style="padding:${strong ? '12px' : '5px'} 0 0;font-size:${strong ? 18 : 14}px;${strong ? 'font-weight:900;color:#23302A' : 'color:#6B7870'}">${k}</td><td align="right" style="padding:${strong ? '12px' : '5px'} 0 0;font-size:${strong ? 20 : 14}px;${strong ? 'font-weight:900;color:#0B7A3B' : 'color:#23302A'}">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(o.items ?? [])}
<tr><td colspan="2" style="height:8px"></td></tr>
${row('Subtotal', money(o.subtotal))}
${o.discount ? row(`Descuento${o.coupon_code ? ` (${esc(o.coupon_code)})` : ''}`, `−${money(o.discount)}`) : ''}
${row('Envío', o.shipping ? money(o.shipping) : '<b style="color:#0B7A3B">Gratis</b>')}
${row('Total pagado', money(o.total), true)}</table>`;
}

const address = (o: Order) => {
  const a = o.shipping_address ?? {};
  return [a.recipient, a.address_line, [a.city, a.department].filter(Boolean).join(', '), a.notes].filter(Boolean).map(esc).join('<br>');
};

/** Cliente: pago aprobado. */
function orderConfirmed(ctx: Ctx, o: Order): Mail {
  const pay = o.payments?.find((x) => x.status === 'APPROVED');
  const method = pay?.payment_method_type ? (PAYMENT_LABEL[pay.payment_method_type] ?? pay.payment_method_type) : null;
  return {
    subject: `¡Pago exitoso! Tu pedido ${o.order_number} está confirmado`,
    html: frame(ctx, {
      title: `Pedido ${o.order_number} confirmado`,
      preheader: `Recibimos tu pago de ${money(o.total)}. Ya estamos alistando tu caja del Huila.`,
      kicker: '✓ Pago exitoso',
      heading: `¡Gracias por tu compra${hi(o.customer_name)}!`,
      intro: `Recibimos el pago de tu pedido <b>${esc(o.order_number)}</b>. Los embajadores ya están alistando tus productos.`,
      body: `${timeline(0)}
${facts([
  ['Pedido', `<span style="font-family:'Courier New',monospace">${esc(o.order_number)}</span>`],
  ['Fecha', esc(longDate(pay?.updated_at || o.created_at))],
  ...(method ? [['Medio de pago', esc(method)]] : []),
  ['Total', money(o.total)],
])}
${h2('Tu caja del Huila')}
${itemsTable(o)}
${h2('La enviamos a')}
${p(address(o), 'font-size:15px')}
${callout('📦 <b>Un solo envío.</b> Reunimos los productos de todos los embajadores en el Huila y te los mandamos juntos en una caja. Te avisamos por correo cuando salga.', 'soft')}
${button(orderLink(o), 'Seguir mi pedido')}`,
    }),
  };
}

/** Cliente: cambios de estado del pedido. */
function orderStatus(ctx: Ctx, o: Order, status: string): Mail {
  const n = esc(o.order_number);
  const date = o.estimated_delivery ? longDate(o.estimated_delivery) : null;
  const copy: Record<string, { subject: string; kicker: string; tone?: 'green' | 'yellow' | 'orange' | 'deep'; heading: string; intro: string; body: string; cta: [string, string] }> = {
    preparando: {
      subject: `Estamos alistando tu pedido ${o.order_number}`,
      kicker: 'Preparando', heading: 'Tu pedido se está alistando',
      intro: `Los embajadores están empacando los productos del pedido <b>${n}</b>.`,
      body: `${timeline(1)}${p('Cuando todo llegue a nuestra bodega en el Huila lo despachamos en una sola caja y te mandamos la guía.')}`,
      cta: [orderLink(o), 'Ver mi pedido'],
    },
    enviado: {
      subject: `Tu pedido ${o.order_number} va en camino 🚚`,
      kicker: 'En camino', tone: 'yellow', heading: '¡Tu caja del Huila va en camino!',
      intro: `Despachamos tu pedido <b>${n}</b>${o.carrier ? ` con <b>${esc(o.carrier)}</b>` : ''}.`,
      body: `${timeline(2)}
${facts([
  ...(o.carrier ? [['Transportadora', esc(o.carrier)]] : []),
  ...(o.tracking_code ? [['Número de guía', `<span style="font-family:'Courier New',monospace;font-size:16px">${esc(o.tracking_code)}</span>`]] : []),
  ...(date ? [['Llegada estimada', esc(date)]] : []),
  ['Dirección', address(o)],
])}
${small('Si no vas a estar en casa, deja a alguien encargado de recibirlo.')}`,
      cta: [orderLink(o), 'Ver el seguimiento'],
    },
    entregado: {
      subject: `¡Llegó tu pedido ${o.order_number}! ¿Qué tal todo?`,
      kicker: 'Entregado', heading: `¡Llegó tu pedido${hi(o.customer_name)}!`,
      intro: 'Esperamos que disfrutes cada producto del Huila.',
      body: `${timeline(3)}
${p('¿Nos regalas un minuto? Califica tus productos: tu opinión ayuda a cada embajador a crecer y a otros compradores a elegir.')}
${callout('⭐ Las reseñas son lo que más agradecen nuestros embajadores. ¡Gracias por comprar de origen!')}`,
      cta: [orderLink(o), 'Calificar mis productos'],
    },
    cancelado: {
      subject: `Tu pedido ${o.order_number} fue cancelado`,
      kicker: 'Pedido cancelado', tone: 'deep', heading: 'Cancelamos tu pedido',
      intro: `El pedido <b>${n}</b> quedó cancelado.`,
      body: `${p('Si alcanzaste a pagar, te devolvemos el dinero por el mismo medio de pago. Te avisaremos cuando el reembolso esté hecho.')}
${small('Si no reconoces este cambio, escríbenos por WhatsApp y lo revisamos contigo.')}`,
      cta: [`${siteUrl()}/tienda`, 'Volver a la tienda'],
    },
    reembolsado: {
      subject: `Reembolso del pedido ${o.order_number}`,
      kicker: 'Reembolso hecho', heading: 'Ya hicimos tu reembolso',
      intro: `Devolvimos <b>${money(o.total)}</b> del pedido <b>${n}</b>.`,
      body: `${p('El dinero vuelve por el mismo medio de pago. Según tu banco puede tardar algunos días hábiles en verse reflejado.')}`,
      cta: [orderLink(o), 'Ver el pedido'],
    },
  };
  const c = copy[status];
  if (!c) return null;
  return {
    subject: `${c.subject} · Mercado Origen`,
    html: frame(ctx, { title: c.subject, preheader: c.subject, kicker: c.kicker, tone: c.tone, heading: c.heading, intro: c.intro, body: `${c.body}${button(c.cta[0], c.cta[1])}` }),
  };
}

/** Cliente: el pago fue rechazado o falló. */
function paymentFailed(ctx: Ctx, o: Order, payload: Record<string, string>): Mail {
  if (o.status !== 'pendiente_pago') return null; // ya se pagó con otro intento
  const method = payload.method ? (PAYMENT_LABEL[payload.method] ?? payload.method) : null;
  return {
    subject: `No pudimos procesar el pago de tu pedido ${o.order_number}`,
    html: frame(ctx, {
      title: 'Tu pago no se completó',
      preheader: 'Tu pedido sigue guardado. Puedes intentarlo de nuevo con otro medio de pago.',
      kicker: 'Pago no aprobado', tone: 'orange',
      heading: `Tu pago no se completó${hi(o.customer_name)}`,
      intro: `El banco o la pasarela no aprobaron el pago de <b>${money(o.total)}</b> del pedido <b>${esc(o.order_number)}</b>. No se te cobró nada.`,
      body: `${payload.message ? callout(`<b>Motivo:</b> ${esc(payload.message)}`, 'alert') : ''}
${method ? p(`Medio de pago usado: <b>${esc(method)}</b>.`) : ''}
${h2('Qué puedes hacer')}
${steps([
  'Revisa que tengas saldo o cupo disponible y que los datos estén bien.',
  'Intenta con otro medio de pago: PSE, Nequi, Daviplata o tarjeta.',
  'Si el problema sigue, escríbenos por WhatsApp y te ayudamos a terminar la compra.',
])}
${button(`${siteUrl()}/carrito`, 'Intentar de nuevo')}`,
    }),
  };
}

/** Embajador: vendió productos en un pedido pagado. */
async function orderForAmbassador(ctx: Ctx, o: Order, ambassadorId: string): Promise<Mail> {
  const mine = (o.items ?? []).filter((i) => i.ambassador_id === ambassadorId);
  if (!mine.length) return null;
  const brand = mine[0].ambassador?.brand_name;
  const total = mine.reduce((s, i) => s + i.line_total, 0);
  const units = mine.reduce((s, i) => s + i.quantity, 0);
  return {
    subject: `¡Vendiste! Nuevo pedido ${o.order_number} · Mercado Origen`,
    html: frame(ctx, {
      title: `Nuevo pedido ${o.order_number}`,
      preheader: `${units} ${units === 1 ? 'producto' : 'productos'} por ${money(total)}. Alístalos para el despacho.`,
      kicker: '🎉 Nueva venta', tone: 'yellow',
      heading: `¡Vendiste${brand ? `, ${esc(brand)}` : ''}!`,
      intro: `Un cliente pagó el pedido <b>${esc(o.order_number)}</b> con productos tuyos.`,
      body: `${h2('Lo que debes alistar')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(mine, false)}
<tr><td style="padding:12px 0 0;font-size:16px;font-weight:900">Total de tus productos</td><td align="right" style="padding:12px 0 0;font-size:18px;font-weight:900;color:#0B7A3B">${money(total)}</td></tr></table>
${h2('Qué sigue')}
${steps([
  'Empaca los productos con cuidado y marca el paquete con el número de pedido.',
  'En tu panel, marca el pedido como <b>listo para recoger</b>.',
  'Coordinamos la recogida y lo enviamos junto con los demás productos del cliente.',
])}
${button(`${siteUrl()}/panel/pedidos`, 'Ver el pedido en mi panel')}`,
    }),
  };
}

/** Admin: llegó un pedido pagado. */
function orderForAdmin(ctx: Ctx, o: Order): Mail {
  const makers = [...new Set((o.items ?? []).map((i) => i.ambassador?.brand_name).filter(Boolean))];
  return {
    subject: `Nuevo pedido pagado ${o.order_number} · ${money(o.total)}`,
    html: frame(ctx, {
      title: `Pedido ${o.order_number}`,
      preheader: `${o.customer_name} · ${makers.length} embajadores · ${money(o.total)}`,
      kicker: 'Admin · Pedido pagado', tone: 'deep',
      heading: `Nuevo pedido ${esc(o.order_number)}`,
      intro: `${esc(o.customer_name)} pagó <b>${money(o.total)}</b>.`,
      body: `${facts([
  ['Cliente', `${esc(o.customer_name)}<br><span style="font-weight:600">${esc(o.email)}</span>`],
  ['Embajadores', esc(makers.join(', '))],
  ['Envío a', address(o)],
])}
${itemsTable(o)}
${button(`${siteUrl()}/admin/pedidos/${o.order_number}`, 'Abrir en el admin')}`,
    }),
  };
}

// ------------------------------------------------------------------ cuentas
/** Bienvenida al confirmar el correo (o al entrar con Google). */
async function welcome(ctx: Ctx, userId: string): Promise<Mail> {
  const { data: pr } = await ctx.sb.from('profiles').select('full_name, role').eq('id', userId).maybeSingle();
  if (!pr) return null;
  if (pr.role === 'admin') return null;
  if (pr.role === 'embajador') {
    return {
      subject: '¡Bienvenido a Mercado Origen, embajador!',
      html: frame(ctx, {
        title: 'Bienvenido, embajador',
        preheader: 'Tu panel ya está listo: sube tus productos y empieza a vender a toda Colombia.',
        kicker: 'Embajador del Huila',
        heading: `¡Bienvenido a la familia${hi(pr.full_name)}!`,
        intro: 'Ya eres embajador de Mercado Origen: tu historia y tus productos llegarán a toda Colombia.',
        body: `${h2('Tus primeros pasos')}
${steps([
  'Completa tu perfil: foto o logo, historia y redes sociales.',
  'Sube tus productos con buenas fotos, precio y stock.',
  'Nuestro equipo los revisa y te avisamos por correo cuando estén publicados.',
  'Cuando vendas, te llega un correo con lo que debes alistar.',
])}
${button(`${siteUrl()}/panel`, 'Ir a mi panel')}`,
      }),
    };
  }
  const { data: wc } = await ctx.sb.from('site_settings').select('value').eq('key', 'welcome_coupon').maybeSingle();
  const coupon = (wc?.value as { code?: string } | null)?.code;
  const { data: wh } = await ctx.sb.from('site_settings').select('value').eq('key', 'wheel').maybeSingle();
  const wheelOn = !!(wh?.value as { enabled?: boolean } | null)?.enabled;
  return {
    subject: `¡Bienvenido a Mercado Origen${first(pr.full_name) ? `, ${first(pr.full_name)}` : ''}! 🌿`,
    html: frame(ctx, {
      title: 'Bienvenido a Mercado Origen',
      preheader: 'Café, cacao, miel y artesanías del Huila, directo de quienes los hacen.',
      kicker: 'Bienvenido',
      heading: `¡Qué alegría tenerte aquí${hi(pr.full_name)}!`,
      intro: 'Ya eres parte de Mercado Origen, la vitrina digital de los productores del Huila.',
      body: `${p('Aquí encuentras café de especialidad, cacao, miel, amasijos y artesanías hechos por familias, fincas y talleres de los 37 municipios del Huila. Cada compra llega directo a ellos.')}
${features([
  ['🛒', 'Un solo carrito', 'Compra a varios productores y paga una vez.'],
  ['📦', 'Un solo envío', 'Lo reunimos todo y te llega en una caja.'],
  ['🌱', 'De origen', 'Directo del embajador, sin intermediarios.'],
])}
${coupon ? `${h2('Un regalo de bienvenida')}${p('Usa este cupón en tu primera compra:')}${code(coupon, 'Tu cupón')}` : ''}
${wheelOn ? callout('🎡 <b>Te espera la ruleta de bienvenida.</b> Entra con tu cuenta y gira: envío gratis, descuentos de hasta 20%, 2x1 y más para tu primera compra.') : ''}
${button(`${siteUrl()}/tienda`, wheelOn ? 'Girar la ruleta' : 'Explorar la tienda')}
<p style="margin:10px 0 0;text-align:center;font-size:14px"><a href="${esc(siteUrl())}/kits" style="color:#0B7A3B;font-weight:800">O mira los kits para regalar →</a></p>`,
    }),
  };
}

/** Premio de la ruleta de bienvenida (al girar). */
async function wheelPrize(ctx: Ctx, userId: string): Promise<Mail> {
  const { data: s } = await ctx.sb.from('wheel_spins')
    .select('prize:wheel_prizes (slug, legend, terms, min_order), coupon:coupons (code, expires_at), profile:profiles (full_name)')
    .eq('user_id', userId).maybeSingle();
  const prize = (s as { prize?: { legend: string; terms: string | null; min_order: number } } | null)?.prize;
  const coupon = (s as { coupon?: { code: string; expires_at: string | null } } | null)?.coupon;
  if (!prize || !coupon) return null;
  const name = (s as { profile?: { full_name?: string } }).profile?.full_name;
  const until = coupon.expires_at ? longDate(coupon.expires_at) : null;
  return {
    subject: `🎉 ¡Ganaste ${prize.legend.toLowerCase()} en Mercado Origen!`,
    html: frame(ctx, {
      title: 'Tu premio de la ruleta',
      preheader: `Tu premio se aplica solo en tu primera compra${until ? `. Vence el ${until}` : ''}.`,
      kicker: '🎡 Ruleta de bienvenida', tone: 'yellow',
      heading: `¡Ganaste${hi(name)}!`,
      intro: `Tu premio: <b>${esc(prize.legend)}</b>.`,
      body: `${prize.terms ? p(esc(prize.terms)) : ''}
${code(coupon.code, 'Tu código')}
${callout(`✨ <b>No tienes que hacer nada:</b> al pagar tu primera compra con esta cuenta, el premio se aplica solo${prize.min_order > 0 ? ` (en compras desde ${money(prize.min_order)})` : ''}.${until ? ` Vence el <b>${esc(until)}</b>.` : ''}`, 'soft')}
${button(`${siteUrl()}/tienda`, 'Usar mi premio')}`,
    }),
  };
}

// ------------------------------------------------------------------ embajadores
async function productReviewed(ctx: Ctx, id: string, payload: { status?: string; reason?: string }): Promise<Mail> {
  const { data: pr } = await ctx.sb.from('products').select('name, slug, sku, ambassador:ambassadors (brand_name)').eq('id', id).single();
  if (!pr) return null;
  const brand = (pr as { ambassador?: { brand_name?: string } }).ambassador?.brand_name;
  if (payload.status === 'aprobado') {
    return {
      subject: `¡${pr.name} ya está en la tienda! · Mercado Origen`,
      html: frame(ctx, {
        title: 'Producto aprobado', preheader: `${pr.name} ya está visible para los compradores.`,
        kicker: '✓ Producto aprobado',
        heading: '¡Tu producto ya está publicado!',
        intro: `Hola${brand ? `, ${esc(brand)}` : ''}. Revisamos <b>${esc(pr.name)}</b> y ya está a la venta.`,
        body: `${facts([['Producto', esc(pr.name)], ['SKU', `<span style="font-family:'Courier New',monospace">${esc(pr.sku)}</span>`]])}
${callout('💡 Mantén el stock al día desde tu panel para no perder ventas, y comparte el enlace en tus redes.')}
${button(`${siteUrl()}/producto/${pr.slug}`, 'Ver mi producto en la tienda')}`,
      }),
    };
  }
  return {
    subject: `${pr.name} necesita cambios · Mercado Origen`,
    html: frame(ctx, {
      title: 'Producto con observaciones', preheader: 'Haz los ajustes y vuelve a enviarlo a revisión.',
      kicker: 'Necesita ajustes', tone: 'orange',
      heading: 'Tu producto necesita algunos ajustes',
      intro: `Hola${brand ? `, ${esc(brand)}` : ''}. Revisamos <b>${esc(pr.name)}</b> y todavía no lo podemos publicar.`,
      body: `${payload.reason ? callout(`<b>Qué ajustar:</b> ${esc(payload.reason)}`) : ''}
${p('Haz los cambios desde tu panel y vuelve a enviarlo a revisión. Lo revisamos lo antes posible.')}
${button(`${siteUrl()}/panel/productos`, 'Ir a mi panel')}`,
    }),
  };
}

async function application(ctx: Ctx, kind: string, id: string): Promise<Mail> {
  const { data: a } = await ctx.sb.from('ambassador_applications')
    .select('name, email, phone, brand_name, description, status, created_at, municipality:municipalities (name), category:categories (name)')
    .eq('id', id).maybeSingle();
  if (!a) return null;
  const muni = (a as { municipality?: { name?: string } }).municipality?.name;
  const cat = (a as { category?: { name?: string } }).category?.name;
  if (kind === 'solicitud_recibida') {
    return {
      subject: 'Recibimos tu solicitud para ser embajador · Mercado Origen',
      html: frame(ctx, {
        title: 'Solicitud recibida', preheader: 'Gracias por querer llevar el Huila a toda Colombia. Te contamos qué sigue.',
        kicker: 'Solicitud recibida',
        heading: `¡Gracias${hi(a.name)}!`,
        intro: `Recibimos tu solicitud para que ${a.brand_name ? `<b>${esc(a.brand_name)}</b>` : 'tu marca'} sea parte de Mercado Origen.`,
        body: `${h2('Qué sigue')}
${steps([
  'Nuestro equipo revisa tu solicitud y tus productos.',
  'Te contactamos por WhatsApp o correo para conocerte mejor.',
  'Si todo está listo, te enviamos la invitación para crear tu cuenta de embajador.',
])}
${callout('Mientras tanto, ten a mano buenas fotos de tus productos, tu logo y la historia de tu marca: es lo primero que ven los compradores.', 'soft')}
${button(`${siteUrl()}/embajadores`, 'Conoce a los embajadores')}`,
      }),
    };
  }
  if (kind === 'solicitud_rechazada') {
    return {
      subject: 'Sobre tu solicitud a Mercado Origen',
      html: frame(ctx, {
        title: 'Tu solicitud', preheader: 'Gracias por tu interés en Mercado Origen.',
        kicker: 'Solicitud revisada', tone: 'deep',
        heading: `Gracias por tu interés${hi(a.name)}`,
        intro: `Revisamos tu solicitud${a.brand_name ? ` para <b>${esc(a.brand_name)}</b>` : ''} con atención.`,
        body: `${p('Por ahora no podemos incluirla en la tienda. Esto no es definitivo: cada temporada abrimos espacio a nuevos productos y municipios.')}
${p('Si quieres saber qué podrías ajustar o volver a postularte más adelante, escríbenos por WhatsApp. Con gusto te orientamos.')}
${button(`${siteUrl()}/quiero-ser-embajador`, 'Ver los requisitos')}`,
      }),
    };
  }
  // solicitud_admin
  return {
    subject: `Nueva solicitud de embajador: ${a.brand_name || a.name}`,
    html: frame(ctx, {
      title: 'Nueva solicitud', preheader: `${a.name}${muni ? ` · ${muni}` : ''}${cat ? ` · ${cat}` : ''}`,
      kicker: 'Admin · Nueva solicitud', tone: 'deep',
      heading: esc(a.brand_name || a.name),
      intro: 'Llegó una nueva solicitud desde «Quiero ser embajador».',
      body: `${facts([
  ['Nombre', esc(a.name)],
  ['Correo', esc(a.email)],
  ['WhatsApp', esc(a.phone)],
  ...(muni ? [['Municipio', esc(muni)]] : []),
  ...(cat ? [['Categoría', esc(cat)]] : []),
])}
${a.description ? callout(esc(a.description).replace(/\n/g, '<br>'), 'soft') : ''}
${button(`${siteUrl()}/admin/solicitudes`, 'Revisar solicitud')}`,
    }),
  };
}

// ------------------------------------------------------------------ cola
export type OutboxRow = { id: number; kind: string; to_email: string; ref_id: string; payload: Record<string, string>; attempts: number };

async function loadContact(sb: SupabaseClient): Promise<Contact> {
  const { data } = await sb.from('site_settings').select('value').eq('key', 'contact').maybeSingle();
  return (data?.value as Contact) ?? {};
}

/** Redacta un correo de la cola. null = ya no aplica (p. ej. el pedido no existe). */
export async function render(sb: SupabaseClient, row: OutboxRow, contact?: Contact): Promise<Mail> {
  const ctx: Ctx = { sb, contact: contact ?? await loadContact(sb) };
  switch (row.kind) {
    case 'bienvenida': return welcome(ctx, row.ref_id);
    case 'premio_ruleta': return wheelPrize(ctx, row.ref_id);
    case 'producto_revisado': return productReviewed(ctx, row.ref_id, row.payload);
    case 'solicitud_recibida': case 'solicitud_admin': case 'solicitud_rechazada': return application(ctx, row.kind, row.ref_id);
  }
  const o = await loadOrder(sb, row.ref_id);
  if (!o) return null;
  switch (row.kind) {
    case 'pedido_confirmado': return orderConfirmed(ctx, o);
    case 'pedido_estado': return orderStatus(ctx, o, row.payload.status);
    case 'pago_rechazado': return paymentFailed(ctx, o, row.payload);
    case 'pedido_embajador': return orderForAmbassador(ctx, o, row.payload.ambassador_id);
    case 'pedido_admin': return orderForAdmin(ctx, o);
  }
  return null;
}

/** Procesa un lote de la cola. Devuelve cuántos se enviaron, omitieron o fallaron. */
export async function processOutbox(sb: SupabaseClient, limit = 20) {
  const { data: rows, error } = await sb.rpc('claim_emails', { p_limit: limit });
  if (error) throw error;
  const stats = { enviado: 0, omitido: 0, error: 0 };
  if (!rows?.length) return stats;
  const contact = await loadContact(sb);
  for (const row of rows as OutboxRow[]) {
    let status: keyof typeof stats = 'error';
    let lastError: string | null = null;
    try {
      const mail = await render(sb, row, contact);
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
