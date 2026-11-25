-- =====================================================================
-- Mercado Origen · Fase 4 · Panel del embajador
--  · ambassador_dashboard(): métricas agregadas en SQL (nunca filas al cliente)
--  · Pausar/reactivar productos sin perder la aprobación si no se tocó el contenido
--  · Al marcar un item "listo", el pedido pasa a "preparando"
--  · Bucket PRIVADO para comprobantes de pago a embajadores
-- =====================================================================

-- ---------------------------------------------------------------------
-- Reglas de edición de productos (reemplaza la versión de la Fase 1):
-- además de lo anterior, si el embajador cambia el contenido de un producto
-- PAUSADO, pierde la aprobación (approved_at = null) y al reactivarlo
-- vuelve a revisión.
-- ---------------------------------------------------------------------
create or replace function public.products_before_update()
returns trigger language plpgsql
set search_path = ''
as $$
declare
  v_priv boolean := public.is_privileged();
  v_content_changed boolean :=
       new.name is distinct from old.name
    or new.price is distinct from old.price
    or new.compare_at_price is distinct from old.compare_at_price
    or new.short_description is distinct from old.short_description
    or new.description is distinct from old.description
    or new.category_id is distinct from old.category_id;
begin
  if new.sku is distinct from old.sku then
    if not v_priv then
      raise exception 'El SKU no se puede modificar.' using errcode = '42501';
    end if;
    perform public.write_audit('sku_changed', 'products', new.id::text, jsonb_build_object('de', old.sku, 'a', new.sku));
  end if;

  if not v_priv then
    if new.ambassador_id is distinct from old.ambassador_id
       or new.is_featured is distinct from old.is_featured
       or new.badges is distinct from old.badges
       or new.views_count is distinct from old.views_count
       or new.sales_count is distinct from old.sales_count
       or new.rating_avg is distinct from old.rating_avg
       or new.rating_count is distinct from old.rating_count
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by then
      raise exception 'No tienes permiso para cambiar estos campos del producto.' using errcode = '42501';
    end if;

    if new.status is distinct from old.status and new.status not in ('borrador', 'pendiente', 'inactivo') then
      raise exception 'Solo Mercado Origen puede aprobar o rechazar productos.' using errcode = '42501';
    end if;

    if new.status = 'pendiente' and old.status = 'rechazado' then
      new.rejection_reason := null;
    else
      new.rejection_reason := old.rejection_reason;
    end if;

    if old.status = 'aprobado' and new.status = 'aprobado' and v_content_changed then
      new.status := 'pendiente';
    end if;
    if old.status = 'inactivo' and v_content_changed then
      new.approved_at := null;   -- al reactivarlo pasará por revisión
    end if;
  end if;

  if new.status = 'aprobado' and old.status is distinct from 'aprobado' and (v_priv and not coalesce(current_setting('app.resume', true), '') = 'on') then
    new.approved_at := now();
    new.approved_by := auth.uid();
    new.rejection_reason := null;
  end if;

  if new.status = 'rechazado' and old.status is distinct from 'rechazado'
     and coalesce(trim(new.rejection_reason), '') = '' then
    raise exception 'Para rechazar un producto escribe el motivo.' using errcode = '23514';
  end if;

  return new;
end $$;

-- Fotos o precios de variante cambiados por el embajador: aprobado -> pendiente;
-- pausado -> pierde la aprobación.
create or replace function public.product_children_to_pending()
returns trigger language plpgsql
set search_path = ''
as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
  v_prev text := coalesce(current_setting('app.trusted', true), '');
