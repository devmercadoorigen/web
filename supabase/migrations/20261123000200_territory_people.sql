-- =====================================================================
-- Mercado Origen · 0200 · Territorio, perfiles, embajadores y auditoría
-- =====================================================================

-- ---------------------------------------------------------------------
-- Territorio
-- ---------------------------------------------------------------------
create table public.subregions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,              -- 'Norte' (la UI muestra "Zona Norte")
  slug         text not null unique,
  landmark     text not null,                     -- 'Desierto de la Tatacoa'
  capital      text,
  altitude     integer,                           -- m.s.n.m. de la capital
  ecosystem    text,
  facts        text[] not null default '{}',      -- chips del capítulo del mapa, tal como se muestran hoy
  description  text,
  image_url    text,
  image_credit text,
  fill_color   text not null default '#0B7A3B',   -- color de la zona en el mapa
  label_color  text not null default '#FFFFFF',   -- color del texto sobre ese color
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.municipalities (
  id           uuid primary key default gen_random_uuid(),
  subregion_id uuid not null references public.subregions (id) on delete restrict,
  name         text not null unique,
  slug         text not null unique,
  map_x        smallint,                          -- posición del punto en el mapa SVG (viewBox 800x810)
  map_y        smallint,
  label_anchor text not null default 'start' check (label_anchor in ('start', 'end')),
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);
create index municipalities_subregion_idx on public.municipalities (subregion_id, sort_order);

-- ---------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  email                   extensions.citext,
  full_name               text,
  avatar_url              text,
  phone                   text,
  role                    public.user_role not null default 'cliente',
  marketing_opt_in        boolean not null default false,
  data_policy_accepted_at timestamptz,             -- Ley 1581 de 2012
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create index profiles_created_idx on public.profiles (created_at desc);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ¿El usuario actual es admin activo? security definer para poder usarlo
-- dentro de las políticas sin recursión de RLS.
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  )
$$;

-- Admin, Edge Functions (service_role), conexión directa (migraciones/seed)
-- o una RPC de confianza que activó app.trusted para su transacción.
-- Se basa en el rol del JWT y no en current_user, porque dentro de una
-- función security definer current_user siempre es el dueño.
create or replace function public.is_privileged()
returns boolean language sql stable
set search_path = ''
as $$
  select public.is_admin()
      or coalesce(auth.role(), '') not in ('anon', 'authenticated')
      or coalesce(current_setting('app.trusted', true), '') = 'on'
$$;

-- Crea el perfil al registrarse. El frontend envía en options.data:
-- full_name, phone, marketing_opt_in y data_policy_accepted (true).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, email, full_name, avatar_url, phone, marketing_opt_in, data_policy_accepted_at)
  values (
    new.id,
    new.email,
    coalesce(meta ->> 'full_name', meta ->> 'name'),
    meta ->> 'avatar_url',
    meta ->> 'phone',
    coalesce((meta ->> 'marketing_opt_in')::boolean, false),
    case when coalesce((meta ->> 'data_policy_accepted')::boolean, false) then now() end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Un usuario edita su perfil, pero nunca su rol ni su estado.
create or replace function public.guard_profile_update()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if public.is_privileged() then return new; end if;
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email then
    raise exception 'No tienes permiso para cambiar el rol, el estado o el correo de la cuenta.'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- Direcciones guardadas
-- ---------------------------------------------------------------------
create table public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  label        text not null default 'Casa',
  recipient    text not null,
  phone        text not null,
  department   text not null,
  city         text not null,
  address_line text not null,
  notes        text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default on public.addresses (user_id) where is_default;
create trigger addresses_updated before update on public.addresses
  for each row execute function public.set_updated_at();

-- Al marcar una dirección como principal, las demás dejan de serlo.
create or replace function public.addresses_single_default()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.is_default then
    update public.addresses set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;

create trigger addresses_default before insert or update of is_default on public.addresses
  for each row when (new.is_default) execute function public.addresses_single_default();

-- ---------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,                       -- insert | update | delete | sku_regenerated | …
  entity     text not null,                       -- nombre de la tabla
  entity_id  text,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

create or replace function public.write_audit(p_action text, p_entity text, p_entity_id text, p_payload jsonb)
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_privileged() then
    raise exception 'Solo Mercado Origen puede escribir en la auditoría.' using errcode = '42501';
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, payload)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_payload);
end $$;

-- Trigger genérico: registra lo que hace un admin. En updates guarda solo
-- los campos que cambiaron; los datos bancarios y de identidad se enmascaran.
create or replace function public.audit_admin_changes()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_payload jsonb;
  v_id text;
  k text;
