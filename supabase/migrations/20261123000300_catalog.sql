-- =====================================================================
-- Mercado Origen · 0300 · Catálogo: categorías, productos, variantes,
-- imágenes, kits y solicitudes "Quiero ser embajador".
-- =====================================================================

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          text not null unique,
  code          char(3) not null unique check (code ~ '^[A-Z]{3}$'),   -- prefijo del SKU
  tagline       text,                               -- "De mesa, en barra y en bolitas"
  image_url     text,
  color         text,                               -- color de acento de la categoría
  tile          text not null default 'mini' check (tile in ('big', 'sq', 'wide', 'mini')),  -- forma en el mosaico del home
  tint          text,                               -- fondo de las tarjetas compactas
  is_consumable boolean not null default false,     -- recompra habitual (café, chocolate, miel) para recomendaciones
  is_active     boolean not null default true,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

create table public.ambassador_applications (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null check (char_length(name) between 2 and 120),
  email                   extensions.citext not null,
  phone                   text not null,
  brand_name              text,
  municipality_id         uuid references public.municipalities (id) on delete set null,
  category_id             uuid references public.categories (id) on delete set null,
  description             text check (char_length(description) <= 3000),
  status                  public.application_status not null default 'nueva',
  data_policy_accepted_at timestamptz not null,
  admin_notes             text,
  reviewed_by             uuid references public.profiles (id) on delete set null,
  reviewed_at             timestamptz,
  ambassador_id           uuid references public.ambassadors (id) on delete set null,  -- al aprobarse
  created_at              timestamptz not null default now()
);
create index ambassador_applications_status_idx on public.ambassador_applications (status, created_at desc);

-- ---------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  ambassador_id     uuid not null references public.ambassadors (id) on delete restrict,
  category_id       uuid not null references public.categories (id) on delete restrict,
  sku               text not null unique,           -- CHO-EM0004-00001, lo genera el trigger
  name              text not null check (char_length(name) between 3 and 160),
  slug              text not null unique,
  short_description text check (char_length(short_description) <= 280),
  description       text,
  price             integer not null check (price > 0),                 -- COP sin decimales
  compare_at_price  integer check (compare_at_price is null or compare_at_price > price),
  stock             integer not null default 0 check (stock >= 0),
  weight_grams      integer check (weight_grams is null or weight_grams > 0),
  badges            text[] not null default '{}',   -- 'Ganador FICCA 2024', 'Más vendido'…
  mockup            jsonb,                          -- {art, colors}: empaque SVG mientras no hay foto
  status            public.product_status not null default 'borrador',
  rejection_reason  text,
  is_featured       boolean not null default false,
  views_count       integer not null default 0,
  sales_count       integer not null default 0,
  rating_avg        numeric(3, 2) not null default 0,
  rating_count      integer not null default 0,
  approved_at       timestamptz,
  approved_by       uuid references public.profiles (id) on delete set null,
  search_vector     tsvector,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_ambassador_idx on public.products (ambassador_id, status);
create index products_category_idx on public.products (category_id, status);
create index products_status_idx on public.products (status, created_at desc);
create index products_featured_idx on public.products (is_featured) where is_featured;
create index products_sales_idx on public.products (sales_count desc) where status = 'aprobado';
create index products_search_idx on public.products using gin (search_vector);
create index products_sku_trgm on public.products using gin (sku extensions.gin_trgm_ops);
create index products_name_trgm on public.products using gin (public.f_unaccent(lower(name)) extensions.gin_trgm_ops);
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url        text not null,
  thumb_url  text,
  alt        text,
  width      integer,
  height     integer,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  sku_suffix     text not null check (sku_suffix ~ '^[A-Za-z0-9]{1,12}$'),  -- '1KG'
  sku            text not null unique,              -- CHO-EM0004-00001-1KG
  name           text not null,                     -- '1 kg / bolitas'
  attributes     jsonb not null default '{}'::jsonb,
  price_override integer check (price_override is null or price_override > 0),
  stock          integer not null default 0 check (stock >= 0),
  is_active      boolean not null default true,
  sort_order     smallint not null default 0,
  created_at     timestamptz not null default now(),
  unique (product_id, sku_suffix)
);
create index product_variants_product_idx on public.product_variants (product_id);

-- SKU {CAT}-{EMB}-{SEQ}: el consecutivo es por embajador y lo asigna la base.
-- Lo que envíe el cliente se ignora.
create or replace function public.products_before_insert()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_cat text;
  v_amb text;
