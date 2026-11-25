-- =====================================================================
-- Mercado Origen · Fase 3 · Checkout, pagos Wompi y liquidaciones
--
--  checkout_build()     cálculo ÚNICO del pedido (precios, kits, stock,
--                       cupón, envío). Lo usan el resumen del checkout y
--                       la creación del pedido: nunca pueden diferir.
--  checkout_quote()     RPC pública: resumen para el navegador.
--  checkout_create()    solo service_role (Edge Function create-order).
--  apply_wompi_transaction()  aplica un estado de Wompi (webhook o consulta).
--  cancel_stale_orders()      pg_cron: cancela pedidos sin pago.
--  Liquidaciones: cada venta aprobada se acumula en la liquidación abierta
--  del embajador; el admin la marca pagada con su comprobante.
-- =====================================================================

-- Formato de pesos para mensajes: 150000 -> $150.000
create or replace function public.cop(v integer)
returns text language sql immutable
set search_path = ''
as $$ select '$' || replace(to_char(v, 'FM999,999,999,999'), ',', '.') $$;

-- ---------------------------------------------------------------------
-- Cálculo del pedido
-- p: { items: [{product_id|variant_id|kit_id, quantity}], email, full_name, phone,
--      legal_id_type, legal_id, address: {recipient, phone, department,
--      city, address_line, notes}, coupon_code, age_confirmed, notes }
-- ---------------------------------------------------------------------
create or replace function public.checkout_build(p jsonb, p_user_id uuid, p_create boolean)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  it record;
  r record;
  k public.kits%rowtype;
  v_problems jsonb := '[]'::jsonb;
  v_sub integer;
  v_disc integer := 0;
  v_ship integer := 0;
  v_total integer;
  v_set public.shipping_settings%rowtype;
  v_coupon public.coupons%rowtype;
  v_code text := nullif(trim(coalesce(p ->> 'coupon_code', '')), '');
  v_coupon_msg text;
  v_email text := lower(trim(coalesce(p ->> 'email', '')));
  v_addr jsonb := coalesce(p -> 'address', '{}'::jsonb);
  v_age boolean;
  v_sep integer;
  v_rem integer;
  v_lines jsonb;
  v_order public.orders%rowtype;
  v_ref text;
  v_first jsonb;
