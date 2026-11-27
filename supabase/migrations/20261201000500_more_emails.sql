-- =====================================================================
-- Mercado Origen · Más correos transaccionales
--  · bienvenida            al confirmar el correo (o al entrar con Google)
--  · pago_rechazado        el pago fue DECLINED / ERROR y el pedido sigue sin pagar
--  · pedido_embajador      a cada embajador con productos en un pedido pagado
--  · pedido_admin          al correo de contacto (site_settings.contact.email)
--  · pedido_estado         ahora también cuando pasa a "preparando"
--  · solicitud_recibida / solicitud_admin / solicitud_rechazada  (Quiero ser embajador)
-- La Edge Function send-emails los redacta (supabase/functions/_shared/email.ts).
-- =====================================================================

alter table public.email_outbox drop constraint if exists email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'pedido_confirmado', 'pedido_estado', 'producto_revisado',
  'bienvenida', 'pago_rechazado', 'pedido_embajador', 'pedido_admin',
  'solicitud_recibida', 'solicitud_admin', 'solicitud_rechazada',
  'premio_ruleta'));  -- de 20261202000100_welcome_wheel.sql (por si esta se vuelve a ejecutar)

-- Correo del equipo para los avisos internos (editable en /admin/contenido > Correo).
create or replace function public.admin_notify_email()
returns text language sql stable security definer
set search_path = ''
as $$
  select nullif(trim(value ->> 'email'), '') from public.site_settings where key = 'contact'
$$;
revoke execute on function public.admin_notify_email() from public, anon, authenticated;

-- Correo de un embajador: el de su cuenta o, si aún no tiene, el de su ficha privada.
create or replace function public.ambassador_email(p_ambassador_id uuid)
returns text language sql stable security definer
set search_path = ''
as $$
  select coalesce(p.email::text, ap.email::text)
  from public.ambassadors a
  left join public.profiles p on p.id = a.profile_id
  left join public.ambassador_private ap on ap.ambassador_id = a.id
  where a.id = p_ambassador_id
$$;
revoke execute on function public.ambassador_email(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Pedidos: cliente + embajadores + admin
-- ---------------------------------------------------------------------
create or replace function public.enqueue_order_email()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  r record;
  v_admin text;
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'pagado' then
    if new.email is not null then
      insert into public.email_outbox (kind, to_email, ref_id, dedupe_key)
      values ('pedido_confirmado', new.email, new.id, 'pedido_confirmado:' || new.id)
      on conflict (dedupe_key) do nothing;
    end if;

    for r in
      select distinct oi.ambassador_id, public.ambassador_email(oi.ambassador_id) as email
      from public.order_items oi where oi.order_id = new.id
    loop
      continue when r.email is null;
      insert into public.email_outbox (kind, to_email, ref_id, payload, dedupe_key)
      values ('pedido_embajador', r.email, new.id, jsonb_build_object('ambassador_id', r.ambassador_id),
              'pedido_embajador:' || new.id || ':' || r.ambassador_id)
      on conflict (dedupe_key) do nothing;
    end loop;

    v_admin := public.admin_notify_email();
    if v_admin is not null then
      insert into public.email_outbox (kind, to_email, ref_id, dedupe_key)
      values ('pedido_admin', v_admin, new.id, 'pedido_admin:' || new.id)
      on conflict (dedupe_key) do nothing;
    end if;

  elsif new.status in ('preparando', 'enviado', 'entregado', 'cancelado', 'reembolsado') and new.email is not null then
    insert into public.email_outbox (kind, to_email, ref_id, payload, dedupe_key)
    values ('pedido_estado', new.email, new.id, jsonb_build_object('status', new.status),
            'pedido_estado:' || new.id || ':' || new.status)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Pago rechazado (una vez por intento de pago)
-- ---------------------------------------------------------------------
create or replace function public.enqueue_payment_email()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  o record;
begin
  if new.status is not distinct from old.status or new.status not in ('DECLINED', 'ERROR') then return new; end if;
  select id, email, status into o from public.orders where id = new.order_id;
  if o.id is null or o.email is null or o.status <> 'pendiente_pago' then return new; end if;
  insert into public.email_outbox (kind, to_email, ref_id, payload, dedupe_key)
  values ('pago_rechazado', o.email, o.id,
          jsonb_strip_nulls(jsonb_build_object('message', new.status_message, 'method', new.payment_method_type)),
          'pago_rechazado:' || new.id)
  on conflict (dedupe_key) do nothing;
  return new;
end $$;

drop trigger if exists payments_enqueue_email on public.payments;
create trigger payments_enqueue_email after update of status on public.payments
  for each row execute function public.enqueue_payment_email();

-- ---------------------------------------------------------------------
-- Bienvenida: cuando el correo queda confirmado. Nunca bloquea el registro.
-- ---------------------------------------------------------------------
create or replace function public.enqueue_welcome_email()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.email is null or new.email_confirmed_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then return new; end if;
  begin
    insert into public.email_outbox (kind, to_email, ref_id, dedupe_key)
    values ('bienvenida', new.email, new.id, 'bienvenida:' || new.id)
    on conflict (dedupe_key) do nothing;
  exception when others then
    raise warning 'enqueue_welcome_email: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.enqueue_welcome_email();

-- ---------------------------------------------------------------------
-- Solicitudes "Quiero ser embajador"
-- ---------------------------------------------------------------------
create or replace function public.enqueue_application_email()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin text;
begin
  if tg_op = 'INSERT' then
    insert into public.email_outbox (kind, to_email, ref_id, dedupe_key)
    values ('solicitud_recibida', new.email, new.id, 'solicitud_recibida:' || new.id)
    on conflict (dedupe_key) do nothing;
    v_admin := public.admin_notify_email();
    if v_admin is not null then
      insert into public.email_outbox (kind, to_email, ref_id, dedupe_key)
      values ('solicitud_admin', v_admin, new.id, 'solicitud_admin:' || new.id)
      on conflict (dedupe_key) do nothing;
    end if;
  elsif new.status = 'rechazada' and old.status is distinct from 'rechazada' then
    -- La aprobación no manda correo aquí: la invitación de Supabase Auth hace de bienvenida.
    insert into public.email_outbox (kind, to_email, ref_id, dedupe_key)
    values ('solicitud_rechazada', new.email, new.id, 'solicitud_rechazada:' || new.id)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists applications_enqueue_email on public.ambassador_applications;
create trigger applications_enqueue_email
  after insert or update of status on public.ambassador_applications
  for each row execute function public.enqueue_application_email();
