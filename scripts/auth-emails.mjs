// Correos de Supabase Auth (confirmar correo, recuperar contraseña, invitación…) con el
// mismo diseño que los correos de pedidos, enviados por Resend vía SMTP.
//
//   npm run emails:build   -> genera supabase/templates/*.html (los usa también `supabase start`)
//   npm run emails:push    -> además configura el proyecto en la nube:
//                             1. SMTP propio con Resend (sin él Supabase solo manda 2 correos por hora)
//                             2. Asuntos y plantillas de todos los correos de Auth
//
// Lee (sin imprimir los valores):
//   .env raíz                -> SUPABASE_ACCESS_TOKEN, VITE_SUPABASE_URL
//   supabase/functions/.env  -> RESEND_API_KEY, RESEND_FROM  (las mismas que usan los correos de pedidos)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { button, callout, code, features, layout, p, small, steps } from '../supabase/functions/_shared/email-layout.js';

const SITE = '{{ .SiteURL }}';
const URL = '{{ .ConfirmationURL }}';
const fallback = small(`Si el botón no funciona, copia este enlace en tu navegador:<br><span style="word-break:break-all;color:#0B7A3B">${URL}</span>`);

/** id -> { subject, html }. El id es el nombre del archivo y de la plantilla en Supabase. */
const T = {
  confirmation: {
    subject: 'Confirma tu correo y empieza a comprar de origen 🌿',
    html: layout({
      siteUrl: SITE, title: 'Confirma tu correo',
      preheader: 'Un clic y tu cuenta de Mercado Origen queda lista.',
      kicker: 'Un paso más',
      heading: 'Confirma tu correo',
      intro: 'Estás a un clic de comprar café, cacao, miel y artesanías directo de los productores del Huila.',
      body: `${features([
        ['🛒', 'Un solo carrito', 'Compra a varios productores a la vez.'],
        ['📦', 'Un solo envío', 'Todo llega junto en una caja.'],
        ['🌱', 'De origen', 'Directo de quien lo hace.'],
      ])}
${button(URL, 'Confirmar mi correo')}
${small('Si no creaste una cuenta en Mercado Origen, ignora este correo.')}
${fallback}`,
    }),
  },
  recovery: {
    subject: 'Crea una nueva contraseña · Mercado Origen',
    html: layout({
      siteUrl: SITE, title: 'Crea una nueva contraseña',
      preheader: 'El enlace para cambiar tu contraseña vence en una hora.',
      kicker: '🔒 Recuperar acceso', tone: 'deep',
      heading: 'Crea una nueva contraseña',
      intro: 'Recibimos una solicitud para cambiar la contraseña de tu cuenta.',
      body: `${p('Toca el botón para elegir una contraseña nueva. Por seguridad, el enlace <b>vence en una hora</b> y solo funciona una vez.')}
${button(URL, 'Crear nueva contraseña')}
${callout('¿No fuiste tú? Ignora este correo: tu contraseña sigue igual y nadie puede cambiarla sin este enlace.', 'soft')}
${fallback}`,
    }),
  },
  magic_link: {
    subject: 'Tu enlace para entrar · Mercado Origen',
    html: layout({
      siteUrl: SITE, title: 'Tu enlace para entrar',
      preheader: 'Entra a Mercado Origen sin contraseña. El enlace vence en una hora.',
      kicker: 'Acceso rápido',
      heading: 'Entra con un clic',
      intro: 'Usa este enlace para entrar a tu cuenta sin escribir la contraseña.',
      body: `${button(URL, 'Entrar a Mercado Origen')}
${small('El enlace vence en una hora y solo funciona una vez. Si no lo pediste, ignora este correo.')}
${fallback}`,
    }),
  },
  email_change: {
    subject: 'Confirma tu nuevo correo · Mercado Origen',
    html: layout({
      siteUrl: SITE, title: 'Confirma tu nuevo correo',
      preheader: 'Confirma el cambio de correo de tu cuenta.',
      kicker: 'Cambio de correo', tone: 'deep',
      heading: 'Confirma tu nuevo correo',
      intro: 'Pediste cambiar el correo de tu cuenta de Mercado Origen.',
      body: `${callout('<b>Correo actual:</b> {{ .Email }}<br><b>Correo nuevo:</b> {{ .NewEmail }}', 'soft')}
${button(URL, 'Confirmar el cambio')}
${small('Si no pediste este cambio, ignora este correo y escríbenos por WhatsApp.')}
${fallback}`,
    }),
  },
  invite: {
    subject: '¡Ya eres embajador de Mercado Origen! Activa tu cuenta',
    html: layout({
      siteUrl: SITE, title: 'Activa tu cuenta de embajador',
      preheader: 'Crea tu contraseña y entra a tu panel para subir tus productos.',
      kicker: '🎉 Bienvenido, embajador', tone: 'yellow',
      heading: '¡Ya eres embajador de Mercado Origen!',
      intro: 'Te abrimos una cuenta para que lleves tus productos del Huila a toda Colombia.',
      body: `${steps([
        'Activa tu cuenta y crea tu contraseña con el botón de abajo.',
        'Completa tu perfil: logo, historia y redes sociales.',
        'Sube tus productos; los revisamos y te avisamos cuando estén publicados.',
      ])}
${button(URL, 'Activar mi cuenta')}
${small('La invitación vence en 24 horas. Si se vence, pídenos una nueva por WhatsApp.')}
${fallback}`,
    }),
  },
  reauthentication: {
    subject: 'Tu código de verificación · Mercado Origen',
    html: layout({
      siteUrl: SITE, title: 'Código de verificación',
      preheader: 'Usa este código para confirmar que eres tú.',
      kicker: '🔒 Verificación', tone: 'deep',
      heading: 'Confirma que eres tú',
      intro: 'Escribe este código en Mercado Origen para continuar.',
      body: `${code('{{ .Token }}', 'Código')}
${small('El código vence en una hora. Si no lo pediste, ignora este correo.')}`,
    }),
  },
  password_changed_notification: {
    subject: 'Tu contraseña cambió · Mercado Origen',
    html: layout({
      siteUrl: SITE, title: 'Tu contraseña cambió',
      preheader: 'Te avisamos por seguridad.',
      kicker: '🔒 Aviso de seguridad', tone: 'deep',
      heading: 'Tu contraseña cambió',
      intro: 'La contraseña de tu cuenta <b>{{ .Email }}</b> se acaba de cambiar.',
      body: `${p('Si fuiste tú, no tienes que hacer nada.')}
${callout('<b>¿No fuiste tú?</b> Recupera tu cuenta ahora mismo con «¿Olvidaste tu contraseña?» y escríbenos por WhatsApp.', 'alert')}
${button(`${SITE}/recuperar`, 'Recuperar mi cuenta', 'secondary')}`,
    }),
  },
};