begin
  create temporary table if not exists _co_lines (
    product_id uuid, kit_id uuid, ambassador_id uuid, sku text, name text,
    unit_price integer, quantity integer, is_age boolean, stock integer, ord integer, variant_id uuid
  ) on commit drop;
  truncate pg_temp._co_lines;

  if jsonb_typeof(p -> 'items') is distinct from 'array' or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'Tu carrito está vacío.' using errcode = '22023';
  end if;
  if jsonb_array_length(p -> 'items') > 60 then
    raise exception 'Tu carrito tiene demasiados productos distintos.' using errcode = '22023';
  end if;

  -- Items agrupados (un mismo producto o kit repetido se suma)
  for it in
    select nullif(e ->> 'product_id', '')::uuid as pid, nullif(e ->> 'kit_id', '')::uuid as kid, nullif(e ->> 'variant_id', '')::uuid as vid,
           least(sum(greatest(coalesce((e ->> 'quantity')::int, 1), 1)), 99)::int as q
    from jsonb_array_elements(p -> 'items') e
    group by 1, 2, 3
  loop
    if it.vid is not null then
      -- Variante ("1 kg", "500 g"): precio y stock propios, SKU base + sufijo.
      select pr.id, pr.ambassador_id, v.sku, pr.name || ' · ' || v.name as name, coalesce(v.price_override, pr.price) as price,
             v.stock, pr.is_age_restricted, v.id as vid into r
      from public.product_variants v
      join public.products pr on pr.id = v.product_id
      join public.ambassadors a on a.id = pr.ambassador_id
      where v.id = it.vid and v.is_active and pr.status = 'aprobado' and a.status = 'activo';
      if not found then
        v_problems := v_problems || jsonb_build_object('type', 'unavailable', 'variant_id', it.vid,
          'message', 'Una de las presentaciones de tu carrito ya no está disponible.');
        continue;
      end if;
      insert into pg_temp._co_lines values (r.id, null, r.ambassador_id, r.sku, r.name, r.price, it.q, r.is_age_restricted, r.stock, 0, r.vid);

    elsif it.pid is not null then
      select pr.id, pr.ambassador_id, pr.sku, pr.name, pr.price, pr.stock, pr.is_age_restricted into r
      from public.products pr join public.ambassadors a on a.id = pr.ambassador_id
      where pr.id = it.pid and pr.status = 'aprobado' and a.status = 'activo';
      if not found then
        v_problems := v_problems || jsonb_build_object('type', 'unavailable', 'product_id', it.pid,
          'message', 'Uno de los productos de tu carrito ya no está disponible.');
        continue;
      end if;
      insert into pg_temp._co_lines values (r.id, null, r.ambassador_id, r.sku, r.name, r.price, it.q, r.is_age_restricted, r.stock, 0, null);

    elsif it.kid is not null then
      select * into k from public.kits where id = it.kid and is_active;
      if not found
         or not exists (select 1 from public.kit_items where kit_id = it.kid)
         or exists (
           select 1 from public.kit_items ki
           left join public.products pr on pr.id = ki.product_id and pr.status = 'aprobado'
           left join public.ambassadors a on a.id = pr.ambassador_id and a.status = 'activo'
           where ki.kit_id = it.kid and a.id is null) then
        v_problems := v_problems || jsonb_build_object('type', 'unavailable', 'kit_id', it.kid,
          'message', 'Uno de los kits de tu carrito ya no está disponible.');
        continue;
      end if;

      -- El precio del kit se reparte entre sus productos en proporción a su
      -- precio normal (así cada embajador recibe su parte justa).
      select sum(pr.price * ki.quantity) into v_sep
      from public.kit_items ki join public.products pr on pr.id = ki.product_id
      where ki.kit_id = k.id;

      insert into pg_temp._co_lines
      select pr.id, k.id, pr.ambassador_id, pr.sku, pr.name,
             (floor(k.price::numeric * pr.price * ki.quantity / v_sep) / ki.quantity)::int,
             ki.quantity * it.q, pr.is_age_restricted, pr.stock,
             row_number() over (order by (ki.quantity = 1) desc, ki.sort_order), null::uuid
      from public.kit_items ki join public.products pr on pr.id = ki.product_id
      where ki.kit_id = k.id;

      -- Lo que sobra del redondeo va al primer producto del kit.
      select k.price - sum(unit_price * (quantity / it.q)) into v_rem from pg_temp._co_lines where kit_id = k.id;
      update pg_temp._co_lines set unit_price = unit_price + v_rem / (quantity / it.q)
      where kit_id = k.id and ord = 1;
    end if;
  end loop;

  -- Stock (sumando el producto suelto y dentro de kits; cada variante con su propio stock)
  for r in
    select product_id, min(name) as name, sum(quantity)::int as q, min(stock) as stock
    from pg_temp._co_lines group by product_id, variant_id
  loop
    if r.q > r.stock then
      v_problems := v_problems || jsonb_build_object('type', 'stock', 'product_id', r.product_id, 'name', r.name, 'available', r.stock,
        'message', case when r.stock = 0 then format('%s se agotó.', r.name)
                        else format('Solo quedan %s unidades de %s.', r.stock, r.name) end);
    end if;
  end loop;

  select coalesce(sum(unit_price * quantity), 0)::int, coalesce(bool_or(is_age), false) into v_sub, v_age from pg_temp._co_lines;

  -- Cupón
  if v_code is not null then
    -- lower(): con search_path vacío el operador = de citext no se resuelve.
    select * into v_coupon from public.coupons where lower(code::text) = lower(v_code);
    if not found or not v_coupon.is_active then
      v_coupon_msg := 'Ese cupón no existe o ya no está activo.';
    elsif v_coupon.starts_at is not null and now() < v_coupon.starts_at then
      v_coupon_msg := 'Ese cupón todavía no está disponible.';
    elsif v_coupon.expires_at is not null and now() > v_coupon.expires_at then
      v_coupon_msg := 'Ese cupón ya venció.';
    elsif v_coupon.max_uses is not null and v_coupon.uses >= v_coupon.max_uses then
      v_coupon_msg := 'Ese cupón ya se agotó.';
    elsif v_sub < v_coupon.min_order then
      v_coupon_msg := format('Este cupón aplica para compras desde %s.', public.cop(v_coupon.min_order));
    elsif v_email = '' and p_user_id is null then
      v_coupon_msg := 'Escribe tu correo para validar el cupón.';
    elsif (select count(*) from public.coupon_redemptions cr
           where cr.coupon_id = v_coupon.id and (cr.email = v_email or (p_user_id is not null and cr.user_id = p_user_id)))
          >= v_coupon.max_uses_per_customer then
      v_coupon_msg := 'Ya usaste este cupón.';
    elsif v_coupon.first_purchase_only and exists (
           select 1 from public.orders o
           where (o.email = v_email or (p_user_id is not null and o.user_id = p_user_id))
             and o.status not in ('pendiente_pago', 'cancelado')) then
      v_coupon_msg := 'Este cupón es solo para tu primera compra.';
    else
      v_disc := case when v_coupon.type = 'porcentaje' then round(v_sub * v_coupon.value / 100.0)::int
                     else least(v_coupon.value, v_sub) end;
    end if;
    if v_coupon_msg is not null then
      v_problems := v_problems || jsonb_build_object('type', 'coupon', 'message', v_coupon_msg);
    end if;
  end if;

  -- Envío: gratis desde el umbral; si no, tarifa por ciudad, por departamento o general.
  select * into v_set from public.shipping_settings limit 1;
  if v_sub >= coalesce(v_set.free_shipping_threshold, 150000) then
    v_ship := 0;
  else
    v_ship := coalesce(
      (v_set.base_rates ->> (v_addr ->> 'city'))::int,
      (v_set.base_rates ->> (v_addr ->> 'department'))::int,
      v_set.flat_rate, 0);
  end if;

  v_total := greatest(v_sub - v_disc, 0) + v_ship;
  if v_sub > 0 and v_total <= 0 then
    v_problems := v_problems || jsonb_build_object('type', 'total', 'message', 'El total del pedido debe ser mayor a $0.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'product_id', product_id, 'variant_id', variant_id, 'kit_id', kit_id, 'ambassador_id', ambassador_id, 'sku', sku, 'name', name,
           'unit_price', unit_price, 'quantity', quantity, 'is_age_restricted', is_age) order by kit_id nulls first, ord, name), '[]'::jsonb)
    into v_lines from pg_temp._co_lines;

  if not p_create then
    return jsonb_build_object(
      'lines', v_lines, 'subtotal', v_sub, 'discount', v_disc, 'shipping', v_ship, 'total', v_total,
      'free_shipping_threshold', coalesce(v_set.free_shipping_threshold, 150000),
      'coupon', case when v_code is not null then jsonb_build_object('code', upper(v_code), 'ok', v_coupon_msg is null,
                  'message', coalesce(v_coupon_msg, 'Cupón aplicado'), 'discount', v_disc) end,
      'age_required', v_age, 'problems', v_problems);
  end if;

  -- ------------------------- Crear el pedido -------------------------
  if jsonb_array_length(v_problems) > 0 then
    v_first := v_problems -> 0;
    raise exception '%', v_first ->> 'message' using errcode = 'P0001', detail = v_problems::text;
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Escribe un correo válido para enviarte la confirmación.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p ->> 'full_name', ''))) < 3 then
    raise exception 'Escribe tu nombre completo.' using errcode = '22023';
  end if;
  if coalesce(p ->> 'phone', '') !~ '^\+?[\d\s-]{7,15}$' then
    raise exception 'Escribe un celular válido para coordinar la entrega.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(v_addr ->> 'recipient', ''))) < 3 or coalesce(v_addr ->> 'department', '') = ''
     or char_length(trim(coalesce(v_addr ->> 'city', ''))) < 2 or char_length(trim(coalesce(v_addr ->> 'address_line', ''))) < 5
     or coalesce(v_addr ->> 'phone', '') !~ '^\+?[\d\s-]{7,15}$' then
    raise exception 'Completa los datos de envío: quién recibe, celular, departamento, ciudad y dirección.' using errcode = '22023';
  end if;
  if v_age and not coalesce((p ->> 'age_confirmed')::boolean, false) then
    raise exception 'Confirma que eres mayor de 18 años: tu pedido incluye bebidas alcohólicas.' using errcode = '22023';
  end if;

  perform set_config('app.status_note', 'Pedido creado, esperando el pago', true);
  insert into public.orders (user_id, email, customer_name, customer_phone, customer_document, shipping_address,
                             subtotal, discount, shipping, total, coupon_id, coupon_code, customer_notes, age_confirmed_at)
  values (
    p_user_id, v_email, trim(p ->> 'full_name'), trim(p ->> 'phone'),
    nullif(trim(concat_ws(' ', p ->> 'legal_id_type', p ->> 'legal_id')), ''),
    jsonb_build_object(
      'recipient', trim(v_addr ->> 'recipient'), 'phone', trim(v_addr ->> 'phone'),
      'department', v_addr ->> 'department', 'city', trim(v_addr ->> 'city'),
      'address_line', trim(v_addr ->> 'address_line'), 'notes', nullif(trim(coalesce(v_addr ->> 'notes', '')), '')),
    v_sub, v_disc, v_ship, v_total,
    case when v_disc > 0 then v_coupon.id end, case when v_disc > 0 then v_coupon.code::text end,
    nullif(left(trim(coalesce(p ->> 'notes', '')), 500), ''),
    case when v_age then now() end)
  returning * into v_order;
  perform set_config('app.status_note', '', true);

  insert into public.order_items (order_id, product_id, variant_id, kit_id, ambassador_id, sku, name, unit_price, quantity)
  select v_order.id, product_id, variant_id, kit_id, ambassador_id, sku, name, unit_price, quantity
  from pg_temp._co_lines order by kit_id nulls first, ord;

  v_ref := v_order.order_number || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into public.payments (order_id, reference, amount_in_cents, currency)
  values (v_order.id, v_ref, v_total::bigint * 100, 'COP');

  return jsonb_build_object(
    'order_id', v_order.id, 'order_number', v_order.order_number, 'access_token', v_order.access_token,
    'reference', v_ref, 'amount_in_cents', v_total::bigint * 100, 'currency', 'COP', 'total', v_total,
    'email', v_order.email);
