// Diseño de los correos de Mercado Origen. JavaScript plano a propósito: lo usan
//   · la Edge Function send-emails (Deno)          -> correos de pedidos y embajadores
//   · scripts/auth-emails.mjs (Node)               -> plantillas de Supabase Auth
// Solo tablas y estilos en línea: es lo que respetan Gmail, Outlook y Apple Mail.

export const C = {
  green: '#0B7A3B', deep: '#064823', leaf: '#6BA539', yellow: '#F2B705', orange: '#F39200',
  ink: '#23302A', text: '#4A5850', muted: '#6B7870', line: '#ECE6D6', cream: '#FBF7EC', soft: '#F3F9F4', sun: '#FFF6D8',
};

const FONT = "Nunito,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const DEFAULT_CONTACT = {
  whatsapp: '+57 314 239 8821',
  email: 'mercadoorigen.57@gmail.com',
  instagram: 'https://www.instagram.com/mercadoorigen.col/',
  facebook: 'https://www.facebook.com/profile.php?id=61594564100205',
  tiktok: 'https://www.tiktok.com/@mercadoorigen',
};

/** Escapa texto para HTML. Deja intactas las variables de plantilla de Supabase ({{ .X }}). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');

// ------------------------------------------------------------------ bloques
export const p = (html, style = '') =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${C.text};${style}">${html}</p>`;

export const h2 = (text) =>
  `<h2 style="margin:28px 0 12px;font-size:13px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:${C.green}">${text}</h2>`;

export const small = (html) =>
  `<p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:${C.muted}">${html}</p>`;

/** Botón principal (amarillo) o secundario (contorno verde). */
export function button(href, label, variant = 'primary') {
  const s = variant === 'primary'
    ? `background:${C.yellow};color:${C.ink};border:2px solid ${C.yellow}`
    : `background:#ffffff;color:${C.green};border:2px solid ${C.green}`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto 4px"><tr><td align="center" style="border-radius:999px;${s.split(';')[0]}">
<a href="${esc(href)}" target="_blank" style="display:inline-block;${s};border-radius:999px;padding:15px 34px;font-family:${FONT};font-size:16px;font-weight:900;text-decoration:none">${esc(label)}</a>
</td></tr></table>`;
}

/** Recuadro destacado: tone = 'sun' | 'soft' | 'alert'. */
export function callout(html, tone = 'sun') {
  const bg = { sun: C.sun, soft: C.soft, alert: '#FDECEA' }[tone];
  const bar = { sun: C.yellow, soft: C.green, alert: '#C4402F' }[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr>
<td width="5" style="background:${bar};border-radius:5px 0 0 5px"></td>
<td style="background:${bg};border-radius:0 16px 16px 0;padding:16px 18px;font-size:15px;line-height:1.55;color:${C.ink}">${html}</td></tr></table>`;
}

/** Código grande (cupón u OTP). */
export const code = (text, label = '') =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px auto 18px"><tr><td align="center" style="background:${C.cream};border:2px dashed ${C.yellow};border-radius:18px;padding:16px 30px">
${label ? `<div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};margin-bottom:6px">${label}</div>` : ''}
<div style="font-family:'Courier New',monospace;font-size:28px;font-weight:900;letter-spacing:.18em;color:${C.deep}">${esc(text)}</div></td></tr></table>`;

/** Línea de tiempo del pedido. step = índice del paso actual (0..3). */
export function timeline(step, labels = ['Pagado', 'Preparando', 'En camino', 'Entregado']) {
  const cells = labels.map((l, i) => {
    const done = i <= step;
    const dot = done
      ? `<div style="width:30px;height:30px;line-height:30px;border-radius:50%;background:${C.green};color:#fff;font-weight:900;font-size:15px;margin:0 auto">&#10003;</div>`
      : `<div style="width:26px;height:26px;line-height:26px;border-radius:50%;border:2px solid ${C.line};background:#fff;color:${C.muted};font-weight:900;font-size:13px;margin:0 auto">${i + 1}</div>`;
    return `<td width="25%" align="center" valign="top" style="padding:0 2px">${dot}<div style="margin-top:8px;font-size:12px;font-weight:${done ? 900 : 700};color:${done ? C.green : C.muted}">${l}</div></td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;background:${C.soft};border-radius:20px;padding:18px 8px"><tr>${cells}</tr></table>`;
}

/** Fila de 3 beneficios con icono (carácter) en círculo. items: [[icono, título, texto]]. */
export function features(items) {
  const cells = items.map(([icon, title, text]) =>
    `<td width="${Math.floor(100 / items.length)}%" valign="top" align="center" style="padding:0 6px">
<div style="width:52px;height:52px;line-height:52px;border-radius:50%;background:${C.sun};font-size:24px;margin:0 auto 10px">${icon}</div>
<div style="font-size:14px;font-weight:900;color:${C.ink};margin-bottom:4px">${title}</div>
<div style="font-size:13px;line-height:1.45;color:${C.muted}">${text}</div></td>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr>${cells}</tr></table>`;
}

/** Pasos numerados (qué sigue). */
export function steps(items) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 12px">${items.map((t, i) =>
    `<tr><td width="40" valign="top" style="padding:6px 0"><div style="width:28px;height:28px;line-height:28px;border-radius:50%;background:${C.green};color:#fff;text-align:center;font-weight:900;font-size:14px">${i + 1}</div></td>
<td valign="top" style="padding:9px 0 6px;font-size:15px;line-height:1.5;color:${C.text}">${t}</td></tr>`).join('')}</table>`;
}

/** Tabla de datos clave: [[etiqueta, valor]]. */
export function facts(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;border:1px solid ${C.line};border-radius:16px;border-collapse:separate">${rows.map(([k, v], i) =>
    `<tr><td style="padding:11px 16px;font-size:13px;color:${C.muted};${i ? `border-top:1px solid ${C.line};` : ''}width:38%">${k}</td>
