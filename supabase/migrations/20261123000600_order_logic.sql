-- =====================================================================
-- Mercado Origen · 0600 · Lógica de pedidos
--  · Pago APPROVED  -> pedido "pagado", stock descontado (con bloqueo de
--    filas), ventas sumadas, cuenta por pagar a cada embajador.
--  · Pedido cancelado/reembolsado -> se devuelve el stock.
-- =====================================================================

create or replace function public.apply_payment_approval(p_order_id uuid)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  r record;
  v_short text[] := '{}';
  v_prev text := coalesce(current_setting('app.trusted', true), '');
begin
  -- Bloquea el pedido: dos webhooks simultáneos no pueden aplicarlo dos veces.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return; end if;

  if v_order.status <> 'pendiente_pago' or v_order.stock_deducted then
    if v_order.status = 'cancelado' then
      update public.orders
         set needs_review = true,
             review_reason = 'Wompi aprobó el pago de un pedido que ya estaba cancelado. Revisar reembolso o reactivar.'
       where id = p_order_id;
    end if;
    return;   -- ya procesado: idempotente
  end if;

  perform set_config('app.trusted', 'on', true);

  -- Descuenta stock en orden fijo de id para evitar bloqueos cruzados.
  -- El UPDATE ... WHERE stock >= qty bloquea la fila y nunca deja stock negativo.
  for r in
    select oi.product_id, oi.variant_id, sum(oi.quantity)::int as qty, min(oi.name) as name
    from public.order_items oi
    where oi.order_id = p_order_id and oi.product_id is not null
    group by oi.product_id, oi.variant_id
    order by oi.product_id, oi.variant_id nulls first
  loop
    if r.variant_id is not null then
      update public.product_variants set stock = stock - r.qty where id = r.variant_id and stock >= r.qty;
    else
      update public.products set stock = stock - r.qty where id = r.product_id and stock >= r.qty;
    end if;
    if not found then
      v_short := v_short || r.name;
    end if;
  end loop;

  -- Ventas por producto y por embajador (unidades).
  update public.products p set sales_count = p.sales_count + s.qty
  from (select product_id, sum(quantity)::int qty from public.order_items
        where order_id = p_order_id and product_id is not null group by product_id) s
  where p.id = s.product_id;

  update public.ambassadors a set sales_count = a.sales_count + s.qty
  from (select ambassador_id, sum(quantity)::int qty from public.order_items
        where order_id = p_order_id group by ambassador_id) s
  where a.id = s.ambassador_id;

  -- Lo que se le debe a cada embajador: precio cobrado (ya con el reparto
  -- del kit) menos la comisión acordada. Si aún no hay comisión, queda null
  -- y el admin la ve como alerta antes de liquidar.
  insert into public.ambassador_ledger (order_item_id, order_id, ambassador_id, gross, commission_rate, commission, net)
  select oi.id, oi.order_id, oi.ambassador_id, oi.line_total, ap.commission_rate,
         case when ap.commission_rate is not null then round(oi.line_total * ap.commission_rate / 100)::int end,
         case when ap.commission_rate is not null then oi.line_total - round(oi.line_total * ap.commission_rate / 100)::int end
  from public.order_items oi
  left join public.ambassador_private ap on ap.ambassador_id = oi.ambassador_id
  where oi.order_id = p_order_id
  on conflict (order_item_id) do nothing;

  insert into public.product_events (user_id, session_id, product_id, event)
  select v_order.user_id, case when v_order.user_id is null then 'order:' || v_order.id end, oi.product_id, 'purchase'
  from public.order_items oi
  where oi.order_id = p_order_id and oi.product_id is not null;

  if v_order.coupon_id is not null then
    update public.coupons set uses = uses + 1 where id = v_order.coupon_id;
    insert into public.coupon_redemptions (coupon_id, order_id, user_id, email, amount)
    values (v_order.coupon_id, v_order.id, v_order.user_id, v_order.email, v_order.discount)
    on conflict (order_id) do nothing;
  end if;

  perform set_config('app.status_note', 'Pago aprobado por Wompi', true);
  update public.orders set
    status = 'pagado',
    stock_deducted = true,
    needs_review = cardinality(v_short) > 0,
    review_reason = case when cardinality(v_short) > 0
                         then 'Pagado sin stock suficiente de: ' || array_to_string(v_short, ', ') end
  where id = p_order_id;
  perform set_config('app.status_note', '', true);
  perform set_config('app.trusted', v_prev, true);
end $$;

revoke execute on function public.apply_payment_approval(uuid) from public, anon, authenticated;

-- El webhook solo actualiza payments; la aprobación se aplica aquí, en la
-- misma transacción.
create or replace function public.payments_on_status()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status = 'APPROVED' and (tg_op = 'INSERT' or old.status is distinct from 'APPROVED') then
    perform public.apply_payment_approval(new.order_id);
  end if;
  return null;
