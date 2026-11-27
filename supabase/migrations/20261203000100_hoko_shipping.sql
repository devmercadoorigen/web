-- =====================================================================
-- Mercado Origen · Envíos con Hoko
--  · El costo del envío sale de la cotización de Hoko (POST /member/stock/quotation).
--    La Edge Function shipping-quote cotiza (con caché) y guarda el resultado en
--    shipping_quotes; checkout_build solo acepta una cotización que coincida con
--    la ciudad, el peso del paquete y el valor declarado que él mismo recalcula.
--  · hoko_cities: copia local de las ciudades de Hoko, para encontrar el city_to
--    a partir de lo que escribe el cliente sin llamar a Hoko en cada tecla.
--  · shipping_settings.provider: 'tarifas' (como antes) u 'hoko'.
--  · Si Hoko no responde, se usa la tarifa por ciudad, departamento o general.
-- =====================================================================

alter table public.shipping_settings
  add column if not exists provider text not null default 'tarifas' check (provider in ('tarifas', 'hoko')),
  add column if not exists hoko_stock_id integer check (hoko_stock_id is null or hoko_stock_id > 0),
  add column if not exists hoko_extra integer not null default 0 check (hoko_extra >= 0),          -- COP sumados al flete (empaque, manejo)
  add column if not exists box_weight_g integer not null default 300 check (box_weight_g >= 0),   -- caja y relleno
  add column if not exists default_item_weight_g integer not null default 500 check (default_item_weight_g > 0); -- producto sin peso registrado

-- "Bogotá, D.C." -> "bogota d c"; "Barrancabermeja (Santander)" -> "barrancabermeja"
create or replace function public.place_key(txt text)
returns text language sql immutable parallel safe
set search_path = ''
as $$
  select trim(regexp_replace(lower(public.f_unaccent(regexp_replace(coalesce(txt, ''), '\(.*\)', '', 'g'))), '[^a-z0-9]+', ' ', 'g'))
$$;

-- Clave de dirección con la que se liga una cotización a la ciudad del pedido.
create or replace function public.shipping_address_key(p_city text, p_department text)
returns text language sql immutable parallel safe
set search_path = ''
as $$ select public.place_key(p_city) || '|' || public.place_key(p_department) $$;

-- Número dentro de un jsonb ({"weight_g": 60}); null si no es un número.
create or replace function public.jnum(j jsonb, k text)
returns numeric language sql immutable parallel safe
set search_path = ''
as $$ select case when j ->> k ~ '^\s*\d+(\.\d+)?\s*$' then (j ->> k)::numeric end $$;

-- ---------------------------------------------------------------------
-- Ciudades de Hoko
-- ---------------------------------------------------------------------
create table public.hoko_cities (
  id              integer primary key,            -- city_to de la cotización
  name            text not null,
  department_id   integer,
  department_name text,
  name_key        text generated always as (public.place_key(name)) stored,
  department_key  text generated always as (public.place_key(department_name)) stored,
  updated_at      timestamptz not null default now()
);
create index hoko_cities_name_idx on public.hoko_cities (name_key);
create index hoko_cities_dep_idx on public.hoko_cities (department_key);

-- ¿El departamento de Hoko corresponde al que eligió el cliente?
-- ("San Andrés y Providencia" ~ "Archipiélago de San Andrés…", "Bogotá D.C." ~ "Bogotá")
create or replace function public.place_dep_match(p_hoko text, p_input text)
returns boolean language sql immutable parallel safe
set search_path = ''
as $$
  select p_input <> '' and coalesce(p_hoko, '') <> '' and (
    p_hoko = p_input or position(p_input in p_hoko) > 0 or position(p_hoko in p_input) > 0
    or split_part(p_hoko, ' ', 1) = split_part(p_input, ' ', 1))
$$;

-- Ciudad de Hoko para lo que escribió el cliente (null si no hay una coincidencia clara).
create or replace function public.hoko_find_city(p_city text, p_department text)
returns integer language plpgsql stable
set search_path = ''
as $$
declare
  v_c text := public.place_key(p_city);
  v_d text := public.place_key(p_department);
  v_ids integer[];
