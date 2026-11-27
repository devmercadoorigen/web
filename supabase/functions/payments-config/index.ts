// POST /functions/v1/payments-config  (solo administradores)
//   { action: 'get' }
//       Modo activo y estado de las llaves de cada ambiente (nunca devuelve secretos).
//   { action: 'set_mode', mode: 'sandbox' | 'production' }
//       Cambia el modo de pagos. No deja activar un ambiente con llaves incompletas.
// Cada cambio queda en audit_log con el admin que lo hizo.
import { admin, cors, fail, json, sessionUser } from '../_shared/http.ts';
import { getMode, isMode, keyProblems, MODES, wompiKeys } from '../_shared/wompi.ts';

const LABEL = { sandbox: 'prueba', production: 'producción' } as const;

function status() {
  return Object.fromEntries(MODES.map((m) => {
    const k = wompiKeys(m);
    const problems = keyProblems(m);
    return [m, {
      ready: problems.length === 0,
      problems,
      // La llave pública no es secreta; se muestra para confirmar que es la correcta.
      public_key: k.publicKey || null,
    }];
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return fail(req, 'Método no permitido', 405);

  const sb = admin();
  const caller = await sessionUser(req, sb);
  if (!caller) return fail(req, 'Inicia sesión como administrador.', 401);
  const { data: me } = await sb.from('profiles').select('role, is_active').eq('id', caller.id).single();
  if (me?.role !== 'admin' || !me.is_active) return fail(req, 'Solo los administradores pueden hacer esto.', 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(req, 'Solicitud inválida.');
  }

  const webhook_url = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1/wompi-webhook`;

  if (body.action === 'get') {
    return json(req, { mode: await getMode(sb), envs: status(), webhook_url });
  }

  if (body.action === 'set_mode') {
    const mode = body.mode;
    if (!isMode(mode)) return fail(req, 'Modo desconocido.');
    const problems = keyProblems(mode);
    if (problems.length) {
      return fail(req, `No se puede activar el modo ${LABEL[mode]}: faltan o están mal ${problems.map((p) => p.name).join(', ')}.`, 409, { problems });
    }
    const before = await getMode(sb);
    const { error } = await sb.from('site_settings').upsert({ key: 'payments', value: { wompi_mode: mode } }, { onConflict: 'key' });
    if (error) {
      console.error('site_settings payments', error);
      return fail(req, 'No pudimos guardar el modo de pagos.', 500);
    }
    await sb.from('audit_log').insert({
      actor_id: caller.id, action: 'payments_mode_changed', entity: 'payments_mode', entity_id: mode, payload: { from: before, to: mode },
    });
    return json(req, { ok: true, mode, envs: status(), webhook_url });
  }

  return fail(req, 'Acción desconocida.');
});