<td style="padding:11px 16px;font-size:14px;font-weight:800;color:${C.ink};${i ? `border-top:1px solid ${C.line};` : ''}">${v}</td></tr>`).join('')}</table>`;
}

// ------------------------------------------------------------------ marco
/**
 * Correo completo.
 * @param {object} o
 * @param {string} o.title       <title> y asunto visible en algunos clientes
 * @param {string} [o.preheader] texto gris que se ve en la bandeja junto al asunto
 * @param {string} [o.kicker]    etiqueta pequeña sobre el título (p. ej. "Pago exitoso")
 * @param {string} o.heading     título grande (HTML permitido)
 * @param {string} [o.intro]     bajada bajo el título (HTML permitido)
 * @param {string} o.body        contenido (HTML)
 * @param {string} o.siteUrl     URL pública de la tienda (o {{ .SiteURL }} en Supabase Auth)
 * @param {'green'|'yellow'|'orange'|'deep'} [o.tone] color de la franja del título
 * @param {object} [o.contact]   redes y WhatsApp (site_settings.contact)
 * @param {string} [o.footerNote] texto legal extra al pie
 */
export function layout(o) {
  const site = String(o.siteUrl || '').replace(/\/$/, '');
  const c = { ...DEFAULT_CONTACT, ...(o.contact || {}) };
  const wa = String(c.whatsapp || '').replace(/\D/g, '');
  const tone = { green: [C.green, '#fff', C.yellow], yellow: [C.yellow, C.ink, C.deep], orange: [C.orange, '#fff', C.sun], deep: [C.deep, '#fff', C.yellow] }[o.tone || 'green'];
  const social = [
    c.instagram && ['Instagram', c.instagram],
    c.facebook && ['Facebook', c.facebook],
    c.tiktok && ['TikTok', c.tiktok],
    wa && ['WhatsApp', `https://wa.me/${wa}`],
  ].filter(Boolean).map(([l, h]) => `<a href="${esc(h)}" target="_blank" style="color:${C.yellow};text-decoration:none;font-weight:800">${l}</a>`).join('<span style="color:#5C8B6E">&nbsp;&nbsp;·&nbsp;&nbsp;</span>');

  return `<!doctype html>
<html lang="es-CO" xmlns="http://www.w3.org/1999/xhtml"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${esc(o.title)}</title>
<style>@media (max-width:600px){.mo-pad{padding-left:22px!important;padding-right:22px!important}.mo-h1{font-size:28px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${C.cream};font-family:${FONT};color:${C.ink};-webkit-text-size-adjust:100%">
${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(o.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:28px 12px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

<tr><td align="center" style="padding:6px 0 20px">
<a href="${esc(site)}" target="_blank" style="text-decoration:none"><img src="${esc(site)}/brand/email-logo.png" width="200" height="55" alt="Mercado Origen" style="display:block;border:0;width:200px;height:auto;font-size:22px;font-weight:900;color:${C.green}"></a>
</td></tr>

<tr><td style="background:#ffffff;border-radius:30px;overflow:hidden;box-shadow:0 20px 44px -22px rgba(6,72,35,.35)">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td class="mo-pad" style="background:${tone[0]};border-radius:30px 30px 0 0;padding:34px 40px 32px">
${o.kicker ? `<div style="display:inline-block;background:rgba(255,255,255,.18);border-radius:999px;padding:6px 14px;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:${tone[2]};margin-bottom:14px">${o.kicker}</div>` : ''}
<h1 class="mo-h1" style="margin:0;font-size:32px;line-height:1.12;font-weight:900;letter-spacing:-.02em;color:${tone[1]}">${o.heading}</h1>
${o.intro ? `<p style="margin:12px 0 0;font-size:17px;line-height:1.55;color:${tone[1]};opacity:.9">${o.intro}</p>` : ''}
</td></tr>
<tr><td style="font-size:0;line-height:0;height:6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="34%" height="6" style="background:${C.yellow};font-size:0">&nbsp;</td><td width="33%" height="6" style="background:${C.orange};font-size:0">&nbsp;</td><td width="33%" height="6" style="background:${C.leaf};font-size:0">&nbsp;</td></tr></table></td></tr>
<tr><td class="mo-pad" style="padding:32px 40px 36px">
${o.body}
</td></tr>
</table></td></tr>

<tr><td style="padding:22px 6px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.deep};border-radius:24px"><tr><td align="center" style="padding:24px 22px">
<div style="font-size:15px;font-weight:900;color:#ffffff;margin-bottom:4px">Auténtico, cercano y de origen</div>
<div style="font-size:13px;line-height:1.5;color:#BFD6C7;margin-bottom:14px">Productos 100% del Huila · Un carrito, un pago, un envío</div>
<div style="font-size:13px">${social}</div>
</td></tr></table>
<p style="margin:16px 0 0;text-align:center;font-size:12px;line-height:1.6;color:${C.muted}">
¿Dudas? Escríbenos${wa ? ` por <a href="https://wa.me/${wa}" style="color:${C.green};font-weight:800">WhatsApp</a>` : ''}${c.email ? ` o a <a href="mailto:${esc(c.email)}" style="color:${C.green};font-weight:800">${esc(c.email)}</a>` : ''}.<br>
${o.footerNote ? `${o.footerNote}<br>` : ''}Mercado Origen · Huila, Colombia · Tratamos tus datos según la Ley 1581 de 2012.<br>
<a href="${esc(site)}/tratamiento-de-datos" style="color:${C.muted}">Tratamiento de datos</a></p>
</td></tr>

</table></td></tr></table>
</body></html>`;
}
