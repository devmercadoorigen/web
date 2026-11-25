// Utilidades de las funciones de Vercel (no es una ruta: empieza por "_").
// Solo usan la URL y la llave pública (anon): leen lo mismo que cualquier visitante.

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
export const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export async function rest(path) {
  if (!SUPABASE_URL || !ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export const origin = (request) => {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || url.host;
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  return `${proto}://${host}`;
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const clip = (s, n = 160) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : t;
};
