-- =====================================================================
-- Mercado Origen · Fase 6 · Tienda con datos reales
--  · shop_products(): catálogo de /tienda con filtros, orden y paginación
--  · search_suggest(): sugerencias instantáneas del buscador
--  · Reseñas: nombre corto del autor (los perfiles son privados)
--  · my_reviewable_items(): qué puede reseñar el cliente en un producto
-- Las dos primeras son security invoker: la RLS decide qué se ve
-- (solo productos aprobados de embajadores activos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Forma de "producto de tarjeta" compartida por la tienda y el buscador
-- ---------------------------------------------------------------------
create or replace function public.product_card(pr public.products)
returns jsonb language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', pr.id, 'slug', pr.slug, 'sku', pr.sku, 'name', pr.name, 'short_description', pr.short_description,
    'price', pr.price, 'compare_at_price', pr.compare_at_price, 'stock', pr.stock, 'badges', pr.badges,
    'mockup', pr.mockup, 'is_featured', pr.is_featured, 'is_age_restricted', pr.is_age_restricted,
    'rating_avg', pr.rating_avg, 'rating_count', pr.rating_count, 'sales_count', pr.sales_count, 'created_at', pr.created_at,
    'category', (select jsonb_build_object('code', c.code, 'slug', c.slug, 'name', c.name) from public.categories c where c.id = pr.category_id),
    'ambassador', (select jsonb_build_object('id', a.id, 'slug', a.slug, 'brand_name', a.brand_name,
                     'municipality', jsonb_build_object('name', m.name, 'slug', m.slug,
                       'subregion', jsonb_build_object('slug', s.slug, 'name', s.name)))
                   from public.ambassadors a join public.municipalities m on m.id = a.municipality_id
                   join public.subregions s on s.id = m.subregion_id where a.id = pr.ambassador_id),
    'images', coalesce((select jsonb_agg(jsonb_build_object('url', i.url, 'thumb_url', i.thumb_url, 'alt', i.alt, 'sort_order', i.sort_order) order by i.sort_order)
                        from public.product_images i where i.product_id = pr.id), '[]'::jsonb),
    'has_variants', exists (select 1 from public.product_variants v where v.product_id = pr.id and v.is_active))
$$;

-- Consulta de búsqueda tolerante: palabras con prefijo ("choco" encuentra "chocolate").
create or replace function public.prefix_tsquery(q text)
returns tsquery language sql immutable
set search_path = ''
as $$
  select case when count(*) = 0 then null
              else to_tsquery('public.es_unaccent', string_agg(w || ':*', ' & ')) end
  from unnest(regexp_split_to_array(lower(public.f_unaccent(coalesce(q, ''))), '[^a-z0-9ñ]+')) w
  where char_length(w) >= 2
$$;

-- ---------------------------------------------------------------------
-- Catálogo de /tienda
-- p: { q, category, zone, municipality, ambassador (slugs), min_price, max_price,
--      min_rating, sort: relevancia|mas_vendidos|nuevos|precio_asc|precio_desc|calificacion,
--      limit (máx. 48), offset }
-- ---------------------------------------------------------------------
create or replace function public.shop_products(p jsonb)
returns jsonb language sql stable
set search_path = ''
as $$
  with x as (
    select nullif(trim(p ->> 'q'), '') as q,
           public.prefix_tsquery(p ->> 'q') as tq,
           nullif(p ->> 'category', '') as cat, nullif(p ->> 'zone', '') as zone,
           nullif(p ->> 'municipality', '') as muni, nullif(p ->> 'ambassador', '') as amb,
           (p ->> 'min_price')::int as min_price, (p ->> 'max_price')::int as max_price,
           (p ->> 'min_rating')::numeric as min_rating,
           coalesce(nullif(p ->> 'sort', ''), case when nullif(trim(p ->> 'q'), '') is not null then 'relevancia' else 'mas_vendidos' end) as sort,
           least(greatest(coalesce((p ->> 'limit')::int, 24), 1), 48) as lim,
           greatest(coalesce((p ->> 'offset')::int, 0), 0) as off
  ),
  base as (
    select pr, x.lim, x.off,
           case when x.tq is null then 0 else ts_rank(pr.search_vector, x.tq) end
             + case when x.q is not null and pr.sku ilike '%' || x.q || '%' then 2 else 0 end as rank,
           x.sort
    from public.products pr
    join public.ambassadors a on a.id = pr.ambassador_id and a.status = 'activo'
    join public.categories c on c.id = pr.category_id
    join public.municipalities m on m.id = a.municipality_id
    join public.subregions s on s.id = m.subregion_id
    cross join x
    where pr.status = 'aprobado'
      and (x.q is null or pr.search_vector @@ x.tq or pr.sku ilike '%' || x.q || '%')
      and (x.cat is null or c.slug = x.cat)
      and (x.zone is null or s.slug = x.zone)
      and (x.muni is null or m.slug = x.muni)
      and (x.amb is null or a.slug = x.amb)
      and (x.min_price is null or pr.price >= x.min_price)
      and (x.max_price is null or pr.price <= x.max_price)
      and (x.min_rating is null or pr.rating_avg >= x.min_rating)
  ),
  ranked as (
    select pr, lim, off, count(*) over () as total,
           row_number() over (order by
             case when sort = 'precio_asc' then (pr).price end asc,
             case when sort = 'precio_desc' then (pr).price end desc,
             case when sort = 'nuevos' then (pr).created_at end desc,
             case when sort = 'calificacion' then (pr).rating_avg end desc,
             case when sort = 'relevancia' then rank end desc,
             (pr).stock > 0 desc, (pr).sales_count desc, (pr).created_at asc) as ord
    from base
  )
  select jsonb_build_object(
    'total', coalesce(max(total), 0),
    'items', coalesce(jsonb_agg(public.product_card(pr) order by ord) filter (where ord > off and ord <= off + lim), '[]'::jsonb))
  from ranked
