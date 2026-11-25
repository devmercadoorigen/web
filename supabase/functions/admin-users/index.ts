// POST /functions/v1/admin-users  (solo administradores)
// Acciones que requieren la API de administración de Auth (service_role):
//   { action: 'invite_ambassador', ambassador_id, email, full_name? }
//       Si el correo ya tiene cuenta, la vincula; si no, envía la invitación.
//   { action: 'set_active', user_id, active }
//       Desactiva (bloquea el inicio de sesión) o reactiva una cuenta.
// Cada acción queda en audit_log con el admin que la hizo.
import { admin, cors, fail, json, sessionUser, siteUrl } from '../_shared/http.ts';

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
  const audit = (action: string, entity: string, entity_id: string, payload: Record<string, unknown>) =>
    sb.from('audit_log').insert({ actor_id: caller.id, action, entity, entity_id, payload });

  if (body.action === 'invite_ambassador') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const ambassadorId = String(body.ambassador_id ?? '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(req, 'Escribe un correo válido.');
    const { data: amb } = await sb.from('ambassadors').select('id, brand_name, profile_id').eq('id', ambassadorId).maybeSingle();
    if (!amb) return fail(req, 'Embajador no encontrado.', 404);

    let userId: string | null = null;
    let invited = false;
    const { data: existing } = await sb.from('profiles').select('id, role').eq('email', email).maybeSingle();
    if (existing) {
      if (existing.role === 'admin') return fail(req, 'Ese correo es de un administrador: usa otro para el embajador.', 409);
      userId = existing.id;
    } else {
      const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl()}/recuperar/nueva?next=/panel`,
        data: { full_name: String(body.full_name ?? amb.brand_name), data_policy_accepted: false },
      });
      if (error) {
        console.error('inviteUserByEmail', error);
        return fail(req, 'No pudimos enviar la invitación. Revisa el correo e inténtalo de nuevo.', 502);
      }
      userId = data.user.id;
      invited = true;
    }

    // Un usuario solo puede manejar un embajador.
    const { data: other } = await sb.from('ambassadors').select('brand_name').eq('profile_id', userId).neq('id', ambassadorId).maybeSingle();
    if (other) return fail(req, `Esa cuenta ya maneja a ${other.brand_name}.`, 409);

    await sb.from('profiles').update({ role: 'embajador' }).eq('id', userId);
    const { error: linkErr } = await sb.from('ambassadors').update({ profile_id: userId }).eq('id', ambassadorId);
    if (linkErr) return fail(req, 'No pudimos vincular la cuenta.', 500);
    await sb.from('ambassador_private').upsert({ ambassador_id: ambassadorId, email }, { onConflict: 'ambassador_id' });
    await audit(invited ? 'ambassador_invited' : 'ambassador_linked', 'ambassadors', ambassadorId, { email, user_id: userId });
    return json(req, { ok: true, invited, user_id: userId });
  }

  if (body.action === 'set_active') {
    const userId = String(body.user_id ?? '');
    const active = !!body.active;
    if (userId === caller.id) return fail(req, 'No puedes desactivar tu propia cuenta.', 409);
    const { error } = await sb.auth.admin.updateUserById(userId, { ban_duration: active ? 'none' : '876000h' });
    if (error) return fail(req, 'No pudimos cambiar el acceso de esta cuenta.', 502);
    await sb.from('profiles').update({ is_active: active }).eq('id', userId);
    await audit(active ? 'user_activated' : 'user_deactivated', 'profiles', userId, {});
    return json(req, { ok: true });
  }

  return fail(req, 'Acción desconocida.');
});