begin
  select code into v_cat from public.categories where id = new.category_id;
  select code into v_amb from public.ambassadors where id = new.ambassador_id;
  if v_cat is null or v_amb is null then
    raise exception 'Categoría o embajador inválido.' using errcode = '23503';
  end if;
  new.sku := v_cat || '-' || v_amb || '-' || lpad(public.next_counter('PRODUCT:' || v_amb)::text, 5, '0');

  new.slug := coalesce(nullif(new.slug, ''), public.slugify(new.name));
  if exists (select 1 from public.products where slug = new.slug) then
    new.slug := new.slug || '-' || lower(right(new.sku, 5)) || lower(v_amb);
  end if;

  if not public.is_privileged() then
    -- Un embajador crea en borrador o lo envía a revisión; nada más.
    if new.status not in ('borrador', 'pendiente') then new.status := 'pendiente'; end if;
    new.is_featured := false;
    new.badges := '{}';
    new.views_count := 0; new.sales_count := 0;
    new.rating_avg := 0;  new.rating_count := 0;
    new.approved_at := null; new.approved_by := null; new.rejection_reason := null;
  elsif new.status = 'aprobado' and new.approved_at is null then
    new.approved_at := now();
    new.approved_by := auth.uid();
  end if;
  return new;
end $$;

create trigger products_before_insert before insert on public.products
  for each row execute function public.products_before_insert();

-- Reglas de edición:
--  · El SKU es inmutable; solo un admin lo regenera (queda en audit_log).
--  · El embajador no aprueba, no destaca, no edita insignias ni métricas.
--  · Si edita nombre, precio, descripción o categoría de un producto
--    aprobado, vuelve a "pendiente".
create or replace function public.products_before_update()
returns trigger language plpgsql
set search_path = ''
as $$
declare
  v_priv boolean := public.is_privileged();
begin
  if new.sku is distinct from old.sku then
    if not v_priv then
      raise exception 'El SKU no se puede modificar.' using errcode = '42501';
    end if;
    perform public.write_audit('sku_changed', 'products', new.id::text,
      jsonb_build_object('de', old.sku, 'a', new.sku));
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

    -- Al reenviar un producto rechazado se limpia el motivo; nunca lo escribe el embajador.
    if new.status = 'pendiente' and old.status = 'rechazado' then
      new.rejection_reason := null;
    else
      new.rejection_reason := old.rejection_reason;
    end if;

    if old.status = 'aprobado' and new.status = 'aprobado' and (
         new.name is distinct from old.name
      or new.price is distinct from old.price
      or new.compare_at_price is distinct from old.compare_at_price
      or new.short_description is distinct from old.short_description
      or new.description is distinct from old.description
      or new.category_id is distinct from old.category_id) then
      new.status := 'pendiente';
    end if;
  end if;

  if new.status = 'aprobado' and old.status is distinct from 'aprobado' then
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

create trigger products_before_update before update on public.products
  for each row execute function public.products_before_update();

-- Texto de búsqueda: nombre (A), embajador y municipio (B), resumen (C), descripción (D).
create or replace function public.products_search_vector()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_brand text;
  v_muni text;
  cfg regconfig := 'public.es_unaccent';
begin
  select a.brand_name, m.name into v_brand, v_muni
  from public.ambassadors a join public.municipalities m on m.id = a.municipality_id
  where a.id = new.ambassador_id;

  new.search_vector :=
       setweight(to_tsvector(cfg, coalesce(new.name, '')), 'A')
    || setweight(to_tsvector(cfg, coalesce(v_brand, '') || ' ' || coalesce(v_muni, '')), 'B')
    || setweight(to_tsvector(cfg, coalesce(new.short_description, '')), 'C')
    || setweight(to_tsvector(cfg, coalesce(new.description, '')), 'D');
  return new;
end $$;

create trigger products_search before insert or update on public.products
  for each row execute function public.products_search_vector();

-- Si cambia el nombre o el municipio del embajador, se recalcula la búsqueda de sus productos.
create or replace function public.ambassadors_refresh_search()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.products set search_vector = null where ambassador_id = new.id;
  return new;
end $$;

create trigger ambassadors_refresh_search after update of brand_name, municipality_id on public.ambassadors
  for each row execute function public.ambassadors_refresh_search();

-- Admin: regenerar el SKU de un producto (p. ej. tras cambiar de categoría).
create or replace function public.admin_regenerate_sku(p_product_id uuid)
returns text language plpgsql security definer
set search_path = ''
as $$
declare
  v_new text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede regenerar el SKU.' using errcode = '42501';
  end if;
  select c.code || '-' || a.code || '-' || lpad(public.next_counter('PRODUCT:' || a.code)::text, 5, '0')
    into v_new
  from public.products p
  join public.categories c on c.id = p.category_id
  join public.ambassadors a on a.id = p.ambassador_id
  where p.id = p_product_id;
  if v_new is null then raise exception 'Producto no encontrado.'; end if;

  update public.products set sku = v_new where id = p_product_id;   -- el trigger lo registra en audit_log
  update public.product_variants set sku = v_new || '-' || upper(sku_suffix) where product_id = p_product_id;
  return v_new;