end $$;

create trigger payments_on_status after insert or update of status on public.payments
  for each row execute function public.payments_on_status();

-- Cancelar o reembolsar un pedido pagado devuelve el stock y anula lo que
-- aún no se ha liquidado a los embajadores.
create or replace function public.restore_order_stock()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_prev text := coalesce(current_setting('app.trusted', true), '');
  v_paid_out int;
begin
  if not new.stock_deducted then return null; end if;
  perform set_config('app.trusted', 'on', true);

  update public.product_variants v set stock = v.stock + s.qty
  from (select variant_id, sum(quantity)::int qty from public.order_items
        where order_id = new.id and variant_id is not null group by variant_id) s
  where v.id = s.variant_id;

  -- El stock vuelve a donde salió: a la variante (arriba) o al producto base.
  update public.products p set stock = p.stock + s.qty
  from (select product_id, sum(quantity)::int qty from public.order_items
        where order_id = new.id and product_id is not null and variant_id is null group by product_id) s
  where p.id = s.product_id;

  update public.products p set sales_count = greatest(p.sales_count - s.qty, 0)
  from (select product_id, sum(quantity)::int qty from public.order_items
        where order_id = new.id and product_id is not null group by product_id) s
  where p.id = s.product_id;

  update public.ambassadors a set sales_count = greatest(a.sales_count - s.qty, 0)
  from (select ambassador_id, sum(quantity)::int qty from public.order_items
        where order_id = new.id group by ambassador_id) s
  where a.id = s.ambassador_id;

  delete from public.ambassador_ledger where order_id = new.id and payout_id is null;
  select count(*) into v_paid_out from public.ambassador_ledger where order_id = new.id;

  update public.orders set
    stock_deducted = false,
    needs_review = needs_review or v_paid_out > 0,
    review_reason = case when v_paid_out > 0
                         then 'Pedido anulado con pagos ya liquidados a embajadores: descontar en la próxima liquidación.'
                         else review_reason end
  where id = new.id;

  perform set_config('app.trusted', v_prev, true);
  return null;
end $$;

create trigger orders_restore_stock after update of status on public.orders
  for each row
  when (new.status in ('cancelado', 'reembolsado') and old.status not in ('cancelado', 'reembolsado'))
  execute function public.restore_order_stock();

-- ---------------------------------------------------------------------
-- Embajador: sus items vendidos, sin datos personales del cliente.
-- ---------------------------------------------------------------------
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

-- Embajador: marcar un item como listo para recoger.
create or replace function public.ambassador_mark_ready(p_order_item_id uuid)
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  update public.order_items oi set item_status = 'listo_para_recoger', ready_at = now()
  from public.orders o
  where oi.id = p_order_item_id
    and o.id = oi.order_id
    and oi.ambassador_id = public.my_ambassador_id()
    and oi.item_status = 'pendiente'
    and o.status in ('pagado', 'preparando');
  if not found then
    raise exception 'Este producto no se puede marcar como listo.' using errcode = 'P0002';
  end if;
end $$;

-- Admin: cambiar el estado de un pedido con nota (queda en el historial).
create or replace function public.admin_set_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar el estado del pedido.' using errcode = '42501';
  end if;
  perform set_config('app.status_note', coalesce(p_note, ''), true);
  update public.orders set status = p_status where id = p_order_id;
  perform set_config('app.status_note', '', true);
end $$;

-- Invitado: consultar su pedido con número + token (sin cuenta).
create or replace function public.guest_order(p_order_number text, p_access_token uuid)
returns jsonb language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number', o.order_number, 'status', o.status, 'created_at', o.created_at,
    'subtotal', o.subtotal, 'discount', o.discount, 'shipping', o.shipping, 'total', o.total,
    'carrier', o.carrier, 'tracking_code', o.tracking_code, 'estimated_delivery', o.estimated_delivery,
    'items', (select jsonb_agg(jsonb_build_object('sku', sku, 'name', name, 'unit_price', unit_price,
                     'quantity', quantity, 'ambassador_id', ambassador_id) order by created_at)
              from public.order_items where order_id = o.id),
    'history', (select jsonb_agg(jsonb_build_object('status', status, 'created_at', created_at) order by created_at)
                from public.order_status_history where order_id = o.id)
  )
  from public.orders o
  where o.order_number = p_order_number and o.access_token = p_access_token
$$;

-- Al iniciar sesión: une los eventos del invitado a su cuenta.
create or replace function public.merge_session_events(p_session_id text)
returns void language sql security definer
set search_path = ''
as $$
  update public.product_events set user_id = auth.uid()
  where session_id = p_session_id and user_id is null and auth.uid() is not null
$$;