begin
  if v_c = '' then return null; end if;
  -- 1. Mismo nombre dentro del departamento.
  select array_agg(h.id) into v_ids from public.hoko_cities h
  where h.name_key = v_c and public.place_dep_match(h.department_key, v_d);
  if cardinality(v_ids) = 1 then return v_ids[1]; end if;
  -- 2. Bogotá: Hoko puede tenerla como "Bogotá D.C." y en otro departamento.
  if v_c like 'bogota%' or v_d like 'bogota%' then
    select array_agg(h.id order by h.id) into v_ids from public.hoko_cities h where h.name_key like 'bogota%';
    if cardinality(v_ids) >= 1 then return v_ids[1]; end if;
  end if;
  -- 3. Nombre exacto, único en el país.
  select array_agg(h.id) into v_ids from public.hoko_cities h where h.name_key = v_c;
  if cardinality(v_ids) = 1 then return v_ids[1]; end if;
  -- 4. El nombre de Hoko empieza por lo escrito ("Cartagena" -> "Cartagena de Indias"), único en el departamento.
  select array_agg(h.id) into v_ids from public.hoko_cities h
  where h.name_key like v_c || ' %' and public.place_dep_match(h.department_key, v_d);
  if cardinality(v_ids) = 1 then return v_ids[1]; end if;
  return null;
end $$;

-- Ciudades de un departamento para sugerir en el formulario de dirección.
create or replace function public.hoko_city_options(p_department text)
returns setof text language sql stable security definer
set search_path = ''
as $$
  select h.name from public.hoko_cities h
  where public.place_dep_match(h.department_key, public.place_key(p_department))
     or (public.place_key(p_department) like 'bogota%' and h.name_key like 'bogota%')
  group by h.name order by h.name limit 400
$$;

-- ---------------------------------------------------------------------
-- Cotizaciones (las escribe solo la Edge Function con service_role)
-- ---------------------------------------------------------------------
create table public.shipping_quotes (
  id             uuid primary key default gen_random_uuid(),
  source         text not null check (source in ('hoko', 'tarifa')),
  address_key    text not null,                -- shipping_address_key(ciudad, departamento)
  city_id        integer,                      -- ciudad de Hoko
  weight_g       integer not null,             -- peso de los productos, como lo calcula checkout_build
  declared_value integer not null,
  package        jsonb not null default '{}'::jsonb,   -- {weight, length, width, height} enviado a Hoko
  freight        integer not null check (freight >= 0),  -- lo que cobra la transportadora
  charge         integer not null check (charge >= 0),   -- lo que paga el cliente (flete + extra, redondeado)
  courier_id     integer,
  courier_name   text,
  days           text,
  payment        smallint,
  options        jsonb,                        -- todas las transportadoras que devolvió Hoko
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);
create index shipping_quotes_lookup_idx on public.shipping_quotes (address_key, weight_g, declared_value, expires_at desc);