end $$;

revoke execute on function public.checkout_build(jsonb, uuid, boolean) from public, anon, authenticated;

-- Resumen para el navegador (el usuario sale de la sesión, nunca del cliente).
create or replace function public.checkout_quote(p jsonb)
returns jsonb language sql security definer
set search_path = ''
as $$ select public.checkout_build(p, auth.uid(), false) $$;

-- Crear pedido: solo la Edge Function (service_role), que ya verificó al usuario.
create or replace function public.checkout_create(p jsonb, p_user_id uuid)
returns jsonb language sql security definer
set search_path = ''
as $$ select public.checkout_build(p, p_user_id, true) $$;

-- Reintentar el pago de un pedido pendiente: nueva referencia, mismos valores.
create or replace function public.checkout_retry_payment(p_order_number text, p_access_token uuid)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  r record;
  v_ref text;
begin
  select * into v_order from public.orders
  where order_number = p_order_number and access_token = p_access_token for update;
  if not found then
    raise exception 'No encontramos ese pedido.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.payments where order_id = v_order.id and status = 'APPROVED') then
    raise exception 'Este pedido ya fue pagado.' using errcode = 'P0001';
  end if;
  if v_order.status <> 'pendiente_pago' then
    raise exception 'Este pedido ya no está pendiente de pago. Arma tu caja de nuevo para comprar.' using errcode = 'P0001';
  end if;
  for r in
    select min(oi.name) as name, sum(oi.quantity)::int as q, coalesce(min(v.stock), min(pr.stock)) as stock
    from public.order_items oi
    join public.products pr on pr.id = oi.product_id
    left join public.product_variants v on v.id = oi.variant_id
    where oi.order_id = v_order.id group by oi.product_id, oi.variant_id
  loop
    if r.q > r.stock then
      raise exception '% se agotó mientras pagabas. Arma tu caja de nuevo.', r.name using errcode = 'P0001';
    end if;
  end loop;

  v_ref := v_order.order_number || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into public.payments (order_id, reference, amount_in_cents, currency)
  values (v_order.id, v_ref, v_order.total::bigint * 100, 'COP');

  return jsonb_build_object(
    'order_id', v_order.id, 'order_number', v_order.order_number, 'access_token', v_order.access_token,
    'reference', v_ref, 'amount_in_cents', v_order.total::bigint * 100, 'currency', 'COP', 'total', v_order.total,
    'email', v_order.email, 'customer_name', v_order.customer_name, 'customer_phone', v_order.customer_phone,
    'shipping_address', v_order.shipping_address);
