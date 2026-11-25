-- =====================================================================
-- Mercado Origen · 0500 · Interacción (deseos, reseñas, eventos) y
-- contenido editable (FAQ, ajustes del sitio, envíos, boletín).
-- =====================================================================

create table public.wishlists (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  price_at_add integer,                           -- para avisar "bajó de precio"
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlists_product_idx on public.wishlists (product_id);

create or replace function public.wishlists_price_snapshot()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  select price into new.price_at_add from public.products where id = new.product_id;
  return new;
end $$;

create trigger wishlists_price_snapshot before insert on public.wishlists
  for each row execute function public.wishlists_price_snapshot();

-- ---------------------------------------------------------------------
-- Reseñas: solo quien recibió el producto (pedido entregado), una por item.
-- ---------------------------------------------------------------------
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  ambassador_id uuid not null references public.ambassadors (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  order_item_id uuid not null unique references public.order_items (id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  comment       text check (char_length(comment) <= 2000),
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id, created_at desc) where is_visible;
create index reviews_ambassador_idx on public.reviews (ambassador_id, created_at desc) where is_visible;
create index reviews_user_idx on public.reviews (user_id);
create trigger reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

-- ¿El usuario actual recibió este item? (lo usa la política de inserción)
create or replace function public.can_review_item(p_order_item_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = p_order_item_id
      and o.user_id = auth.uid()
      and o.status = 'entregado'
      and oi.product_id is not null
  )
$$;

-- Producto y embajador salen del item comprado, nunca del cliente.
create or replace function public.reviews_fill()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  select oi.product_id, oi.ambassador_id into new.product_id, new.ambassador_id
  from public.order_items oi where oi.id = new.order_item_id;
  if new.product_id is null then
    raise exception 'Este producto ya no está disponible para reseñas.';
  end if;
  if tg_op = 'UPDATE' and not public.is_privileged() then
    new.is_visible := old.is_visible;           -- moderar es tarea del admin
    new.user_id := old.user_id;
  end if;
  return new;
end $$;

create trigger reviews_fill before insert or update on public.reviews
  for each row execute function public.reviews_fill();

-- Promedios de producto y embajador (solo reseñas visibles).
create or replace function public.reviews_recalc()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_products uuid[] := array_remove(array[new.product_id, old.product_id], null);
  v_ambs uuid[] := array_remove(array[new.ambassador_id, old.ambassador_id], null);
  v_prev text := coalesce(current_setting('app.trusted', true), '');
begin
  perform set_config('app.trusted', 'on', true);

  update public.products p set
    rating_avg = coalesce(s.avg, 0), rating_count = coalesce(s.cnt, 0)
  from (
    select pid, (select round(avg(rating)::numeric, 2) from public.reviews where product_id = pid and is_visible) as avg,
                (select count(*) from public.reviews where product_id = pid and is_visible)::int as cnt
    from unnest(v_products) as pid
  ) s
  where p.id = s.pid;

  update public.ambassadors a set
    rating_avg = coalesce(s.avg, 0), rating_count = coalesce(s.cnt, 0)
  from (
    select aid, (select round(avg(rating)::numeric, 2) from public.reviews where ambassador_id = aid and is_visible) as avg,
                (select count(*) from public.reviews where ambassador_id = aid and is_visible)::int as cnt
    from unnest(v_ambs) as aid
  ) s
  where a.id = s.aid;

  perform set_config('app.trusted', v_prev, true);
  return null;
end $$;

create trigger reviews_recalc after insert or update of rating, is_visible or delete on public.reviews
  for each row execute function public.reviews_recalc();

create trigger audit_reviews after update or delete on public.reviews
  for each row execute function public.audit_admin_changes();

-- ---------------------------------------------------------------------
-- Eventos para recomendaciones (los invitados se identifican por session_id)
-- ---------------------------------------------------------------------
create table public.product_events (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles (id) on delete cascade,
  session_id text check (char_length(session_id) <= 64),
  product_id uuid not null references public.products (id) on delete cascade,
  event      public.product_event_type not null,
  created_at timestamptz not null default now(),
  check (user_id is not null or session_id is not null)
);
create index product_events_user_idx on public.product_events (user_id, created_at desc) where user_id is not null;
create index product_events_session_idx on public.product_events (session_id, created_at desc) where session_id is not null;
create index product_events_product_idx on public.product_events (product_id, event, created_at desc);

-- ---------------------------------------------------------------------
-- Boletín (Ley 1581: se guarda el momento del consentimiento)
-- ---------------------------------------------------------------------
create table public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           extensions.citext not null unique,
  source          text not null default 'home',
  consent_at      timestamptz not null default now(),
  coupon_id       uuid references public.coupons (id) on delete set null,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);
create index newsletter_created_idx on public.newsletter_subscribers (created_at desc);

-- Suscribirse sin revelar si el correo ya existía.
create or replace function public.subscribe_newsletter(p_email text, p_source text default 'home')
returns boolean language plpgsql security definer
set search_path = ''
as $$
begin
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(p_email) > 254 then
    raise exception 'Escribe un correo válido.' using errcode = '22023';
  end if;
  insert into public.newsletter_subscribers (email, source)
  values (lower(trim(p_email)), left(coalesce(p_source, 'home'), 40))
  on conflict (email) do update set unsubscribed_at = null, consent_at = now();
  return true;
end $$;

-- ---------------------------------------------------------------------
-- Envíos (una sola fila)
-- ---------------------------------------------------------------------
create table public.shipping_settings (
  id                      boolean primary key default true check (id),
  free_shipping_threshold integer not null default 150000,
  flat_rate               integer,                 -- tarifa general mientras se configura la transportadora
  base_rates              jsonb not null default '{}'::jsonb,   -- {"Bogotá": 12000, …} por ciudad o zona
  updated_at              timestamptz not null default now()
);
create trigger shipping_settings_updated before update on public.shipping_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Contenido editable desde /admin
-- ---------------------------------------------------------------------
create table public.faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  sort_order smallint not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger faqs_updated before update on public.faqs
  for each row execute function public.set_updated_at();

create table public.site_settings (
  key        text primary key,                    -- 'hero', 'announcements', 'contact', 'welcome_coupon'
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

create trigger audit_faqs after insert or update or delete on public.faqs
  for each row execute function public.audit_admin_changes();
create trigger audit_site_settings after insert or update or delete on public.site_settings
  for each row execute function public.audit_admin_changes();
create trigger audit_shipping_settings after insert or update or delete on public.shipping_settings
  for each row execute function public.audit_admin_changes();
