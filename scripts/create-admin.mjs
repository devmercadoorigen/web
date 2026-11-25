#!/usr/bin/env node
/**
 * Crea (o promueve) un usuario administrador usando la API de administración de Supabase Auth.
 * La contraseña solo viaja por variable de entorno: nunca se escribe en archivos.
 *
 *   SUPABASE_URL=http://127.0.0.1:54621 \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   MO_ADMIN_EMAIL=correo@dominio.com MO_ADMIN_PASSWORD='...' \
 *   node scripts/create-admin.mjs
 *
 * En local, la URL y la service_role key salen de `supabase status -o env`.
 * En producción, del panel de Supabase (Project Settings → API). Corre el
 * script desde tu equipo: la service_role key nunca va al frontend.
 */
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MO_ADMIN_EMAIL, MO_ADMIN_PASSWORD } = process.env;
const name = process.env.MO_ADMIN_NAME || 'Administrador Mercado Origen';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MO_ADMIN_EMAIL) {
  console.error('Faltan variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y MO_ADMIN_EMAIL (y MO_ADMIN_PASSWORD si el usuario no existe).');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};
const email = MO_ADMIN_EMAIL.trim().toLowerCase();

async function api(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${res.status} ${path}: ${body?.msg || body?.message || text}`);
  return body;
}

// ¿Ya existe? (la tabla profiles guarda el correo)
const existing = await api(`/rest/v1/profiles?select=id,role&email=eq.${encodeURIComponent(email)}`);
let userId = existing[0]?.id;

if (!userId) {
  if (!MO_ADMIN_PASSWORD) {
    console.error('El usuario no existe: define MO_ADMIN_PASSWORD para crearlo.');
    process.exit(1);
  }
  const user = await api('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: MO_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name, data_policy_accepted: true },
    }),
  });
  userId = user.id;
  console.log(`✓ Usuario creado: ${email}`);
} else {
  console.log(`· El usuario ${email} ya existía (rol actual: ${existing[0].role})`);
}

await api(`/rest/v1/profiles?id=eq.${userId}`, {
  method: 'PATCH',
  headers: { Prefer: 'return=minimal' },
  body: JSON.stringify({ role: 'admin', is_active: true }),
});
console.log('✓ Rol admin asignado');
