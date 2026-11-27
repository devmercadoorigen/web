-- =====================================================================
-- Mercado Origen · Ruleta de bienvenida
--  · Cada cliente NUEVO (cuenta creada desde que se activó la ruleta) gira una sola vez.
--  · El premio lo sortea la base (spin_welcome_wheel) según el peso de cada premio:
--    el navegador solo anima la ruleta hasta el resultado que recibe.
--  · El premio se vuelve un cupón personal (owner_user_id), de un solo uso, solo para la
--    primera compra, que checkout_build aplica solo si el cliente no escribe otro cupón.
--  · Premios y probabilidades: tabla wheel_prizes (weight = probabilidad relativa).
--  · Tipos de cupón nuevos: envio_gratis, dos_por_uno (2x1 en alimentos), articulo_gratis.
-- =====================================================================

alter type public.coupon_type add value if not exists 'envio_gratis';
alter type public.coupon_type add value if not exists 'dos_por_uno';
alter type public.coupon_type add value if not exists 'articulo_gratis';

alter table public.coupons add column if not exists owner_user_id uuid references public.profiles (id) on delete cascade;
create index if not exists coupons_owner_idx on public.coupons (owner_user_id) where owner_user_id is not null;

-- ---------------------------------------------------------------------
-- Premios
-- ---------------------------------------------------------------------
create table public.wheel_prizes (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  label        text not null,                 -- texto dentro de la ruleta (corto)
  legend       text not null,                 -- texto de la leyenda
  terms        text,                          -- condiciones que ve el ganador
  coupon_type  text not null check (coupon_type in ('porcentaje', 'valor', 'envio_gratis', 'dos_por_uno', 'articulo_gratis')),
  value        integer not null default 1 check (value > 0),   -- % / COP / tope del descuento
  min_order    integer not null default 0 check (min_order >= 0),
  valid_days   integer not null default 30 check (valid_days between 1 and 365),
  weight       integer not null check (weight > 0),            -- probabilidad relativa (y tamaño de la porción)
  color        text not null,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  check (coupon_type <> 'porcentaje' or value <= 100)
);

insert into public.wheel_prizes (slug, label, legend, terms, coupon_type, value, min_order, weight, color, sort_order) values
  ('envio-gratis', 'Envío gratis',  'Envío gratis',              'El envío de tu primera compra corre por nuestra cuenta, a cualquier ciudad de Colombia.', 'envio_gratis', 1, 0, 24, '#0B7A3B', 1),
  ('5-dto',        '5% dto.',       'Descuento del 5%',          '5% de descuento sobre los productos de tu primera compra.', 'porcentaje', 5, 0, 22, '#E2483D', 2),
  ('2x1',          '2x1',           '2x1 en alimentos',          'Lleva 2 o más productos de alimentos y el de menor precio te sale gratis (hasta $40.000, no aplica dentro de kits).', 'dos_por_uno', 40000, 0, 8, '#2F5D9B', 3),
  ('10-dto',       '10% dto.',      'Descuento del 10%',         '10% de descuento sobre los productos de tu primera compra.', 'porcentaje', 10, 0, 18, '#0E8FB0', 4),
  ('gratis',       'Gratis',        '1 artículo gratis',         'El producto de menor precio de tu compra te sale gratis (hasta $30.000) en compras desde $60.000. No aplica dentro de kits.', 'articulo_gratis', 30000, 60000, 6, '#7A3E9D', 5),
  ('15-dto',       '15% dto.',      'Descuento del 15%',         '15% de descuento sobre los productos de tu primera compra.', 'porcentaje', 15, 0, 10, '#B8408A', 6),
  ('bono-20',      'Bono $20 mil',  'Bono de COP$20.000',        '$20.000 de descuento en compras desde $80.000.', 'valor', 20000, 80000, 6, '#6E9E2E', 7),
  ('20-dto',       '20% dto.',      'Descuento del 20%',         '20% de descuento sobre los productos de tu primera compra.', 'porcentaje', 20, 0, 6, '#E08A00', 8);

