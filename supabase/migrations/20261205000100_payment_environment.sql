-- =====================================================================
-- Mercado Origen · Pedidos de prueba vs. producción
--  · orders.environment y ambassador_payouts.environment guardan con qué
--    modo de Wompi se creó cada pedido (lo hereda del pago).
--  · El admin y el panel del embajador muestran solo lo del modo activo
--    (site_settings 'payments'.wompi_mode): en prueba se ven los pedidos de
--    prueba; en producción, solo los reales.
--  · Las comisiones de pedidos de prueba van a una liquidación de prueba
--    aparte: nunca se suman a lo que se le paga de verdad a un embajador.
-- =====================================================================

-- Modo activo (lo cambia el admin en /admin/pagos).
create or replace function public.payment_mode()
returns text language sql stable security definer
set search_path = ''
as $$
  select case when (select value ->> 'wompi_mode' from public.site_settings where key = 'payments') = 'production'
              then 'production' else 'sandbox' end
$$;
grant execute on function public.payment_mode() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists environment text not null default 'sandbox'
  check (environment in ('sandbox', 'production'));

-- Los pedidos existentes toman el ambiente de su último pago.
update public.orders o set environment = p.environment
from (select distinct on (order_id) order_id, environment from public.payments order by order_id, created_at desc) p
where p.order_id = o.id and o.environment is distinct from p.environment;

-- Los nuevos nacen con el modo activo; el pago lo confirma (trigger de abajo).
alter table public.orders alter column environment set default public.payment_mode();
alter table public.payments alter column environment set default public.payment_mode();

create index if not exists orders_environment_idx on public.orders (environment, created_at desc);

-- El pedido sigue el ambiente de su último intento de pago.
create or replace function public.payments_sync_order_env()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.orders set environment = new.environment
  where id = new.order_id and environment is distinct from new.environment;
  return null;
end $$;
revoke execute on function public.payments_sync_order_env() from public, anon, authenticated;

drop trigger if exists payments_sync_order_env on public.payments;
create trigger payments_sync_order_env after insert or update of environment on public.payments
  for each row execute function public.payments_sync_order_env();

-- ---------------------------------------------------------------------
-- Liquidaciones: una abierta por embajador Y por ambiente
-- ---------------------------------------------------------------------
alter table public.ambassador_payouts
  add column if not exists environment text not null default 'production'
  check (environment in ('sandbox', 'production'));

drop index if exists public.ambassador_payouts_one_open;

-- Liquidaciones abiertas que mezclan ventas de prueba y reales: las de prueba
-- se pasan a una liquidación de prueba nueva.
do $$
declare
  r record;
  v_new uuid;
begin
  for r in
    select distinct po.id, po.ambassador_id
    from public.ambassador_payouts po
    join public.ambassador_ledger l on l.payout_id = po.id
    join public.orders o on o.id = l.order_id
    where po.status = 'pendiente' and o.environment = 'sandbox'
      and exists (select 1 from public.ambassador_ledger l2 join public.orders o2 on o2.id = l2.order_id
                  where l2.payout_id = po.id and o2.environment = 'production')
  loop
    insert into public.ambassador_payouts (ambassador_id, period_start, period_end, environment)
    select r.ambassador_id, period_start, period_end, 'sandbox' from public.ambassador_payouts where id = r.id
    returning id into v_new;
    update public.ambassador_ledger l set payout_id = v_new
    from public.orders o where o.id = l.order_id and l.payout_id = r.id and o.environment = 'sandbox';
    perform public.refresh_payout(r.id);
    perform public.refresh_payout(v_new);
  end loop;
end $$;

-- Liquidaciones que solo tienen ventas de prueba quedan como de prueba.
update public.ambassador_payouts po set environment = 'sandbox'
where exists (select 1 from public.ambassador_ledger l join public.orders o on o.id = l.order_id where l.payout_id = po.id)
  and not exists (select 1 from public.ambassador_ledger l join public.orders o on o.id = l.order_id
                  where l.payout_id = po.id and o.environment = 'production');