end $$;

-- Variantes: SKU = SKU base + sufijo.
create or replace function public.product_variants_sku()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  select sku || '-' || upper(new.sku_suffix) into new.sku from public.products where id = new.product_id;
  return new;
end $$;

create trigger product_variants_sku before insert or update of sku_suffix, product_id on public.product_variants
  for each row execute function public.product_variants_sku();

-- Fotos o precios de variante editados por el embajador -> producto a revisión.
create or replace function public.product_children_to_pending()
returns trigger language plpgsql
set search_path = ''
as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
begin
  if public.is_privileged() then return coalesce(new, old); end if;
  if tg_table_name = 'product_variants' and tg_op = 'UPDATE'
     and new.price_override is not distinct from old.price_override
     and new.name is not distinct from old.name then
    return new;   -- cambios solo de stock u orden no requieren revisión
  end if;
  update public.products set status = 'pendiente' where id = v_product and status = 'aprobado';
  return coalesce(new, old);
end $$;

create trigger product_images_to_pending after insert or update or delete on public.product_images
  for each row execute function public.product_children_to_pending();
create trigger product_variants_to_pending after insert or update or delete on public.product_variants
  for each row execute function public.product_children_to_pending();

-- ---------------------------------------------------------------------
-- Kits
-- ---------------------------------------------------------------------
create table public.kits (
  id           uuid primary key default gen_random_uuid(),
  sku          text not null unique,               -- KIT-00001
  slug         text not null unique,
  name         text not null,
  tagline      text,                               -- "3 embajadores · 3 municipios"
  description  text,
  image_url    text,
  mockup       jsonb,                              -- {art, colors} para el abanico del home
  bg_color     text not null default '#0B7A3B',
  fg_color     text not null default '#FFFFFF',
  price        integer not null check (price > 0),
  badge        text,                               -- 'El más regalado'
  is_active    boolean not null default false,
  show_on_home boolean not null default false,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index kits_home_idx on public.kits (show_on_home, sort_order) where is_active;
create trigger kits_updated before update on public.kits
  for each row execute function public.set_updated_at();

create table public.kit_items (
  kit_id     uuid not null references public.kits (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity   smallint not null default 1 check (quantity > 0),
  sort_order smallint not null default 0,
  primary key (kit_id, product_id)
);
create index kit_items_product_idx on public.kit_items (product_id);

create or replace function public.kits_before_insert()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  new.sku := 'KIT-' || lpad(public.next_counter('KIT')::text, 5, '0');
  new.slug := coalesce(nullif(new.slug, ''), public.slugify(new.name));
  return new;
end $$;

create trigger kits_before_insert before insert on public.kits
  for each row execute function public.kits_before_insert();

create or replace function public.guard_kit_sku()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.sku is distinct from old.sku then
    if not public.is_privileged() then
      raise exception 'El SKU no se puede modificar.' using errcode = '42501';
    end if;
    perform public.write_audit('sku_changed', 'kits', new.id::text, jsonb_build_object('de', old.sku, 'a', new.sku));
  end if;
  return new;
end $$;

create trigger kits_guard_sku before update on public.kits
  for each row execute function public.guard_kit_sku();

-- Precio "por separado", ahorro y disponibilidad se calculan, no se guardan.
-- security_invoker: respeta la RLS de quien consulta (un producto no
-- aprobado o agotado hace que el kit no se pueda comprar).
create view public.kit_summaries with (security_invoker = true) as
select
  k.id as kit_id,
  count(ki.product_id)::int                                         as items_count,
  coalesce(sum(p.price * ki.quantity), 0)::int                       as separate_price,
  greatest(coalesce(sum(p.price * ki.quantity), 0) - k.price, 0)::int as savings,
  count(distinct p.ambassador_id)::int                               as ambassadors_count,
  count(distinct a.municipality_id)::int                             as municipalities_count,
  coalesce(bool_and(p.id is not null and p.status = 'aprobado' and p.stock >= ki.quantity), false) as is_available
from public.kits k
left join public.kit_items ki on ki.kit_id = k.id
left join public.products p on p.id = ki.product_id
left join public.ambassadors a on a.id = p.ambassador_id
group by k.id, k.price;

create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_admin_changes();
create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_admin_changes();
create trigger audit_kits after insert or update or delete on public.kits
  for each row execute function public.audit_admin_changes();
create trigger audit_kit_items after insert or update or delete on public.kit_items
  for each row execute function public.audit_admin_changes();
create trigger audit_applications after update or delete on public.ambassador_applications
  for each row execute function public.audit_admin_changes();
