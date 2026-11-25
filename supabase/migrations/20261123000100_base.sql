-- =====================================================================
-- Mercado Origen · 0100 · Base: extensiones, búsqueda en español, enums
-- y utilidades compartidas.
-- =====================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists citext   with schema extensions;

-- ---------------------------------------------------------------------
-- Búsqueda en español que ignora tildes ("cafe" encuentra "Café")
-- ---------------------------------------------------------------------
create text search configuration public.es_unaccent (copy = pg_catalog.spanish);
alter text search configuration public.es_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, spanish_stem;

-- unaccent marcado como inmutable para poder usarlo en índices.
create or replace function public.f_unaccent(txt text)
returns text language sql immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, txt) $$;

-- "Chocolate de mesa · 1 kg" -> "chocolate-de-mesa-1-kg"
create or replace function public.slugify(txt text)
returns text language sql immutable parallel safe strict
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(public.f_unaccent(txt)), '[^a-z0-9]+', '-', 'g'))
$$;

-- Iniciales como las calcula el sitio actual: primeras letras de las dos
-- primeras palabras de más de 2 letras ("Chocolate Mamá Susana" -> "CM").
-- Si la marca es una sola palabra se usan sus dos primeras letras ("APIFIT" -> "AP").
create or replace function public.make_initials(txt text)
returns text language sql immutable parallel safe strict
set search_path = ''
as $$
  with words as (
    select w, n from unnest(regexp_split_to_array(trim(txt), '\s+')) with ordinality as t(w, n)
    where char_length(w) > 2
    order by n limit 2
  )
  select upper(case
    when (select count(*) from words) >= 2 then (select string_agg(left(w, 1), '' order by n) from words)
    when (select count(*) from words) = 1  then (select left(w, 2) from words)
    else left(trim(txt), 2)
  end)
$$;

-- ---------------------------------------------------------------------
-- Enums (los valores en español se muestran en la interfaz)
-- ---------------------------------------------------------------------
create type public.user_role          as enum ('cliente', 'embajador', 'admin');
create type public.ambassador_status  as enum ('activo', 'suspendido');
create type public.application_status as enum ('nueva', 'en_revision', 'aprobada', 'rechazada');
create type public.product_status     as enum ('borrador', 'pendiente', 'aprobado', 'rechazado', 'inactivo');
create type public.order_status       as enum ('pendiente_pago', 'pagado', 'preparando', 'consolidado', 'enviado', 'entregado', 'cancelado', 'reembolsado');
create type public.order_item_status  as enum ('pendiente', 'listo_para_recoger', 'recibido_en_bodega');
create type public.payment_status     as enum ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR');
create type public.payout_status      as enum ('pendiente', 'pagado');
create type public.coupon_type        as enum ('porcentaje', 'valor');
create type public.product_event_type as enum ('view', 'wishlist', 'cart', 'purchase');

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Contadores atómicos para SKU, códigos de embajador y kits.
-- La fila del contador queda bloqueada durante la transacción, así que
-- dos inserciones simultáneas nunca obtienen el mismo número.
-- ---------------------------------------------------------------------
create table public.sku_counters (
  scope      text primary key,
  last_value integer not null default 0
);

create or replace function public.next_counter(p_scope text)
returns integer language sql volatile security definer
set search_path = ''
as $$
  insert into public.sku_counters (scope, last_value) values (p_scope, 1)
  on conflict (scope) do update set last_value = public.sku_counters.last_value + 1
  returning last_value
$$;

revoke execute on function public.next_counter(text) from public, anon, authenticated;
