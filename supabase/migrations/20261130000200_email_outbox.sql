-- =====================================================================
-- Mercado Origen · Fase 8 · Correos transaccionales
--  · email_outbox: cola de correos. Los triggers encolan; la Edge Function
--    send-emails los redacta y los envía con Resend.
--  · Cada evento se encola una sola vez (dedupe_key), aunque se repita el webhook.
--  · pg_cron despierta al enviador cada minuto si hay pendientes
--    (necesita los secretos mo_functions_url y mo_cron_secret en Vault).
-- Correos: pedido confirmado (pago aprobado), pedido enviado / entregado /
-- cancelado / reembolsado, y producto aprobado / rechazado (al embajador).
-- =====================================================================

create type public.email_status as enum ('pendiente', 'enviado', 'error', 'omitido');

create table public.email_outbox (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('pedido_confirmado', 'pedido_estado', 'producto_revisado')),
  to_email    extensions.citext not null,
  ref_id      uuid not null,                       -- pedido o producto
  payload     jsonb not null default '{}'::jsonb,
  status      public.email_status not null default 'pendiente',
  attempts    smallint not null default 0,
  last_error  text,
  dedupe_key  text not null unique,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index email_outbox_pending_idx on public.email_outbox (created_at) where status = 'pendiente';

alter table public.email_outbox enable row level security;
create policy "admin: ver correos" on public.email_outbox for select to authenticated using (public.is_admin());
grant select on public.email_outbox to authenticated;
grant all on public.email_outbox to service_role;

-- ---------------------------------------------------------------------
-- Encolar
-- ---------------------------------------------------------------------
create or replace function public.enqueue_order_email()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status or new.email is null then return new; end if;
  if new.status = 'pagado' then
    insert into public.email_outbox (kind, to_email, ref_id, dedupe_key)
    values ('pedido_confirmado', new.email, new.id, 'pedido_confirmado:' || new.id)
    on conflict (dedupe_key) do nothing;
  elsif new.status in ('enviado', 'entregado', 'cancelado', 'reembolsado') then
    insert into public.email_outbox (kind, to_email, ref_id, payload, dedupe_key)
    values ('pedido_estado', new.email, new.id, jsonb_build_object('status', new.status),
            'pedido_estado:' || new.id || ':' || new.status)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end $$;

create trigger orders_enqueue_email after update of status on public.orders
  for each row execute function public.enqueue_order_email();

-- Al embajador: correo de su cuenta o, si aún no tiene, el de su ficha privada.
create or replace function public.enqueue_product_email()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if new.status is not distinct from old.status or new.status not in ('aprobado', 'rechazado') then return new; end if;
  select coalesce(p.email::text, ap.email::text) into v_email
  from public.ambassadors a
  left join public.profiles p on p.id = a.profile_id
  left join public.ambassador_private ap on ap.ambassador_id = a.id
  where a.id = new.ambassador_id;
  if v_email is null then return new; end if;
  insert into public.email_outbox (kind, to_email, ref_id, payload, dedupe_key)
  values ('producto_revisado', v_email, new.id,
          jsonb_build_object('status', new.status, 'reason', new.rejection_reason),
          'producto_revisado:' || new.id || ':' || new.status || ':' || extract(epoch from now())::bigint)
  on conflict (dedupe_key) do nothing;
  return new;
end $$;

create trigger products_enqueue_email after update of status on public.products
  for each row execute function public.enqueue_product_email();

-- ---------------------------------------------------------------------
-- El enviador toma un lote (sin pisarse si corren dos a la vez)
-- ---------------------------------------------------------------------
create or replace function public.claim_emails(p_limit integer default 20)
returns setof public.email_outbox language sql security definer
set search_path = ''
as $$
  update public.email_outbox e set attempts = e.attempts + 1
  where e.id in (
    select id from public.email_outbox
    where status = 'pendiente' or (status = 'error' and attempts < 5 and created_at > now() - interval '2 days')
    order by created_at
    limit least(greatest(p_limit, 1), 50)
    for update skip locked)
  returning e.*
$$;
revoke execute on function public.claim_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_emails(integer) to service_role;

-- ---------------------------------------------------------------------
-- Despertador (pg_cron + pg_net). Sin los secretos en Vault no hace nada.
--   select vault.create_secret('https://<proyecto>.supabase.co/functions/v1', 'mo_functions_url');
--   select vault.create_secret('<mismo valor que EMAIL_CRON_SECRET>', 'mo_cron_secret');
-- ---------------------------------------------------------------------
create extension if not exists pg_net;

create or replace function public.kick_email_worker()
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.email_outbox where status = 'pendiente'
                 or (status = 'error' and attempts < 5 and created_at > now() - interval '2 days')) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'mo_functions_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'mo_cron_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/send-emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb);
end $$;
revoke execute on function public.kick_email_worker() from public, anon, authenticated;

select cron.schedule('mo-send-emails', '* * * * *', 'select public.kick_email_worker()');