-- Sesión con Hoko (token Bearer), compartida entre las Edge Functions.
create table public.hoko_session (
  id         boolean primary key default true check (id),
  token      text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists shipping_quote_id uuid references public.shipping_quotes (id) on delete set null;

alter table public.hoko_cities enable row level security;
alter table public.shipping_quotes enable row level security;
alter table public.hoko_session enable row level security;
create policy "publico: leer" on public.hoko_cities for select to anon, authenticated using (true);
create policy "admin: leer" on public.shipping_quotes for select to authenticated using (public.is_admin());
grant select on public.hoko_cities to anon, authenticated;
grant select on public.shipping_quotes to authenticated;
revoke all on public.hoko_session from anon, authenticated;
revoke insert, update, delete, truncate on public.hoko_cities, public.shipping_quotes from anon, authenticated;
grant select, insert, update, delete on public.hoko_cities, public.shipping_quotes, public.hoko_session to service_role;

revoke execute on function public.hoko_find_city(text, text) from public, anon, authenticated;
grant execute on function public.hoko_find_city(text, text) to service_role;
grant execute on function public.hoko_city_options(text) to anon, authenticated;

-- Tarifa propia (por ciudad, departamento o general) cuando Hoko no responde.
create or replace function public.shipping_fallback_rate(p_city text, p_department text)
returns integer language sql stable
set search_path = ''
as $$
  select coalesce((s.base_rates ->> p_city)::int, (s.base_rates ->> p_department)::int, s.flat_rate)
  from public.shipping_settings s limit 1
$$;
revoke execute on function public.shipping_fallback_rate(text, text) from public, anon, authenticated;
grant execute on function public.shipping_fallback_rate(text, text) to service_role;

-- Cotizaciones vencidas: se borran a diario (las que quedaron en un pedido se conservan).
select cron.schedule('mo-shipping-quotes-cleanup', '17 4 * * *',
  $$delete from public.shipping_quotes q where q.expires_at < now() - interval '2 days'
    and not exists (select 1 from public.orders o where o.shipping_quote_id = q.id)$$);

-- ---------------------------------------------------------------------
-- Checkout: misma función de 20261202000100_welcome_wheel con el envío de Hoko
-- (cambios marcados con «Hoko»). Si cambias checkout_build, cámbialo AQUÍ.
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
  -- Hoko
  v_q public.shipping_quotes%rowtype;
  v_ship_pending boolean := false;   -- falta la cotización de la transportadora (aún no hay ciudad o no se pudo cotizar)
  v_pkg_w integer := 0;              -- peso de los productos (g)
  v_pkg_v integer := 0;              -- volumen de los productos (cm3)
  v_decl integer;
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

  -- Hoko: paquete (peso y volumen de la presentación, del producto o el valor por defecto).
  select * into v_set from public.shipping_settings limit 1;
  select coalesce(sum(l.quantity * coalesce(public.jnum(v.attributes, 'weight_g'), public.jnum(pr.package, 'weight_g'),
                                            pr.weight_grams, v_set.default_item_weight_g, 500)), 0)::int,
         coalesce(sum(l.quantity * coalesce(
           public.jnum(v.attributes, 'height_cm') * public.jnum(v.attributes, 'width_cm') * public.jnum(v.attributes, 'depth_cm'),
           public.jnum(pr.package, 'height_cm') * public.jnum(pr.package, 'width_cm') * public.jnum(pr.package, 'depth_cm'),
           -- sin medidas: ~2 cm3 por gramo
           2 * coalesce(public.jnum(v.attributes, 'weight_g'), public.jnum(pr.package, 'weight_g'), pr.weight_grams, v_set.default_item_weight_g, 500))), 0)::int
    into v_pkg_w, v_pkg_v
  from pg_temp._co_lines l
  join public.products pr on pr.id = l.product_id
  left join public.product_variants v on v.id = l.variant_id;

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

  -- Envío: gratis desde el umbral o con cupón de envío gratis.
  -- Hoko: la cotización guardada por shipping-quote, solo si es de esta misma ciudad,
  -- este mismo paquete y este mismo valor declarado. Si no: tarifa por ciudad, departamento o general.
  if v_sub >= coalesce(v_set.free_shipping_threshold, 150000) or v_free_ship then
    v_ship := 0;
  elsif coalesce(v_set.provider, 'tarifas') = 'hoko' then
    v_decl := greatest(v_sub - v_disc, 10000);
    select * into v_q from public.shipping_quotes q
    where q.id = case when p ->> 'shipping_quote_id' ~ '^[0-9a-fA-F-]{36}$' then (p ->> 'shipping_quote_id')::uuid end
      and q.expires_at > now()
      and q.address_key = public.shipping_address_key(v_addr ->> 'city', v_addr ->> 'department')
      and q.weight_g = v_pkg_w and q.declared_value = v_decl;
    if found then
      v_ship := v_q.charge;
    else
      v_ship := 0;
      v_ship_pending := true;
    end if;
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
      'coupon', case when v_code is not null then jsonb_build_object('code', upper(v_code), 'ok', v_applied,
                  'message', coalesce(v_coupon_msg, 'Cupón aplicado'), 'discount', v_disc,
                  'auto', v_auto, 'free_shipping', v_free_ship and v_applied, 'description', v_coupon.description) end,
      'age_required', v_age, 'problems', v_problems,
      -- Hoko
      'shipping_pending', v_ship_pending,
      'shipping_quote_id', v_q.id,
      'shipping_info', case when v_q.id is not null then jsonb_build_object(
                         'source', v_q.source, 'courier', v_q.courier_name, 'days', v_q.days) end,
      'package', jsonb_build_object('weight_g', v_pkg_w, 'volume_cm3', v_pkg_v, 'declared_value', greatest(v_sub - v_disc, 10000)));
  end if;

  -- ------------------------- Crear el pedido -------------------------
  -- Hoko: sin cotización válida no se crea el pedido (create-order cotiza antes de llamar aquí).
  if v_ship_pending then
    v_problems := v_problems || jsonb_build_object('type', 'shipping',
      'message', 'No pudimos calcular el envío a tu ciudad. Revisa la ciudad y el departamento, o escríbenos por WhatsApp.');
  end if;
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
                             subtotal, discount, shipping, total, coupon_id, coupon_code, customer_notes, age_confirmed_at,
                             shipping_quote_id)
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
    case when v_age then now() end,
    v_q.id)
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