create table public.wheel_spins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  prize_id   uuid not null references public.wheel_prizes (id) on delete restrict,
  coupon_id  uuid references public.coupons (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Desde cuándo una cuenta cuenta como "nueva" (las anteriores no giran).
insert into public.site_settings (key, value)
values ('wheel', jsonb_build_object('enabled', true, 'starts_at', now()))
on conflict (key) do nothing;

alter table public.wheel_prizes enable row level security;
alter table public.wheel_spins enable row level security;
create policy "admin: todo" on public.wheel_prizes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "publico: leer activos" on public.wheel_prizes for select to anon, authenticated using (is_active);
create policy "admin: todo" on public.wheel_spins for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "propio: leer" on public.wheel_spins for select to authenticated using (user_id = auth.uid());
grant select on public.wheel_prizes to anon;
grant select, insert, update, delete on public.wheel_prizes, public.wheel_spins to authenticated, service_role;
revoke truncate on public.wheel_prizes, public.wheel_spins from anon, authenticated;

-- ---------------------------------------------------------------------
-- Estado y giro
-- ---------------------------------------------------------------------
create or replace function public.wheel_status()
returns jsonb language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb;
  v_prof record;
  v_spin jsonb;
  v_enabled boolean;
  v_eligible boolean := false;
begin
  select value into v_cfg from public.site_settings where key = 'wheel';
  v_enabled := coalesce((v_cfg ->> 'enabled')::boolean, false);
  if v_uid is null then
    return jsonb_build_object('enabled', v_enabled, 'eligible', false);
  end if;
  select p.role, p.created_at into v_prof from public.profiles p where p.id = v_uid;

  select jsonb_build_object('prize', wp.slug, 'label', wp.label, 'legend', wp.legend, 'terms', wp.terms,
           'code', c.code::text, 'expires_at', c.expires_at, 'min_order', wp.min_order,
           'used', exists (select 1 from public.coupon_redemptions cr where cr.coupon_id = c.id))
    into v_spin
  from public.wheel_spins s
  join public.wheel_prizes wp on wp.id = s.prize_id
  left join public.coupons c on c.id = s.coupon_id
  where s.user_id = v_uid;

  v_eligible := v_enabled
    and v_spin is null
    and v_prof.role = 'cliente'
    and v_prof.created_at >= coalesce((v_cfg ->> 'starts_at')::timestamptz, '-infinity'::timestamptz)
    and not exists (select 1 from public.orders o where o.user_id = v_uid and o.status not in ('pendiente_pago', 'cancelado'));

  return jsonb_build_object('enabled', v_enabled, 'eligible', coalesce(v_eligible, false), 'spin', v_spin);
end $$;

create or replace function public.spin_welcome_wheel()
returns jsonb language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_status jsonb;
  v_prize public.wheel_prizes%rowtype;
  v_total integer;
  v_pick double precision;
  v_code text;
  v_coupon_id uuid;
  v_expires timestamptz;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para girar la ruleta.' using errcode = '42501';
  end if;
  -- Un giro por persona aunque lleguen dos clics a la vez.
  perform pg_advisory_xact_lock(hashtext('wheel:' || v_uid::text));
  v_status := public.wheel_status();
  if jsonb_typeof(v_status -> 'spin') = 'object' then
    raise exception 'Ya giraste la ruleta: tu premio te espera en tu primera compra.' using errcode = 'P0001';
  end if;
  if not (v_status ->> 'eligible')::boolean then
    raise exception 'La ruleta es para cuentas nuevas, antes de su primera compra.' using errcode = 'P0001';
  end if;

  select sum(weight) into v_total from public.wheel_prizes where is_active;
  if coalesce(v_total, 0) = 0 then
    raise exception 'La ruleta no está disponible en este momento.' using errcode = 'P0001';
  end if;
  v_pick := random() * v_total;
  select wp.id, wp.slug, wp.label, wp.legend, wp.terms, wp.coupon_type, wp.value, wp.min_order, wp.valid_days,
         wp.weight, wp.color, wp.sort_order, wp.is_active, wp.created_at
    into v_prize
  from (select w.*, sum(w.weight) over (order by w.sort_order, w.slug) as cum
        from public.wheel_prizes w where w.is_active) wp
  where wp.cum > v_pick
  order by wp.cum limit 1;

  v_expires := now() + make_interval(days => v_prize.valid_days);
  loop
    v_code := 'GIRO-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.coupons where lower(code::text) = lower(v_code));
  end loop;

  insert into public.coupons (code, description, type, value, min_order, max_uses, max_uses_per_customer,
                              first_purchase_only, expires_at, is_active, owner_user_id)
  values (v_code, 'Ruleta de bienvenida: ' || v_prize.legend, v_prize.coupon_type::public.coupon_type, v_prize.value,
          v_prize.min_order, 1, 1, true, v_expires, true, v_uid)
  returning id into v_coupon_id;

  insert into public.wheel_spins (user_id, prize_id, coupon_id) values (v_uid, v_prize.id, v_coupon_id);

  return jsonb_build_object('prize', v_prize.slug, 'label', v_prize.label, 'legend', v_prize.legend,
    'terms', v_prize.terms, 'code', v_code, 'expires_at', v_expires, 'min_order', v_prize.min_order, 'used', false);
end $$;

revoke execute on function public.wheel_status(), public.spin_welcome_wheel() from public, anon;
grant execute on function public.wheel_status() to anon, authenticated;
grant execute on function public.spin_welcome_wheel() to authenticated;

-- ---------------------------------------------------------------------
-- Correo con el premio
-- ---------------------------------------------------------------------
alter table public.email_outbox drop constraint if exists email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'pedido_confirmado', 'pedido_estado', 'producto_revisado',
  'bienvenida', 'pago_rechazado', 'pedido_embajador', 'pedido_admin',
  'solicitud_recibida', 'solicitud_admin', 'solicitud_rechazada', 'premio_ruleta'));