$$;

-- ---------------------------------------------------------------------
-- Sugerencias del buscador: productos (por texto o SKU), embajadores y municipios
-- ---------------------------------------------------------------------
create or replace function public.search_suggest(q text)
returns jsonb language sql stable
set search_path = ''
as $$
  with x as (select trim(q) as q, public.prefix_tsquery(q) as tq, '%' || lower(public.f_unaccent(trim(q))) || '%' as pat)
  select case when char_length(coalesce(trim(q), '')) < 2 then '{"products":[],"ambassadors":[],"municipalities":[]}'::jsonb else jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(t) from (
        select pr.slug, pr.name, pr.sku, pr.price, pr.mockup, a.brand_name as maker,
               (select i.thumb_url from public.product_images i where i.product_id = pr.id order by i.sort_order limit 1) as thumb
        from public.products pr join public.ambassadors a on a.id = pr.ambassador_id and a.status = 'activo', x
        where pr.status = 'aprobado' and (pr.search_vector @@ x.tq or pr.sku ilike '%' || x.q || '%')
        order by (pr.sku ilike x.q || '%') desc, ts_rank(pr.search_vector, x.tq) desc, pr.sales_count desc
        limit 6) t), '[]'::jsonb),
    'ambassadors', coalesce((
      select jsonb_agg(t) from (
        select a.slug, a.brand_name, a.initials, a.avatar_url, m.name as municipality
        from public.ambassadors a join public.municipalities m on m.id = a.municipality_id, x
        where a.status = 'activo' and (public.f_unaccent(lower(a.brand_name)) like x.pat or lower(a.code) = lower(x.q))
        order by a.sales_count desc limit 4) t), '[]'::jsonb),
    'municipalities', coalesce((
      select jsonb_agg(t) from (
        select m.slug, m.name, s.slug as zone, s.name as zone_name,
               (select count(*) from public.ambassadors a where a.municipality_id = m.id and a.status = 'activo') as ambassadors
        from public.municipalities m join public.subregions s on s.id = m.subregion_id, x
        where public.f_unaccent(lower(m.name)) like x.pat
        order by m.name limit 4) t), '[]'::jsonb)
  ) end
  from x
$$;

grant execute on function public.product_card(public.products), public.prefix_tsquery(text),
  public.shop_products(jsonb), public.search_suggest(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Reseñas con nombre corto del autor ("María G.")
-- ---------------------------------------------------------------------
alter table public.reviews add column if not exists author_name text;

create or replace function public.reviews_fill()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text;
  v_parts text[];
  v_last text;
begin
  select oi.product_id, oi.ambassador_id into new.product_id, new.ambassador_id
  from public.order_items oi where oi.id = new.order_item_id;
  if new.product_id is null then
    raise exception 'Este producto ya no está disponible para reseñas.';
  end if;
  if tg_op = 'INSERT' then
    select coalesce(nullif(trim(full_name), ''), split_part(email::text, '@', 1)) into v_name from public.profiles where id = new.user_id;
    -- "María Victoria de la Torre" -> "María T." (se saltan partículas como "de", "la").
    v_parts := regexp_split_to_array(trim(v_name), '\s+');
    select w into v_last from unnest(v_parts[2:]) w
    where lower(w) not in ('de', 'del', 'la', 'las', 'los', 'y', 'da', 'van', 'von') limit 1;
    new.author_name := initcap(v_parts[1]) || coalesce(' ' || upper(left(v_last, 1)) || '.', '');
  end if;
  if tg_op = 'UPDATE' and not public.is_privileged() then
    new.is_visible := old.is_visible;
    new.user_id := old.user_id;
    new.author_name := old.author_name;
  end if;
  return new;
end $$;

update public.reviews r set author_name = initcap(split_part(coalesce(nullif(trim(p.full_name), ''), split_part(p.email::text, '@', 1)), ' ', 1))
from public.profiles p where p.id = r.user_id and r.author_name is null;

-- Items entregados de este producto que el cliente aún no ha reseñado.
create or replace function public.my_reviewable_items(p_product_id uuid)
returns table (order_item_id uuid, order_number text, delivered_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select oi.id, o.order_number, o.delivered_at
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where o.user_id = auth.uid() and o.status = 'entregado' and oi.product_id = p_product_id
    and not exists (select 1 from public.reviews r where r.order_item_id = oi.id)
  order by o.delivered_at desc
$$;
revoke execute on function public.my_reviewable_items(uuid) from public, anon;
grant execute on function public.my_reviewable_items(uuid) to authenticated;
