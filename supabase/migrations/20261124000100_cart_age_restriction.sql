-- =====================================================================
-- Mercado Origen · Fase 2 · Carrito persistente y productos +18
-- =====================================================================

-- ---------------------------------------------------------------------
-- Carrito del usuario con sesión (el invitado usa localStorage; al
-- iniciar sesión se fusionan).
-- ---------------------------------------------------------------------
create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,   -- presentación elegida (opcional)
  kit_id     uuid references public.kits (id) on delete cascade,
  quantity   integer not null check (quantity between 1 and 99),
  updated_at timestamptz not null default now(),
  check ((product_id is null) <> (kit_id is null)),     -- o producto o kit
  check (variant_id is null or product_id is not null)  -- la variante va con su producto
);
create unique index cart_items_product_uq on public.cart_items (user_id, product_id) where product_id is not null and variant_id is null;
create unique index cart_items_variant_uq on public.cart_items (user_id, variant_id) where variant_id is not null;
create unique index cart_items_kit_uq on public.cart_items (user_id, kit_id) where kit_id is not null;
create trigger cart_items_updated before update on public.cart_items
  for each row execute function public.set_updated_at();

alter table public.cart_items enable row level security;
create policy "admin: todo" on public.cart_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "propio: todo" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.cart_items to authenticated, service_role;

-- Fusiona el carrito del invitado con el guardado: por cada item queda la
-- cantidad mayor (así iniciar sesión varias veces no duplica unidades).
-- p_items: [{"product_id": "..."} | {"variant_id": "..."} | {"kit_id": "..."}, con "quantity"]
create or replace function public.merge_cart(p_items jsonb)
returns setof public.cart_items language plpgsql security definer
set search_path = ''
as $$
declare it jsonb;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para guardar tu carrito.' using errcode = '42501';
  end if;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if (it ->> 'variant_id') is not null then
      insert into public.cart_items (user_id, product_id, variant_id, quantity)
      select auth.uid(), v.product_id, v.id, least(greatest((it ->> 'quantity')::int, 1), 99)
      from public.product_variants v join public.products p on p.id = v.product_id
      where v.id = (it ->> 'variant_id')::uuid and v.is_active and p.status = 'aprobado'
      on conflict (user_id, variant_id) where variant_id is not null
      do update set quantity = greatest(public.cart_items.quantity, excluded.quantity);
    elsif (it ->> 'product_id') is not null then
      insert into public.cart_items (user_id, product_id, quantity)
      select auth.uid(), p.id, least(greatest((it ->> 'quantity')::int, 1), 99)
      from public.products p where p.id = (it ->> 'product_id')::uuid and p.status = 'aprobado'
      on conflict (user_id, product_id) where product_id is not null and variant_id is null
      do update set quantity = greatest(public.cart_items.quantity, excluded.quantity);
    elsif (it ->> 'kit_id') is not null then
      insert into public.cart_items (user_id, kit_id, quantity)
      select auth.uid(), k.id, least(greatest((it ->> 'quantity')::int, 1), 99)
      from public.kits k where k.id = (it ->> 'kit_id')::uuid and k.is_active
      on conflict (user_id, kit_id) where kit_id is not null
      do update set quantity = greatest(public.cart_items.quantity, excluded.quantity);
    end if;
  end loop;
  return query select * from public.cart_items where user_id = auth.uid() order by updated_at;
end $$;

revoke execute on function public.merge_cart(jsonb) from public, anon;
grant execute on function public.merge_cart(jsonb) to authenticated;

-- Fija la cantidad exacta de un item (0 = quitarlo). La usa el carrito al cambiar cantidades.
create or replace function public.set_cart_item(p_product_id uuid, p_kit_id uuid, p_quantity integer, p_variant_id uuid default null)
returns void language plpgsql security definer
set search_path = ''
as $$
declare v_product uuid := p_product_id;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para guardar tu carrito.' using errcode = '42501';
  end if;
  if p_variant_id is not null then
    select product_id into v_product from public.product_variants where id = p_variant_id;
  end if;
  if (v_product is null) = (p_kit_id is null) then
    raise exception 'Indica un producto o un kit.' using errcode = '22023';
  end if;
  if coalesce(p_quantity, 0) <= 0 then
    delete from public.cart_items
    where user_id = auth.uid()
      and product_id is not distinct from v_product
      and variant_id is not distinct from p_variant_id
      and kit_id is not distinct from p_kit_id;
    return;
  end if;
  if p_variant_id is not null then
    insert into public.cart_items (user_id, product_id, variant_id, quantity) values (auth.uid(), v_product, p_variant_id, least(p_quantity, 99))
    on conflict (user_id, variant_id) where variant_id is not null do update set quantity = excluded.quantity;
  elsif v_product is not null then
    insert into public.cart_items (user_id, product_id, quantity) values (auth.uid(), v_product, least(p_quantity, 99))
    on conflict (user_id, product_id) where product_id is not null and variant_id is null do update set quantity = excluded.quantity;
  else
    insert into public.cart_items (user_id, kit_id, quantity) values (auth.uid(), p_kit_id, least(p_quantity, 99))
    on conflict (user_id, kit_id) where kit_id is not null do update set quantity = excluded.quantity;
  end if;
end $$;

revoke execute on function public.set_cart_item(uuid, uuid, integer, uuid) from public, anon;
grant execute on function public.set_cart_item(uuid, uuid, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Productos +18 (bebidas alcohólicas). Ley 124 de 1994: prohibida la
-- venta a menores. El checkout exige confirmar mayoría de edad.
-- ---------------------------------------------------------------------
alter table public.products add column is_age_restricted boolean not null default false;
alter table public.orders add column age_confirmed_at timestamptz;

-- El embajador puede marcar su producto como +18, pero quitar la marca es
-- decisión de Mercado Origen.
create or replace function public.guard_age_restriction()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if old.is_age_restricted and not new.is_age_restricted and not public.is_privileged() then
    raise exception 'Solo Mercado Origen puede quitar la restricción +18 de un producto.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger products_guard_age before update of is_age_restricted on public.products
  for each row execute function public.guard_age_restriction();

-- La vista de kits avisa si alguno de sus productos es +18.
create or replace view public.kit_summaries with (security_invoker = true) as
select
  k.id as kit_id,
  count(ki.product_id)::int                                         as items_count,
  coalesce(sum(p.price * ki.quantity), 0)::int                       as separate_price,
  greatest(coalesce(sum(p.price * ki.quantity), 0) - k.price, 0)::int as savings,
  count(distinct p.ambassador_id)::int                               as ambassadors_count,
  count(distinct a.municipality_id)::int                             as municipalities_count,
  coalesce(bool_and(p.id is not null and p.status = 'aprobado' and p.stock >= ki.quantity), false) as is_available,
  coalesce(bool_or(p.is_age_restricted), false)                      as is_age_restricted
from public.kits k
left join public.kit_items ki on ki.kit_id = k.id
left join public.products p on p.id = ki.product_id
left join public.ambassadors a on a.id = p.ambassador_id
group by k.id, k.price;

grant select on public.kit_summaries to anon, authenticated, service_role;