begin
  if public.is_privileged() then return coalesce(new, old); end if;
  -- PL/pgSQL no corta las condiciones "and": cada tabla se evalúa por separado
  -- para no leer columnas que el registro no tiene.
  if tg_op = 'UPDATE' then
    if tg_table_name = 'product_variants' then
      if new.price_override is not distinct from old.price_override and new.name is not distinct from old.name then
        return new;   -- cambios solo de stock u orden no requieren revisión
      end if;
    elsif tg_table_name = 'product_images' then
      if new.url is not distinct from old.url then
        return new;   -- reordenar o cambiar el texto alternativo no requiere revisión
      end if;
    end if;
  end if;
  update public.products set status = 'pendiente' where id = v_product and status = 'aprobado';
  perform set_config('app.trusted', 'on', true);
  update public.products set approved_at = null where id = v_product and status = 'inactivo';
  perform set_config('app.trusted', v_prev, true);
  return coalesce(new, old);
end $$;

-- Pausar o reactivar un producto propio.
create or replace function public.ambassador_set_paused(p_product_id uuid, p_paused boolean)
returns public.product_status language plpgsql security definer
set search_path = ''
as $$
declare
  v public.products%rowtype;
  v_new public.product_status;
begin
  select * into v from public.products where id = p_product_id and ambassador_id = public.my_ambassador_id() for update;
  if not found then
    raise exception 'Producto no encontrado.' using errcode = 'P0002';
  end if;
  if p_paused then
    if v.status <> 'aprobado' then
      raise exception 'Solo puedes pausar productos publicados.' using errcode = 'P0001';
    end if;
    v_new := 'inactivo';
  else
    if v.status <> 'inactivo' then
      raise exception 'Este producto no está pausado.' using errcode = 'P0001';
    end if;
    -- Si no cambió nada mientras estaba pausado, vuelve publicado; si cambió, a revisión.
    v_new := case when v.approved_at is not null then 'aprobado' else 'pendiente' end;
  end if;
  perform set_config('app.trusted', 'on', true);
  perform set_config('app.resume', 'on', true);   -- conserva la aprobación original
  update public.products set status = v_new where id = p_product_id;
  perform set_config('app.resume', '', true);
  perform set_config('app.trusted', '', true);
  return v_new;
end $$;

-- Marcar un item como listo: el pedido pasa a "preparando".
create or replace function public.ambassador_mark_ready(p_order_item_id uuid)
returns void language plpgsql security definer
set search_path = ''
as $$
declare v_order uuid;
begin
  update public.order_items oi set item_status = 'listo_para_recoger', ready_at = now()
  from public.orders o
  where oi.id = p_order_item_id
    and o.id = oi.order_id
    and oi.ambassador_id = public.my_ambassador_id()
    and oi.item_status = 'pendiente'
    and o.status in ('pagado', 'preparando')
  returning oi.order_id into v_order;
  if v_order is null then
    raise exception 'Este producto no se puede marcar como listo.' using errcode = 'P0002';
  end if;
  perform set_config('app.status_note', 'Los embajadores alistan tus productos', true);
  update public.orders set status = 'preparando' where id = v_order and status = 'pagado';
  perform set_config('app.status_note', '', true);
end $$;

-- ---------------------------------------------------------------------
-- Métricas del panel (agregadas en la base)
-- ---------------------------------------------------------------------
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

revoke execute on function public.ambassador_dashboard(), public.ambassador_set_paused(uuid, boolean) from public, anon;
grant execute on function public.ambassador_dashboard(), public.ambassador_set_paused(uuid, boolean) to authenticated, service_role;
grant execute on function public.ambassador_mark_ready(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Comprobantes de pago: bucket PRIVADO, carpeta {ambassador_id}/
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('payout-receipts', 'payout-receipts', false, 5 * 1024 * 1024, array['application/pdf', 'image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "mo: comprobantes embajador leer" on storage.objects for select to authenticated
  using (bucket_id = 'payout-receipts' and (storage.foldername(name))[1] = public.my_ambassador_id()::text);
create policy "mo: comprobantes admin todo" on storage.objects for all to authenticated
  using (bucket_id = 'payout-receipts' and public.is_admin())
  with check (bucket_id = 'payout-receipts' and public.is_admin());
