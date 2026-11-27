// Une los secretos de servidor y se los pasa a Supabase sin exponerlos.
//   node scripts/supabase-env.mjs push    -> sube los secretos al proyecto en la nube
//   node scripts/supabase-env.mjs serve   -> corre las Edge Functions en local con ellos
//
// Fuentes:
//   .env (raíz)              -> WOMPI_TEST_*, WOMPI_PROD_* (llaves de Wompi)
//   supabase/functions/.env  -> SITE_URL, ALLOWED_ORIGINS, RESEND_*, EMAIL_CRON_SECRET
// Las variables VITE_* nunca se suben (son del navegador). Los valores nunca se imprimen:
// se escriben en un archivo temporal con permisos 600 que se borra al terminar.
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mode = process.argv[2];
if (!['push', 'serve'].includes(mode)) {
  console.error('Uso: node scripts/supabase-env.mjs push|serve');
  process.exit(1);
}

function parse(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const root = parse('.env');
const fns = parse('supabase/functions/.env');

const SHAPE = {
  WOMPI_TEST_PUBLIC_KEY: 'pub_test_', WOMPI_TEST_PRIVATE_KEY: 'prv_test_',
  WOMPI_TEST_INTEGRITY_SECRET: 'test_integrity_', WOMPI_TEST_EVENTS_SECRET: 'test_events_',
  WOMPI_PROD_PUBLIC_KEY: 'pub_prod_', WOMPI_PROD_PRIVATE_KEY: 'prv_prod_',
  WOMPI_PROD_INTEGRITY_SECRET: 'prod_integrity_', WOMPI_PROD_EVENTS_SECRET: 'prod_events_',
};

const env = {};
// Secretos generales del servidor (sin las llaves de Wompi viejas ni nada VITE_).
for (const [k, v] of Object.entries(fns)) {
  if (v && !k.startsWith('VITE_') && !k.startsWith('WOMPI_')) env[k] = v;
}
// Resend también puede vivir en el .env raíz (allí tiene prioridad).
for (const k of ['RESEND_API_KEY', 'RESEND_FROM', 'RESEND_REPLY_TO']) {
  if (root[k]) env[k] = root[k];
}
// En la nube la tienda vive en el dominio real: nunca se sube una URL de localhost.
if (mode === 'push') {
  const SITE = 'https://mercado-origen.com';
  if (!env.SITE_URL || /localhost|127\.0\.0\.1/.test(env.SITE_URL)) env.SITE_URL = SITE;
  if (!env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS.includes('*') || /localhost/.test(env.ALLOWED_ORIGINS)) {
    env.ALLOWED_ORIGINS = `${SITE},https://www.mercado-origen.com,https://web-five-indol-22.vercel.app`;
  }
  console.log(`SITE_URL=${env.SITE_URL}\nALLOWED_ORIGINS=${env.ALLOWED_ORIGINS}\n`);
}
// Llaves de Wompi: solo desde la raíz, validando el prefijo de cada ambiente.
const report = [];
let bad = false;
for (const [k, prefix] of Object.entries(SHAPE)) {
  const v = (root[k] ?? '').trim();
  if (!v || v === prefix) { report.push(`  ·  ${k}: vacía`); continue; }
  if (!v.startsWith(prefix)) { report.push(`  ✗  ${k}: debe empezar por ${prefix}`); bad = true; continue; }
  env[k] = v;
  report.push(`  ✓  ${k}`);
}
console.log('Llaves de Wompi (.env raíz):\n' + report.join('\n'));
if (bad) {
  console.error('\nCorrige las llaves marcadas con ✗ y vuelve a intentar. No se subió nada.');
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'mo-env-'));
const file = join(dir, '.env');
try {
  writeFileSync(file, Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });
  try { chmodSync(file, 0o600); } catch { /* Windows */ }
  const args = mode === 'push'
    ? ['supabase', 'secrets', 'set', '--env-file', file]
    : ['supabase', 'functions', 'serve', '--env-file', file];
  console.log(`\n${mode === 'push' ? 'Subiendo' : 'Usando'} ${Object.keys(env).length} secretos: ${Object.keys(env).join(', ')}\n`);
  const r = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