create unique index ambassador_payouts_one_open on public.ambassador_payouts (ambassador_id, environment) where status = 'pendiente';
create index if not exists ambassador_payouts_env_idx on public.ambassador_payouts (environment, created_at desc);

-- Engancha las filas nuevas del ledger a la liquidación abierta de su mismo ambiente.
create or replace function public.attach_ledger_to_payouts(p_order_id uuid)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  a uuid;
  v_payout uuid;
  v_env text;
  v_today date := (now() at time zone 'America/Bogota')::date;
begin
  select environment into v_env from public.orders where id = p_order_id;
  v_env := coalesce(v_env, 'production');
  for a in select distinct ambassador_id from public.ambassador_ledger where order_id = p_order_id and payout_id is null loop
    select id into v_payout from public.ambassador_payouts where ambassador_id = a and status = 'pendiente' and environment = v_env;
    if v_payout is null then
      insert into public.ambassador_payouts (ambassador_id, period_start, period_end, environment)
      values (a, v_today, v_today, v_env) returning id into v_payout;
    end if;
    update public.ambassador_ledger set payout_id = v_payout where order_id = p_order_id and ambassador_id = a and payout_id is null;
    perform public.refresh_payout(v_payout);
  end loop;
end $$;
revoke execute on function public.attach_ledger_to_payouts(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Resúmenes: solo el ambiente activo
-- ---------------------------------------------------------------------
create or replace function public.admin_dashboard(p_stuck_days integer default 3)
returns jsonb language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_now timestamp := now() at time zone 'America/Bogota';
  v_day timestamp := date_trunc('day', now() at time zone 'America/Bogota');
  v_week timestamp := date_trunc('week', now() at time zone 'America/Bogota');
  v_month timestamp := date_trunc('month', now() at time zone 'America/Bogota');
  v_env text := public.payment_mode();
  r jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores.' using errcode = '42501';
  end if;

  with env_orders as (
    select o.* from public.orders o where o.environment = v_env
  ),
  paid as (
    select o.*, o.paid_at at time zone 'America/Bogota' as paid_local
    from env_orders o
    where o.paid_at is not null and o.status not in ('cancelado', 'reembolsado')
  ),
  items30 as (
    select oi.*, pr.category_id, a.municipality_id
    from public.order_items oi
    join paid o on o.id = oi.order_id and o.paid_local >= v_day - interval '29 days'
    left join public.products pr on pr.id = oi.product_id
    join public.ambassadors a on a.id = oi.ambassador_id
  ),
  pay30 as (
    select status from public.payments
    where created_at >= now() - interval '30 days' and status <> 'PENDING' and environment = v_env
  )
  select jsonb_build_object(
    'environment', v_env,
    'sales', jsonb_build_object(
      'today', (select coalesce(sum(total), 0) from paid where paid_local >= v_day),
      'week',  (select coalesce(sum(total), 0) from paid where paid_local >= v_week),
      'month', (select coalesce(sum(total), 0) from paid where paid_local >= v_month),
      'orders_month', (select count(*) from paid where paid_local >= v_month),
      'aov_month', (select coalesce(round(avg(total)), 0) from paid where paid_local >= v_month)),
    'orders_by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from env_orders group by status) s),
    'approval_rate', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where status = 'APPROVED') / count(*)) end from pay30),
    'payments_30d', (select count(*) from pay30),
    'new_customers', jsonb_build_object(
      'week', (select count(*) from public.profiles where role = 'cliente' and created_at at time zone 'America/Bogota' >= v_week),
      'month', (select count(*) from public.profiles where role = 'cliente' and created_at at time zone 'America/Bogota' >= v_month)),
    'pending_products', (select count(*) from public.products where status = 'pendiente'),
    'new_applications', (select count(*) from public.ambassador_applications where status = 'nueva'),
    'needs_review', (select count(*) from env_orders where needs_review),

    'series', (
      select jsonb_agg(jsonb_build_object('day', to_char(d, 'YYYY-MM-DD'), 'sales', coalesce(x.s, 0), 'orders', coalesce(x.n, 0)) order by d)
      from generate_series(v_day - interval '29 days', v_day, interval '1 day') d
      left join lateral (select sum(total) s, count(*) n from paid where date_trunc('day', paid_local) = d) x on true),
    'top_products', (
      select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) from (
        select oi.product_id as id, min(oi.name) as name, min(oi.sku) as sku, sum(oi.line_total)::int as revenue, sum(oi.quantity)::int as units
        from items30 oi where oi.product_id is not null group by oi.product_id order by revenue desc limit 5) t),
    'top_ambassadors', (
      select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) from (
        select a.id, a.brand_name as name, sum(oi.line_total)::int as revenue, sum(oi.quantity)::int as units
        from items30 oi join public.ambassadors a on a.id = oi.ambassador_id group by a.id, a.brand_name order by revenue desc limit 5) t),
    'by_category', (
      select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) from (
        select c.name, coalesce(sum(oi.line_total), 0)::int as revenue
        from public.categories c left join items30 oi on oi.category_id = c.id group by c.name) t),
    'by_subregion', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select s.slug, s.name, coalesce(sum(oi.line_total), 0)::int as revenue,
               (select count(*) from public.ambassadors a2 join public.municipalities m2 on m2.id = a2.municipality_id
                where m2.subregion_id = s.id and a2.status = 'activo') as ambassadors
        from public.subregions s
        left join public.municipalities m on m.subregion_id = s.id
        left join items30 oi on oi.municipality_id = m.id
        group by s.id, s.slug, s.name, s.sort_order order by s.sort_order) t),

    'alerts', jsonb_build_object(
      'low_stock', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select p.id, p.name, p.sku, p.stock, a.brand_name as ambassador from public.products p join public.ambassadors a on a.id = p.ambassador_id
        where p.status = 'aprobado' and p.stock <= 3 order by p.stock, p.name limit 10) t),
      'stuck_orders', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select order_number, status, status_changed_at,
               extract(day from now() - status_changed_at)::int as days
        from env_orders
        where status in ('pagado', 'preparando', 'consolidado', 'enviado')
          and status_changed_at < now() - make_interval(days => case when status = 'enviado' then p_stuck_days * 2 else p_stuck_days end)
        order by status_changed_at limit 10) t),
      'review_orders', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select order_number, review_reason from env_orders where needs_review order by updated_at desc limit 10) t),
      'payment_errors', (select count(*) from public.payments where status in ('ERROR', 'DECLINED') and created_at >= now() - interval '7 days' and environment = v_env),
      'idle_ambassadors', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select a.id, a.brand_name from public.ambassadors a
        where a.status = 'activo' and not exists (select 1 from public.products p where p.ambassador_id = a.id and p.status = 'aprobado')
        order by a.brand_name) t),
      'empty_zones', (select coalesce(jsonb_agg(s.name order by s.sort_order), '[]'::jsonb) from public.subregions s
        where not exists (select 1 from public.ambassadors a join public.municipalities m on m.id = a.municipality_id
                          where m.subregion_id = s.id and a.status = 'activo')),
      'missing_commission', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select a.id, a.brand_name, po.items_without_commission as items from public.ambassador_payouts po
        join public.ambassadors a on a.id = po.ambassador_id where po.status = 'pendiente' and po.items_without_commission > 0 and po.environment = v_env) t)),

    'activity', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
      select l.id, l.action, l.entity, l.entity_id, l.created_at, coalesce(p.full_name, p.email::text, 'Sistema') as actor
      from public.audit_log l left join public.profiles p on p.id = l.actor_id
      order by l.created_at desc limit 12) t)
  ) into r;
  return r;
