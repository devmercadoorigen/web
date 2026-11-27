// Activa "Continuar con Google" en el proyecto de Supabase en la nube.
//   npm run auth:google
//
// Lee del .env raíz (nunca imprime los valores):
//   ID_GOOGLE_CLIENT       -> ID de cliente OAuth   (…apps.googleusercontent.com)
//   SECRET_GOOGLE_CLIENT   -> Secreto de cliente     (GOCSPX-…)
//   SUPABASE_ACCESS_TOKEN  -> token personal: supabase.com/dashboard/account/tokens
//                             (también sirve como variable de entorno de la terminal)
// y usa la Management API de Supabase para:
//   1. Encender el proveedor Google con ese ID y secreto.
//   2. Añadir los dominios de la tienda a las URLs de redirección permitidas
//      (sin borrar las que ya existan).
//   3. Poner VITE_AUTH_GOOGLE=true en el .env para mostrar el botón.
import { readFileSync, writeFileSync } from 'node:fs';

const ENV_FILE = '.env';
const raw = readFileSync(ENV_FILE, 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}

const clientId = env.ID_GOOGLE_CLIENT ?? '';
const secret = env.SECRET_GOOGLE_CLIENT ?? '';
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN || '';
const ref = (env.VITE_SUPABASE_URL ?? '').match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/)?.[1];

const problems = [];
if (!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId)) problems.push('ID_GOOGLE_CLIENT no parece un ID de cliente de Google (…apps.googleusercontent.com).');
if (!/^GOCSPX-[A-Za-z0-9_-]{28}$/.test(secret)) problems.push('SECRET_GOOGLE_CLIENT no parece un secreto de Google (GOCSPX- seguido de 28 caracteres). Cópialo de nuevo desde Google Cloud.');
else if (/a1b2c3d4e5f6|0123456789|abcdefgh/i.test(secret)) problems.push('SECRET_GOOGLE_CLIENT parece un valor de ejemplo, no un secreto real.');
if (!ref) problems.push('VITE_SUPABASE_URL debe ser la URL del proyecto en la nube (https://<ref>.supabase.co).');
if (!token) problems.push('Falta SUPABASE_ACCESS_TOKEN: créalo en supabase.com/dashboard/account/tokens y agrégalo al .env.');
if (problems.length) {
  console.error('No se configuró nada:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}

const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const current = await fetch(api, { headers });
if (!current.ok) {
  console.error(`Supabase respondió ${current.status} al leer la configuración. Revisa el token y que tenga acceso al proyecto.`);
  process.exit(1);
}
const cfg = await current.json();

const SITE = 'https://mercado-origen.com';
const wanted = [`${SITE}/**`, 'https://www.mercado-origen.com/**', 'https://web-five-indol-22.vercel.app/**', 'http://localhost:5173/**'];
const allow = new Set((cfg.uri_allow_list || '').split(',').map((s) => s.trim()).filter(Boolean));
wanted.forEach((u) => allow.add(u));

const patch = {
  external_google_enabled: true,
  external_google_client_id: clientId,
  external_google_secret: secret,
  uri_allow_list: [...allow].join(','),
};
// Solo se toca site_url si sigue apuntando a localhost.
if (!cfg.site_url || /localhost|127\.0\.0\.1/.test(cfg.site_url)) patch.site_url = SITE;

const res = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify(patch) });
if (!res.ok) {
  let msg = '';
  try { msg = (await res.json()).message ?? ''; } catch { /* sin cuerpo */ }
  console.error(`Supabase respondió ${res.status} al guardar: ${msg}`);
  process.exit(1);
}

if (/^VITE_AUTH_GOOGLE=.*$/m.test(raw)) writeFileSync(ENV_FILE, raw.replace(/^VITE_AUTH_GOOGLE=.*$/m, 'VITE_AUTH_GOOGLE=true'));

console.log(`Google activado en el proyecto ${ref}.
  · URLs de redirección permitidas: ${[...allow].join(', ')}
  · ${patch.site_url ? `Site URL: ${patch.site_url}` : `Site URL sin cambios: ${cfg.site_url}`}
  · VITE_AUTH_GOOGLE=true en .env (ponlo también en Vercel y redespliega)

En Google Cloud Console > APIs y servicios > Credenciales > tu cliente OAuth:
  Orígenes de JavaScript autorizados:  ${SITE}   http://localhost:5173
  URI de redireccionamiento autorizado: https://${ref}.supabase.co/auth/v1/callback`);