// ------------------------------------------------------------------ build
for (const [id, t] of Object.entries(T)) writeFileSync(`supabase/templates/${id}.html`, t.html);
console.log(`Plantillas generadas en supabase/templates/: ${Object.keys(T).join(', ')}`);
if (process.argv[2] !== 'push') process.exit(0);

// ------------------------------------------------------------------ push
const parse = (file) => {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
};
const env = { ...parse('supabase/functions/.env'), ...parse('.env') };
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN || '';
const ref = (env.VITE_SUPABASE_URL ?? '').match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/)?.[1];
const key = env.RESEND_API_KEY ?? '';
const fromMatch = (env.RESEND_FROM ?? '').match(/^\s*(.*?)\s*<\s*([^>\s]+@[^>\s]+)\s*>\s*$/) || [null, 'Mercado Origen', (env.RESEND_FROM ?? '').trim()];
const [, senderName, senderEmail] = fromMatch;

const problems = [];
if (!ref) problems.push('VITE_SUPABASE_URL (.env) debe ser la URL del proyecto en la nube.');
if (!token) problems.push('Falta SUPABASE_ACCESS_TOKEN en .env (supabase.com/dashboard/account/tokens).');
if (!/^re_[A-Za-z0-9_]{10,}$/.test(key)) problems.push('RESEND_API_KEY (supabase/functions/.env) debe empezar por re_. Créala en resend.com/api-keys.');
if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(senderEmail || '') || /tu-dominio|example/.test(senderEmail)) problems.push('RESEND_FROM debe ser algo como: Mercado Origen <hola@mercado-origen.com> (con un dominio verificado en Resend).');
if (problems.length) {
  console.error('\nNo se configuró nada en Supabase:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}

const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function patch(body, label) {
  const res = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify(body) });
  if (res.ok) return true;
  let msg = '';
  try { msg = (await res.json()).message ?? ''; } catch { /* sin cuerpo */ }
  console.error(`  ✗ ${label}: Supabase respondió ${res.status} ${msg}`);
  return false;
}

const main = {
  smtp_host: 'smtp.resend.com',
  smtp_port: '465',
  smtp_user: 'resend',
  smtp_pass: key,
  smtp_admin_email: senderEmail,
  smtp_sender_name: senderName || 'Mercado Origen',
  rate_limit_email_sent: 100,
};
for (const id of ['confirmation', 'recovery', 'magic_link', 'email_change', 'invite', 'reauthentication']) {
  main[`mailer_subjects_${id}`] = T[id].subject;
  main[`mailer_templates_${id}_content`] = T[id].html;
}
console.log(`\nConfigurando el proyecto ${ref}…`);
if (!(await patch(main, 'SMTP y plantillas'))) process.exit(1);
console.log(`  ✓ SMTP de Resend (remitente: ${senderName} <${senderEmail}>, hasta 100 correos/hora)`);
console.log('  ✓ Plantillas: confirmar correo, recuperar contraseña, enlace mágico, cambio de correo, invitación, código');

// Aviso de "tu contraseña cambió": opcional (planes o versiones que no lo soportan responden error).
const ok = await patch({
  mailer_notifications_password_changed_enabled: true,
  mailer_subjects_password_changed_notification: T.password_changed_notification.subject,
  mailer_templates_password_changed_notification_content: T.password_changed_notification.html,
}, 'Aviso de contraseña cambiada');
if (ok) console.log('  ✓ Aviso de seguridad cuando cambia la contraseña');
console.log('\nListo. Prueba con «¿Olvidaste tu contraseña?» en la tienda.');