end $$;

create or replace function public.admin_ambassador_stats(p_ambassador_id uuid)
returns jsonb language sql stable security definer
set search_path = ''
as $$
  select case when not public.is_admin() then null else jsonb_build_object(
    'revenue_total', (select coalesce(sum(oi.line_total), 0) from public.order_items oi join public.orders o on o.id = oi.order_id
                      where oi.ambassador_id = p_ambassador_id and o.paid_at is not null and o.status not in ('cancelado', 'reembolsado')),
    'orders', (select count(distinct oi.order_id) from public.order_items oi join public.orders o on o.id = oi.order_id
               where oi.ambassador_id = p_ambassador_id and o.paid_at is not null and o.status not in ('cancelado', 'reembolsado')),
    'products', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from public.products where ambassador_id = p_ambassador_id group by status) s),
    'pending_payout', (select coalesce(sum(net), 0) from public.ambassador_payouts where ambassador_id = p_ambassador_id and status = 'pendiente'),
    'paid_total', (select coalesce(sum(net), 0) from public.ambassador_payouts where ambassador_id = p_ambassador_id and status = 'pagado'))
  end
$$;

create or replace function public.ambassador_dashboard()
returns jsonb language sql stable security definer
set search_path = ''
as $$
  with me as (select public.my_ambassador_id() as id),
  m as (select date_trunc('month', now() at time zone 'America/Bogota') as start),
  sold as (
    select oi.line_total, oi.quantity, o.paid_at at time zone 'America/Bogota' as paid_local
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join me on oi.ambassador_id = me.id
    where o.paid_at is not null and o.status not in ('cancelado', 'reembolsado')
  )
  select case when (select id from me) is null then null else jsonb_build_object(
    'month_sales',      (select coalesce(sum(line_total), 0) from sold, m where paid_local >= m.start),
    'month_units',      (select coalesce(sum(quantity), 0) from sold, m where paid_local >= m.start),
    'prev_month_sales', (select coalesce(sum(line_total), 0) from sold, m where paid_local >= m.start - interval '1 month' and paid_local < m.start),
    'series', (
      select jsonb_agg(jsonb_build_object('month', to_char(g.mm, 'YYYY-MM'), 'sales', coalesce(x.s, 0)) order by g.mm)
      from (select generate_series(m.start - interval '5 months', m.start, interval '1 month') as mm from m) g
      left join lateral (select sum(line_total) as s from sold where date_trunc('month', paid_local) = g.mm) x on true),
    'pending_payout',   (select coalesce(sum(net), 0) from public.ambassador_payouts p, me where p.ambassador_id = me.id and p.status = 'pendiente'),
    'paid_total',       (select coalesce(sum(net), 0) from public.ambassador_payouts p, me where p.ambassador_id = me.id and p.status = 'pagado'),
    'products',         (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
                           select pr.status, count(*) as n from public.products pr, me where pr.ambassador_id = me.id group by pr.status) s),
    'low_stock',        (select count(*) from public.products pr, me where pr.ambassador_id = me.id and pr.status = 'aprobado' and pr.stock <= 3),
    'to_prepare',       (select count(*) from public.order_items oi join public.orders o on o.id = oi.order_id, me
                         where oi.ambassador_id = me.id and oi.item_status = 'pendiente' and o.status in ('pagado', 'preparando')),
    'rating_avg',       a.rating_avg,
    'rating_count',     a.rating_count,
    'sales_count',      a.sales_count,
    'commission_rate',  (select commission_rate from public.ambassador_private ap, me where ap.ambassador_id = me.id)
  ) end
  from public.ambassadors a right join me on a.id = me.id
$$;

create or replace function public.ambassador_order_items(p_status public.order_item_status default null)
returns table (
  order_item_id uuid, order_number text, order_status public.order_status, ordered_at timestamptz,
  paid_at timestamptz, product_id uuid, sku text, name text, unit_price integer, quantity integer,
  line_total integer, item_status public.order_item_status, ready_at timestamptz, in_kit boolean
)
language sql stable security definer
set search_path = ''
as $$
  select oi.id, o.order_number, o.status, o.created_at, o.paid_at, oi.product_id, oi.sku, oi.name,
         oi.unit_price, oi.quantity, oi.line_total, oi.item_status, oi.ready_at, oi.kit_id is not null
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.ambassador_id = public.my_ambassador_id()
    and o.status not in ('pendiente_pago', 'cancelado')
    and (p_status is null or oi.item_status = p_status)
  order by o.paid_at desc nulls last
$$;
