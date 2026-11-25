// POST /functions/v1/send-emails  — envía los correos pendientes de email_outbox.
// Lo llama pg_cron cada minuto (kick_email_worker) con Authorization: Bearer <EMAIL_CRON_SECRET>.
// También acepta la service_role key (para pruebas manuales desde el servidor).
// Con ?preview=<id> devuelve el HTML de un correo sin enviarlo (mismas credenciales).
import { admin } from '../_shared/http.ts';
import { processOutbox, render, type OutboxRow } from '../_shared/email.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') return new Response('Método no permitido', { status: 405 });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const allowed = [Deno.env.get('EMAIL_CRON_SECRET'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')].filter(Boolean);
  if (!token || !allowed.includes(token)) return new Response('No autorizado', { status: 401 });

  const sb = admin();
  const preview = new URL(req.url).searchParams.get('preview');
  if (preview) {
    const { data: row } = await sb.from('email_outbox').select('*').eq('id', preview).single();
    const mail = row ? await render(sb, row as OutboxRow) : null;
    if (!mail) return new Response('Sin correo', { status: 404 });
    return new Response(mail.html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Subject': encodeURIComponent(mail.subject) } });
  }

  try {
    const stats = await processOutbox(sb, 25);
    return new Response(JSON.stringify(stats), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('send-emails', e);
    return new Response('Error', { status: 500 });
  }
});