begin
  if not public.is_admin() then
    return coalesce(new, old);
  end if;

  v_id := coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'ambassador_id', v_old ->> 'ambassador_id', v_new ->> 'key', v_old ->> 'key');

  if tg_op = 'UPDATE' then
    v_payload := '{}'::jsonb;
    for k in select jsonb_object_keys(v_new) loop
      if k not in ('updated_at', 'search_vector') and (v_new -> k) is distinct from (v_old -> k) then
        v_payload := v_payload || jsonb_build_object(k, jsonb_build_object('de', v_old -> k, 'a', v_new -> k));
      end if;
    end loop;
    if v_payload = '{}'::jsonb then return new; end if;
  else
    v_payload := coalesce(v_new, v_old) - 'search_vector';
  end if;

  -- Nunca guardar en claro datos bancarios ni números de identificación.
  foreach k in array array['bank_info', 'id_number'] loop
    if v_payload ? k then v_payload := jsonb_set(v_payload, array[k], '"***"'); end if;
  end loop;

  perform public.write_audit(lower(tg_op), tg_table_name, v_id, v_payload);
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------
-- Embajadores
-- ---------------------------------------------------------------------
create table public.ambassadors (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid unique references public.profiles (id) on delete set null,
  code              text not null unique check (code ~ '^EM[0-9]{4,}$'),   -- EM0001
  slug              text not null unique,
  brand_name        text not null,
  initials          text not null,
  municipality_id   uuid not null references public.municipalities (id) on delete restrict,
  short_description text,
  story_origin      text,                         -- "Inicios"
  story_present     text,                         -- "Presente"
  story_future      text,                         -- "Futuro"
  avatar_url        text,
  banner_url        text,
  instagram         text,
  facebook          text,
  website           text,
  whatsapp          text,                         -- público solo si el embajador lo autoriza
  status            public.ambassador_status not null default 'activo',
  rating_avg        numeric(3, 2) not null default 0,
  rating_count      integer not null default 0,
  sales_count       integer not null default 0,
  joined_at         date not null default ((now() at time zone 'America/Bogota')::date),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index ambassadors_municipality_idx on public.ambassadors (municipality_id);
create index ambassadors_status_idx on public.ambassadors (status);
create index ambassadors_brand_trgm on public.ambassadors using gin (public.f_unaccent(lower(brand_name)) extensions.gin_trgm_ops);
create trigger ambassadors_updated before update on public.ambassadors
  for each row execute function public.set_updated_at();

-- Datos privados: solo el admin (y el propio embajador para leer).
create table public.ambassador_private (
  ambassador_id   uuid primary key references public.ambassadors (id) on delete cascade,
  id_type         text,                           -- Cédula de Ciudadanía | NIT
  id_number       text,
  legal_name      text,                           -- razón social
  email           extensions.citext,
  phone           text,
  commission_rate numeric(5, 2) check (commission_rate between 0 and 100),  -- se acuerda con cada uno
  bank_info       jsonb not null default '{}'::jsonb,
  media_sources   jsonb not null default '{}'::jsonb,  -- enlaces originales (Drive) de logo, fotos y video
  notes           text,
  updated_at      timestamptz not null default now()
);
create trigger ambassador_private_updated before update on public.ambassador_private
  for each row execute function public.set_updated_at();

create table public.ambassador_badges (
  id            uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors (id) on delete cascade,
  label         text not null,                    -- 'FICCA 2024'
  type          text not null default 'premio' check (type in ('premio', 'certificacion', 'programa', 'otro')),
  year          smallint,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);
create index ambassador_badges_amb_idx on public.ambassador_badges (ambassador_id, sort_order);

-- Embajador vinculado a la sesión actual (null si no es embajador).
create or replace function public.my_ambassador_id()
returns uuid language sql stable security definer
set search_path = ''
as $$
  select id from public.ambassadors where profile_id = auth.uid() limit 1
$$;

-- Código, slug e iniciales automáticos.
create or replace function public.ambassadors_defaults()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.code is null then
    new.code := 'EM' || lpad(public.next_counter('AMBASSADOR')::text, 4, '0');
  end if;
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.brand_name);
    if exists (select 1 from public.ambassadors where slug = new.slug) then
      new.slug := new.slug || '-' || lower(new.code);
    end if;
  end if;
  if new.initials is null or new.initials = '' then
    new.initials := public.make_initials(new.brand_name);
  end if;
  return new;
end $$;

create trigger ambassadors_defaults before insert on public.ambassadors
  for each row execute function public.ambassadors_defaults();

-- El embajador edita su vitrina (nombre, foto, historia, redes), pero no
-- su código, municipio, estado, métricas ni la cuenta vinculada.
create or replace function public.guard_ambassador_update()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if public.is_privileged() then return new; end if;
  if new.code is distinct from old.code
     or new.slug is distinct from old.slug
     or new.municipality_id is distinct from old.municipality_id
     or new.status is distinct from old.status
     or new.profile_id is distinct from old.profile_id
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.sales_count is distinct from old.sales_count
     or new.joined_at is distinct from old.joined_at then
    raise exception 'Solo Mercado Origen puede cambiar el municipio, el estado, el código o las métricas del embajador.'
      using errcode = '42501';
  end if;
  if new.brand_name is distinct from old.brand_name then
    new.initials := public.make_initials(new.brand_name);
  end if;
  return new;
end $$;

create trigger ambassadors_guard before update on public.ambassadors
  for each row execute function public.guard_ambassador_update();

create trigger audit_subregions after insert or update or delete on public.subregions
  for each row execute function public.audit_admin_changes();
create trigger audit_municipalities after insert or update or delete on public.municipalities
  for each row execute function public.audit_admin_changes();
create trigger audit_profiles after update or delete on public.profiles
  for each row execute function public.audit_admin_changes();
create trigger audit_ambassadors after insert or update or delete on public.ambassadors
  for each row execute function public.audit_admin_changes();
create trigger audit_ambassador_private after insert or update or delete on public.ambassador_private
  for each row execute function public.audit_admin_changes();
create trigger audit_ambassador_badges after insert or update or delete on public.ambassador_badges
  for each row execute function public.audit_admin_changes();
