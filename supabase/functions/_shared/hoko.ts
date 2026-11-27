// Cliente de la API de Hoko (transportadora). Docs: https://hoko.com.co/api-documentation
// (OpenAPI en https://hoko.com.co/api-docs/openapi.yaml).
//   · POST /login                   -> token Bearer (se guarda en hoko_session y se reutiliza)
//   · GET  /member/get-cities       -> ciudades (id = city_to)
//   · GET  /member/get-states       -> departamentos
//   · POST /member/stock/quotation  -> transportadoras disponibles con su flete
// Todas las peticiones van en multipart/form-data, como pide Hoko.
// Secretos: HOKO_EMAIL, HOKO_PASSWORD y opcional HOKO_API_URL (por defecto Colombia).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const BASE = (Deno.env.get('HOKO_API_URL') ?? 'https://hoko.com.co/api').replace(/\/$/, '');
const TIMEOUT_MS = 12_000;

export class HokoError extends Error {
  constructor(message: string, public status = 0, public code?: string) {
    super(message);
  }
}

export const hokoConfigured = () => !!(Deno.env.get('HOKO_EMAIL') && Deno.env.get('HOKO_PASSWORD'));

let memToken: { token: string; exp: number } | null = null;

/** Vencimiento del JWT (o 12 horas si no se puede leer). */
function tokenExp(token: string): number {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(part)).exp;
    if (typeof exp === 'number') return exp * 1000;
  } catch { /* token opaco */ }
  return Date.now() + 12 * 3600_000;
}

async function login(sb: SupabaseClient): Promise<string> {
  const email = Deno.env.get('HOKO_EMAIL');
  const password = Deno.env.get('HOKO_PASSWORD');
  if (!email || !password) throw new HokoError('Faltan HOKO_EMAIL y HOKO_PASSWORD.');
  const form = new FormData();
  form.set('email', email);
  form.set('password', password);
  const res = await fetch(`${BASE}/login`, { method: 'POST', body: form, headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.token) throw new HokoError(`Hoko login: ${body?.message ?? res.status}`, res.status);
  const exp = tokenExp(body.token);
  memToken = { token: body.token, exp };
  const { error } = await sb.from('hoko_session').upsert({ id: true, token: body.token, expires_at: new Date(exp).toISOString(), updated_at: new Date().toISOString() });
  if (error) console.error('hoko_session', error);
  return body.token;
}

async function token(sb: SupabaseClient, fresh = false): Promise<string> {
  const margin = 5 * 60_000;
  if (!fresh && memToken && memToken.exp - margin > Date.now()) return memToken.token;
  if (!fresh) {
    const { data } = await sb.from('hoko_session').select('token, expires_at').eq('id', true).maybeSingle();
    if (data && new Date(data.expires_at).getTime() - margin > Date.now()) {
      memToken = { token: data.token, exp: new Date(data.expires_at).getTime() };
      return data.token;
    }
  }
  return login(sb);
}

/** Petición autenticada; si el token venció (401) inicia sesión de nuevo una vez. */
export async function hoko<T = unknown>(sb: SupabaseClient, method: 'GET' | 'POST', path: string, fields?: Record<string, string | number | undefined>): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await token(sb, attempt > 0);
    let body: FormData | undefined;
    if (fields) {
      body = new FormData();
      for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) body.set(k, String(v));
    }
    const res = await fetch(`${BASE}${path}`, {
      method, body,
      headers: { Accept: 'application/json', Authorization: `Bearer ${t}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 401 && attempt === 0) continue;
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok || data?.status === 'error') {
      throw new HokoError(`Hoko ${path}: ${data?.message ?? data?.msg ?? res.status}`, res.status, data?.code);
    }
    return data as T;
  }
  throw new HokoError('Hoko: sesión rechazada.', 401);
}

export type HokoQuotation = { courier_id: number; courier_name: string; freight: number; days: string; payment: number };

/** Transportadoras disponibles para el stock hacia la ciudad (payment 1 = crédito: pagado por la tienda). */
export async function quotation(sb: SupabaseClient, q: {
  stockIds: string; cityTo: number; payment: 0 | 1; declaredValue: number;
  weight: number; length: number; width: number; height: number;
}): Promise<HokoQuotation[]> {
  const data = await hoko<{ quotations?: HokoQuotation[] }>(sb, 'POST', '/member/stock/quotation', {
    stock_ids: q.stockIds,
    city_to: q.cityTo,
    payment: q.payment,
    declared_value: q.declaredValue,
    weight: q.weight,
    length: q.length,
    width: q.width,
    height: q.height,
  });
  return (data?.quotations ?? []).filter((x) => Number.isFinite(Number(x.freight)));
}

/** Copia las ciudades de Hoko en hoko_cities. Devuelve cuántas quedaron. */
export async function syncCities(sb: SupabaseClient): Promise<number> {
  const [cities, states] = await Promise.all([
    hoko<{ id: number; name: string; department_id: number }[]>(sb, 'GET', '/member/get-cities'),
    hoko<{ cod: number; name: string }[]>(sb, 'GET', '/member/get-states'),
  ]);
  const dep = new Map((Array.isArray(states) ? states : []).map((s) => [Number(s.cod), s.name]));
  const rows = (Array.isArray(cities) ? cities : [])
    .filter((c) => c?.id && c?.name)
    .map((c) => ({ id: Number(c.id), name: String(c.name).trim(), department_id: c.department_id ?? null, department_name: dep.get(Number(c.department_id)) ?? null, updated_at: new Date().toISOString() }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from('hoko_cities').upsert(rows.slice(i, i + 500));
    if (error) throw error;
  }
  return rows.length;
}