create or replace function public.enqueue_wheel_email()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  select email::text into v_email from public.profiles where id = new.user_id;
  if v_email is null then return new; end if;
  insert into public.email_outbox (kind, to_email, ref_id, dedupe_key)
  values ('premio_ruleta', v_email, new.user_id, 'premio_ruleta:' || new.user_id)
  on conflict (dedupe_key) do nothing;
  return new;
end $$;

create trigger wheel_spins_enqueue_email after insert on public.wheel_spins
  for each row execute function public.enqueue_wheel_email();

-- ---------------------------------------------------------------------
-- Checkout: tipos nuevos, cupón personal y premio aplicado solo
-- (misma función de 20261125000100 con esos cambios)
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
  v_auto boolean := false;       -- cupón tomado solo (premio de la ruleta), no escrito por el cliente
  v_applied boolean := false;    -- el cupón quedó aplicado (también cuando solo da envío gratis)
  v_free_ship boolean := false;
  v_unit integer;
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

  -- Premio de la ruleta: si el cliente no escribió un cupón, se usa el suyo (personal y sin usar).
  if v_code is null and p_user_id is not null then
    select c.code::text into v_code from public.coupons c
    where c.owner_user_id = p_user_id and c.is_active
      and (c.expires_at is null or c.expires_at > now())
      and c.uses < coalesce(c.max_uses, 2147483647)
      and not exists (select 1 from public.coupon_redemptions cr where cr.coupon_id = c.id)
    order by c.created_at desc limit 1;
    v_auto := v_code is not null;
  end if;

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
    elsif v_coupon.owner_user_id is not null and v_coupon.owner_user_id is distinct from p_user_id then
      v_coupon_msg := 'Este cupón es personal: entra con la cuenta que lo ganó.';
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
    elsif v_coupon.type::text = 'envio_gratis' then
      v_free_ship := true;
    elsif v_coupon.type::text = 'dos_por_uno' then
      -- 2x1 en alimentos: con 2 o más unidades de categorías de consumo, la de menor precio sale gratis
      -- (productos sueltos, no dentro de kits; value = tope del descuento).
      select min(l.unit_price) into v_unit
      from pg_temp._co_lines l
      join public.products pr on pr.id = l.product_id
      join public.categories c on c.id = pr.category_id
      where l.kit_id is null and c.is_consumable
      having sum(l.quantity) >= 2;
      if v_unit is null then
        v_coupon_msg := 'Tu 2x1 aplica cuando llevas al menos 2 productos de alimentos (fuera de kits).';
      else
        v_disc := least(v_unit, v_coupon.value, v_sub);
      end if;
    elsif v_coupon.type::text = 'articulo_gratis' then
      -- El producto suelto de menor precio sale gratis (value = tope del descuento).
      select min(l.unit_price) into v_unit from pg_temp._co_lines l where l.kit_id is null;
      if v_unit is null then
        v_coupon_msg := 'Tu artículo gratis aplica sobre productos sueltos, no dentro de kits.';
      else
        v_disc := least(v_unit, v_coupon.value, v_sub);
      end if;
    else
      v_disc := case when v_coupon.type::text = 'porcentaje' then round(v_sub * v_coupon.value / 100.0)::int
                     else least(v_coupon.value, v_sub) end;
    end if;
    v_applied := v_coupon_msg is null;
    if not v_applied then
      v_disc := 0;
      v_free_ship := false;
      -- El premio automático nunca bloquea la compra: solo se informa.
      if not v_auto then
        v_problems := v_problems || jsonb_build_object('type', 'coupon', 'message', v_coupon_msg);
      end if;
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

  if v_free_ship then v_ship := 0; end if;

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
      'coupon', case when v_code is not null then jsonb_build_object('code', upper(v_code), 'ok', v_applied,
                  'message', coalesce(v_coupon_msg, 'Cupón aplicado'), 'discount', v_disc,
                  'auto', v_auto, 'free_shipping', v_free_ship and v_applied, 'description', v_coupon.description) end,
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
    case when v_applied then v_coupon.id end, case when v_applied then v_coupon.code::text end,
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

