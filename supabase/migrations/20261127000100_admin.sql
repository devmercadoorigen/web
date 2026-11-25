-- =====================================================================
-- Mercado Origen · Fase 5 · Administración
--  · admin_dashboard(): KPIs, series, rankings y alertas (todo agregado en SQL)
--  · admin_receive_items(): consolidación en bodega
--  · admin_approve_application(): solicitud -> embajador
-- =====================================================================

create or replace function public.admin_dashboard(p_stuck_days integer default 3)
returns jsonb language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_now timestamp := now() at time zone 'America/Bogota';
  v_day timestamp := date_trunc('day', now() at time zone 'America/Bogota');
  v_week timestamp := date_trunc('week', now() at time zone 'America/Bogota');
  v_month timestamp := date_trunc('month', now() at time zone 'America/Bogota');
  r jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores.' using errcode = '42501';
  end if;

  with paid as (
    select o.*, o.paid_at at time zone 'America/Bogota' as paid_local
    from public.orders o
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
    where created_at >= now() - interval '30 days' and status <> 'PENDING'
  )
  select jsonb_build_object(
    'sales', jsonb_build_object(
      'today', (select coalesce(sum(total), 0) from paid where paid_local >= v_day),
      'week',  (select coalesce(sum(total), 0) from paid where paid_local >= v_week),
      'month', (select coalesce(sum(total), 0) from paid where paid_local >= v_month),
      'orders_month', (select count(*) from paid where paid_local >= v_month),
      'aov_month', (select coalesce(round(avg(total)), 0) from paid where paid_local >= v_month)),
    'orders_by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from public.orders group by status) s),
    'approval_rate', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where status = 'APPROVED') / count(*)) end from pay30),
    'payments_30d', (select count(*) from pay30),
    'new_customers', jsonb_build_object(
      'week', (select count(*) from public.profiles where role = 'cliente' and created_at at time zone 'America/Bogota' >= v_week),
      'month', (select count(*) from public.profiles where role = 'cliente' and created_at at time zone 'America/Bogota' >= v_month)),
    'pending_products', (select count(*) from public.products where status = 'pendiente'),
    'new_applications', (select count(*) from public.ambassador_applications where status = 'nueva'),
    'needs_review', (select count(*) from public.orders where needs_review),

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
        from public.orders
        where status in ('pagado', 'preparando', 'consolidado', 'enviado')
          and status_changed_at < now() - make_interval(days => case when status = 'enviado' then p_stuck_days * 2 else p_stuck_days end)
        order by status_changed_at limit 10) t),
      'review_orders', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select order_number, review_reason from public.orders where needs_review order by updated_at desc limit 10) t),
      'payment_errors', (select count(*) from public.payments where status in ('ERROR', 'DECLINED') and created_at >= now() - interval '7 days'),
      'idle_ambassadors', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select a.id, a.brand_name from public.ambassadors a
        where a.status = 'activo' and not exists (select 1 from public.products p where p.ambassador_id = a.id and p.status = 'aprobado')
        order by a.brand_name) t),
      'empty_zones', (select coalesce(jsonb_agg(s.name order by s.sort_order), '[]'::jsonb) from public.subregions s
        where not exists (select 1 from public.ambassadors a join public.municipalities m on m.id = a.municipality_id
                          where m.subregion_id = s.id and a.status = 'activo')),
      'missing_commission', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select a.id, a.brand_name, po.items_without_commission as items from public.ambassador_payouts po
        join public.ambassadors a on a.id = po.ambassador_id where po.status = 'pendiente' and po.items_without_commission > 0) t)),

    'activity', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
      select l.id, l.action, l.entity, l.entity_id, l.created_at, coalesce(p.full_name, p.email::text, 'Sistema') as actor
      from public.audit_log l left join public.profiles p on p.id = l.actor_id
      order by l.created_at desc limit 12) t)
  ) into r;
  return r;
end $$;

-- ---------------------------------------------------------------------
-- Consolidación: marcar items recibidos en la bodega del Huila. Cuando todo
-- el pedido llegó, pasa solo a "consolidado".
-- ---------------------------------------------------------------------
create or replace function public.admin_receive_items(p_item_ids uuid[])
returns integer language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
  o uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores.' using errcode = '42501';
  end if;
  update public.order_items set item_status = 'recibido_en_bodega', received_at = now(),
         ready_at = coalesce(ready_at, now())
  where id = any(p_item_ids) and item_status <> 'recibido_en_bodega';
  get diagnostics n = row_count;

  perform set_config('app.status_note', 'Todo llegó a la bodega del Huila', true);
  for o in select distinct order_id from public.order_items where id = any(p_item_ids) loop
    if not exists (select 1 from public.order_items where order_id = o and item_status <> 'recibido_en_bodega') then
      update public.orders set status = 'consolidado' where id = o and status in ('pagado', 'preparando');
    elsif exists (select 1 from public.orders where id = o and status = 'pagado') then
      perform set_config('app.status_note', 'Los embajadores alistan tus productos', true);
      update public.orders set status = 'preparando' where id = o;
      perform set_config('app.status_note', 'Todo llegó a la bodega del Huila', true);
    end if;
  end loop;
  perform set_config('app.status_note', '', true);
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Aprobar una solicitud "Quiero ser embajador": crea el embajador con sus
-- datos privados. La invitación a la cuenta la hace la Edge Function admin-users.
-- ---------------------------------------------------------------------
create or replace function public.admin_approve_application(p_application_id uuid, p_brand_name text, p_municipality_id uuid, p_commission numeric default null)
returns uuid language plpgsql security definer
set search_path = ''
as $$
declare
  v public.ambassador_applications%rowtype;
  v_amb uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores.' using errcode = '42501';
  end if;
  select * into v from public.ambassador_applications where id = p_application_id for update;
  if not found then raise exception 'Solicitud no encontrada.' using errcode = 'P0002'; end if;
  if v.ambassador_id is not null then raise exception 'Esta solicitud ya fue aprobada.' using errcode = 'P0001'; end if;
  if coalesce(trim(p_brand_name), '') = '' or p_municipality_id is null then
    raise exception 'Indica el nombre comercial y el municipio.' using errcode = '22023';
  end if;

  insert into public.ambassadors (brand_name, municipality_id, short_description, status)
  values (trim(p_brand_name), p_municipality_id, left(v.description, 280), 'activo')
  returning id into v_amb;
  insert into public.ambassador_private (ambassador_id, legal_name, email, phone, commission_rate)
  values (v_amb, v.name, v.email, v.phone, p_commission);
  update public.ambassador_applications
     set status = 'aprobada', ambassador_id = v_amb, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_application_id;
  return v_amb;
end $$;

-- Ventas y reseñas de un embajador (ficha del admin).
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

revoke execute on function public.admin_dashboard(integer), public.admin_receive_items(uuid[]),
  public.admin_approve_application(uuid, text, uuid, numeric), public.admin_ambassador_stats(uuid) from public, anon;
grant execute on function public.admin_dashboard(integer), public.admin_receive_items(uuid[]),
  public.admin_approve_application(uuid, text, uuid, numeric), public.admin_ambassador_stats(uuid) to authenticated, service_role;

-- Búsqueda de pedidos y usuarios por texto
create index if not exists orders_number_trgm on public.orders using gin (order_number extensions.gin_trgm_ops);
create index if not exists profiles_email_trgm on public.profiles using gin ((email::text) extensions.gin_trgm_ops);