end $$;

-- ---------------------------------------------------------------------
-- Aplicar un estado de Wompi (desde el webhook o desde la consulta)
-- p_tx: el objeto "transaction" de Wompi.
-- ---------------------------------------------------------------------
create or replace function public.apply_wompi_transaction(p_tx jsonb)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_pay public.payments%rowtype;
  v_order public.orders%rowtype;
  v_new public.payment_status;
  v_prev public.payment_status;
  v_info jsonb;
begin
  select * into v_pay from public.payments where reference = p_tx ->> 'reference' for update;
  if not found then
    return jsonb_build_object('result', 'unknown_reference');
  end if;

  v_new := case when (p_tx ->> 'status') in ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR')
                then (p_tx ->> 'status')::public.payment_status else 'ERROR' end;

  -- El monto y la moneda deben ser exactamente los del pedido.
  if (p_tx ->> 'amount_in_cents')::bigint is distinct from v_pay.amount_in_cents
     or coalesce(p_tx ->> 'currency', 'COP') <> v_pay.currency then
    update public.payments set raw_event = p_tx, status_message = 'Monto o moneda distintos a los del pedido'
    where id = v_pay.id;
    update public.orders set needs_review = true,
      review_reason = format('Wompi reportó un monto distinto al del pedido (referencia %s).', v_pay.reference)
    where id = v_pay.order_id;
    return jsonb_build_object('result', 'amount_mismatch', 'order_id', v_pay.order_id);
  end if;

  v_prev := v_pay.status;
  if v_prev = v_new then
    update public.payments set
      wompi_transaction_id = coalesce(wompi_transaction_id, p_tx ->> 'id'),
      payment_method_type = coalesce(payment_method_type, p_tx ->> 'payment_method_type')
    where id = v_pay.id;
  else
    if v_prev <> 'PENDING' then
      update public.orders set needs_review = true,
        review_reason = format('Wompi cambió el pago %s de %s a %s.', v_pay.reference, v_prev, v_new)
      where id = v_pay.order_id;
    end if;
    if v_new = 'APPROVED' and exists (
         select 1 from public.payments where order_id = v_pay.order_id and status = 'APPROVED' and id <> v_pay.id) then
      update public.orders set needs_review = true,
        review_reason = 'Llegó un segundo pago aprobado para este pedido: revisar reembolso.'
      where id = v_pay.order_id;
    end if;
    -- El trigger payments_on_status aplica la aprobación (stock, ventas, liquidación).
    update public.payments set
      status = v_new,
      wompi_transaction_id = coalesce(p_tx ->> 'id', wompi_transaction_id),
      payment_method_type = coalesce(p_tx ->> 'payment_method_type', payment_method_type),
      status_message = p_tx ->> 'status_message',
      raw_event = p_tx
    where id = v_pay.id;
  end if;

  select * into v_order from public.orders where id = v_pay.order_id;
  v_info := jsonb_build_object(
    'result', case when v_prev = v_new then 'unchanged' else 'updated' end,
    'previous', v_prev, 'status', v_new,
    'just_approved', v_new = 'APPROVED' and v_prev is distinct from 'APPROVED',
    'order_id', v_order.id, 'order_number', v_order.order_number, 'order_status', v_order.status,
    'email', v_order.email, 'customer_name', v_order.customer_name, 'user_id', v_order.user_id,
    'access_token', v_order.access_token, 'total', v_order.total, 'payment_method_type', coalesce(p_tx ->> 'payment_method_type', v_pay.payment_method_type));
  return v_info;
