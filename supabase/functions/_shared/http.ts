// Utilidades HTTP compartidas por las Edge Functions.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((s) => s.trim());

export function cors(req: Request): HeadersInit {
  const origin = req.headers.get('Origin') ?? '';
  const allow = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8' } });

/** Error con mensaje en español para el cliente (nunca detalles internos). */
export const fail = (req: Request, message: string, status = 400, extra: Record<string, unknown> = {}) =>
  json(req, { error: message, ...extra }, status);

/** Cliente con service_role: solo vive en el servidor. */
export const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Usuario de la sesión si el navegador mandó su JWT; null para invitados. */
export async function sessionUser(req: Request, sb: SupabaseClient): Promise<{ id: string; email?: string } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || token === Deno.env.get('SUPABASE_ANON_KEY')) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

export const siteUrl = () => (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
