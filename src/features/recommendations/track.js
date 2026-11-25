import { supabase } from '../../lib/supabase.js';

/*
 * Registro de eventos para recomendaciones (vista, deseo, carrito).
 *  · Se agrupan en lotes y se envían cada ~2 s o al salir de la página
 *    (fetch con keepalive, así no se pierden al navegar o cerrar).
 *  · Un mismo evento del mismo producto cuenta una vez cada 30 min.
 *  · El invitado se identifica con un id aleatorio del navegador; al iniciar
 *    sesión sus eventos se unen a la cuenta (merge_session_events).
 *  · Si el navegador pide no ser rastreado (GPC / Do Not Track) no se envía nada.
 * La compra la registra el servidor al aprobarse el pago.
 */

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SID_KEY = 'mo-sid';
const SEEN_KEY = 'mo-seen';
const DEDUPE_MS = 30 * 60_000;

let sid = null;
let token = null;
let queue = [];
let timer = null;
const listeners = new Set();

export function getSessionId() {
  if (sid) return sid;
  try {
    sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
      localStorage.setItem(SID_KEY, sid);
    }
  } catch {
    sid = sid || `tmp-${Math.random().toString(36).slice(2, 14)}`;
  }
  return sid;
}

const optedOut = () => {
  try {
    return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  } catch {
    return false;
  }
};

function seenRecently(key) {
  try {
    const seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || '{}');
    const now = Date.now();
    if (seen[key] && now - seen[key] < DEDUPE_MS) return true;
    seen[key] = now;
    for (const k of Object.keys(seen)) if (now - seen[k] > DEDUPE_MS) delete seen[k];
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch { /* sin almacenamiento: el servidor también deduplica */ }
  return false;
}

// Token vigente para enviar con keepalive (sin esperar a getSession()).
supabase.auth.getSession().then(({ data }) => { token = data.session?.access_token ?? null; });
supabase.auth.onAuthStateChange((_e, s) => { token = s?.access_token ?? null; });

export function flush() {
  clearTimeout(timer);
  timer = null;
  if (!queue.length || !URL_ || !ANON) return;
  const batch = queue.splice(0, 30);
  const strong = batch.some((e) => e.event !== 'view');
  fetch(`${URL_}/rest/v1/rpc/track_product_events`, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token || ANON}` },
    body: JSON.stringify({ p_session_id: getSessionId(), p_events: batch }),
  })
    .then(() => strong && listeners.forEach((fn) => fn()))
    .catch(() => { /* la recomendación no es crítica: no molestamos al cliente */ });
  if (queue.length) timer = setTimeout(flush, 500);
}

/** Registra un evento: 'view' | 'wishlist' | 'cart'. */
export function track(event, productId) {
  if (!productId || optedOut()) return;
  if (seenRecently(`${event}:${productId}`)) return;
  queue.push({ product_id: productId, event });
  if (queue.length >= 10) return flush();
  clearTimeout(timer);
  timer = setTimeout(flush, event === 'view' ? 2000 : 600);
}

/** Avisa cuando se registró una señal fuerte (carrito o deseo). */
export function onStrongSignal(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