end $$;

-- Estado público de un pedido por referencia/transacción (para /pago/resultado).
create or replace function public.payment_summary(p_reference text)
returns jsonb language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number', o.order_number, 'order_status', o.status, 'payment_status', p.status,
    'payment_method_type', p.payment_method_type, 'total', o.total, 'user_id', o.user_id, 'email', o.email,
    'customer_name', o.customer_name, 'access_token', o.access_token)
  from public.payments p join public.orders o on o.id = p.order_id
  where p.reference = p_reference
$$;

revoke execute on function public.checkout_create(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.checkout_retry_payment(text, uuid) from public, anon, authenticated;
revoke execute on function public.apply_wompi_transaction(jsonb) from public, anon, authenticated;
revoke execute on function public.payment_summary(text) from public, anon, authenticated;
grant execute on function public.checkout_quote(jsonb) to anon, authenticated, service_role;
grant execute on function
  public.checkout_build(jsonb, uuid, boolean), public.checkout_create(jsonb, uuid),
  public.checkout_retry_payment(text, uuid), public.apply_wompi_transaction(jsonb), public.payment_summary(text),
  public.cop(integer)
to service_role;
grant execute on function public.cop(integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Liquidaciones: la venta aprobada se suma a la liquidación abierta del
-- embajador (una por embajador hasta que el admin la paga).
-- ---------------------------------------------------------------------
alter table public.ambassador_payouts drop constraint if exists ambassador_payouts_ambassador_id_period_start_period_end_key;
alter table public.ambassador_payouts add column if not exists items_without_commission integer not null default 0;
create unique index if not exists ambassador_payouts_one_open on public.ambassador_payouts (ambassador_id) where status = 'pendiente';

create or replace function public.refresh_payout(p_payout_id uuid)
returns void language sql security definer
set search_path = ''
as $$
  update public.ambassador_payouts po set
    gross = coalesce(s.gross, 0),
    commission = coalesce(s.commission, 0),
    net = coalesce(s.net, 0),
    items_without_commission = coalesce(s.missing, 0),
    period_start = coalesce(s.first_day, po.period_start),
    period_end = coalesce(s.last_day, po.period_end)
  from (
    select sum(gross)::int as gross, sum(commission)::int as commission, sum(coalesce(net, gross))::int as net,
           count(*) filter (where commission is null)::int as missing,
           min((created_at at time zone 'America/Bogota')::date) as first_day,
           max((created_at at time zone 'America/Bogota')::date) as last_day
    from public.ambassador_ledger where payout_id = p_payout_id
  ) s
  where po.id = p_payout_id
$$;

-- Engancha las filas nuevas del ledger de un pedido a la liquidación abierta.
create or replace function public.attach_ledger_to_payouts(p_order_id uuid)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  a uuid;
  v_payout uuid;
  v_today date := (now() at time zone 'America/Bogota')::date;
begin
  for a in select distinct ambassador_id from public.ambassador_ledger where order_id = p_order_id and payout_id is null loop
    select id into v_payout from public.ambassador_payouts where ambassador_id = a and status = 'pendiente';
    if v_payout is null then
      insert into public.ambassador_payouts (ambassador_id, period_start, period_end)
      values (a, v_today, v_today) returning id into v_payout;
    end if;
    update public.ambassador_ledger set payout_id = v_payout where order_id = p_order_id and ambassador_id = a and payout_id is null;
    perform public.refresh_payout(v_payout);
  end loop;
end $$;

create or replace function public.ledger_after_insert()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.attach_ledger_to_payouts(o.order_id) from (select distinct order_id from new_rows) o;
  return null;
end $$;

create trigger ambassador_ledger_attach after insert on public.ambassador_ledger
  referencing new table as new_rows
  for each statement execute function public.ledger_after_insert();

-- Cancelar/reembolsar: se anula lo que no se ha pagado al embajador.
create or replace function public.restore_order_stock()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_prev text := coalesce(current_setting('app.trusted', true), '');
  v_paid_out int;
  v_payouts uuid[];
  po uuid;
begin
  if not new.stock_deducted then return null; end if;
  perform set_config('app.trusted', 'on', true);

  update public.product_variants v set stock = v.stock + s.qty
  from (select variant_id, sum(quantity)::int qty from public.order_items
        where order_id = new.id and variant_id is not null group by variant_id) s
  where v.id = s.variant_id;

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

  -- Filas en liquidaciones aún no pagadas: se borran y se recalcula la liquidación.
  select array_agg(distinct l.payout_id) into v_payouts
  from public.ambassador_ledger l left join public.ambassador_payouts po2 on po2.id = l.payout_id
  where l.order_id = new.id and (l.payout_id is null or po2.status = 'pendiente');
  delete from public.ambassador_ledger l
  using public.ambassador_payouts po2
  where l.order_id = new.id and po2.id = l.payout_id and po2.status = 'pendiente';
  delete from public.ambassador_ledger where order_id = new.id and payout_id is null;
  foreach po in array coalesce(v_payouts, '{}') loop
    if po is not null then perform public.refresh_payout(po); end if;
  end loop;
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

-- Si el admin acuerda la comisión después de algunas ventas, se completa
-- en las filas aún no liquidadas.
create or replace function public.fill_pending_commission()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare po uuid;
begin
  if new.commission_rate is null or new.commission_rate is not distinct from old.commission_rate then return new; end if;
  update public.ambassador_ledger l set
    commission_rate = new.commission_rate,
    commission = round(l.gross * new.commission_rate / 100)::int,
    net = l.gross - round(l.gross * new.commission_rate / 100)::int
  from public.ambassador_payouts p
  where l.ambassador_id = new.ambassador_id and l.commission_rate is null and p.id = l.payout_id and p.status = 'pendiente';
  for po in select id from public.ambassador_payouts where ambassador_id = new.ambassador_id and status = 'pendiente' loop
    perform public.refresh_payout(po);
  end loop;
  return new;
end $$;

create trigger ambassador_private_fill_commission after update of commission_rate on public.ambassador_private
  for each row execute function public.fill_pending_commission();

-- Admin: marcar una liquidación como pagada (con comprobante).
create or replace function public.admin_mark_payout_paid(p_payout_id uuid, p_receipt_url text default null, p_notes text default null)
returns void language plpgsql security definer
set search_path = ''
as $$
declare v public.ambassador_payouts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede registrar pagos a embajadores.' using errcode = '42501';
  end if;
  select * into v from public.ambassador_payouts where id = p_payout_id for update;
  if not found or v.status <> 'pendiente' then
    raise exception 'Esta liquidación no está pendiente.' using errcode = 'P0001';
  end if;
  if v.items_without_commission > 0 then
    raise exception 'Primero acuerda la comisión del embajador: hay % ventas sin comisión.', v.items_without_commission using errcode = 'P0001';
  end if;
  update public.ambassador_payouts set status = 'pagado', paid_at = now(), receipt_url = coalesce(p_receipt_url, receipt_url),
    notes = coalesce(p_notes, notes), created_by = coalesce(created_by, auth.uid())
  where id = p_payout_id;
end $$;

revoke execute on function public.admin_mark_payout_paid(uuid, text, text) from public, anon;
grant execute on function public.admin_mark_payout_paid(uuid, text, text) to authenticated, service_role;
revoke execute on function public.refresh_payout(uuid), public.attach_ledger_to_payouts(uuid) from public, anon, authenticated;

-- Las ventas ya aprobadas (semilla) entran a su liquidación abierta.
do $$
declare o uuid;
begin
  for o in select distinct order_id from public.ambassador_ledger where payout_id is null loop
    perform public.attach_ledger_to_payouts(o);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Pedidos sin pago: se cancelan solos (pg_cron cada 15 minutos).
-- El checkout de Wompi vence a los 60 minutos; damos 3 horas de margen
-- para pagos lentos (PSE). Un pago que llegue después queda para revisión.
-- ---------------------------------------------------------------------
create or replace function public.cancel_stale_orders(p_hours integer default 3)
returns integer language plpgsql security definer
set search_path = ''
as $$
declare n integer;
begin
  perform set_config('app.status_note', 'Cancelado automáticamente: no recibimos el pago a tiempo', true);
  with c as (
    update public.orders o set status = 'cancelado'
    where o.status = 'pendiente_pago'
      and o.created_at < now() - make_interval(hours => p_hours)
      and not exists (select 1 from public.payments p where p.order_id = o.id and p.status = 'APPROVED')
    returning 1)
  select count(*) into n from c;
  perform set_config('app.status_note', '', true);
  return n;
end $$;

revoke execute on function public.cancel_stale_orders(integer) from public, anon, authenticated;
grant execute on function public.cancel_stale_orders(integer) to service_role;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('mo-cancel-stale-orders', '*/15 * * * *', $$select public.cancel_stale_orders(3)$$);
