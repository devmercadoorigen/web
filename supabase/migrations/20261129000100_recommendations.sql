-- =====================================================================
-- Mercado Origen · Fase 7 · Recomendaciones (sin servicios externos)
--  · track_product_events(): registro de eventos por lotes, validado
--  · Los pedidos de invitados quedan ligados a su session_id
--  · get_recommendations(): afinidad + co-compra + kits + arranque en frío
--  · Limpieza: los eventos se guardan 365 días (Ley 1581: finalidad y plazo)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Registro de eventos. El navegador ya no inserta directo en la tabla:
-- pasa por esta función, que valida el lote, ignora duplicados recientes
-- y limita el volumen por sesión. La compra solo la registra el servidor.
-- ---------------------------------------------------------------------
create or replace function public.track_product_events(p_session_id text, p_events jsonb)
returns integer language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_sid text := case when p_session_id ~ '^[A-Za-z0-9-]{8,64}$' then p_session_id end;
  n integer;
begin
  if v_uid is null and v_sid is null then return 0; end if;
  if jsonb_typeof(p_events) <> 'array' then return 0; end if;
  -- Freno contra abusos: máximo 300 eventos por hora y por visitante.
  if (select count(*) from public.product_events e
      where e.created_at > now() - interval '1 hour'
        and ((v_uid is not null and e.user_id = v_uid) or (v_sid is not null and e.session_id = v_sid))) > 300 then
    return 0;
  end if;

  insert into public.product_events (user_id, session_id, product_id, event)
  select distinct v_uid, v_sid, pr.id, x.ev::public.product_event_type
  from (select e ->> 'product_id' as pid, e ->> 'event' as ev
        from jsonb_array_elements(p_events) e limit 30) x
  join public.products pr on pr.id::text = x.pid and pr.status = 'aprobado'
  where x.ev in ('view', 'wishlist', 'cart')
    -- El mismo evento del mismo producto cuenta una vez cada 30 minutos.
    and not exists (
      select 1 from public.product_events e
      where e.product_id = pr.id and e.event::text = x.ev and e.created_at > now() - interval '30 minutes'
        and ((v_uid is not null and e.user_id = v_uid) or (v_sid is not null and e.session_id = v_sid)));
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.track_product_events(text, jsonb) from public;
grant execute on function public.track_product_events(text, jsonb) to anon, authenticated;
revoke insert on public.product_events from anon, authenticated;
drop policy if exists "publico: registrar" on public.product_events;

-- ---------------------------------------------------------------------
-- Pedidos de invitados: la compra se atribuye a su sesión de navegación
-- (create-order guarda el session_id). Así "lo que compró" también
-- alimenta sus recomendaciones aunque no tenga cuenta.
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists session_id text check (char_length(session_id) <= 64);

create or replace function public.product_events_fill_session()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.session_id like 'order:%' then
    select coalesce(o.session_id, new.session_id) into new.session_id
    from public.orders o where o.id::text = substr(new.session_id, 7);
  end if;
  return new;
end $$;

create trigger product_events_fill_session before insert on public.product_events
  for each row execute function public.product_events_fill_session();

-- Al iniciar sesión: une los eventos del invitado a su cuenta (también los
-- de compras hechas como invitado en este navegador).
create or replace function public.merge_session_events(p_session_id text)
returns void language sql security definer
set search_path = ''
as $$
  update public.product_events set user_id = auth.uid()
  where session_id = p_session_id and user_id is null and auth.uid() is not null
    and p_session_id ~ '^[A-Za-z0-9-]{8,64}$'
$$;

-- ---------------------------------------------------------------------
-- Recomendaciones
--  p_user_id: el usuario (si se omite, el de la sesión). Solo el admin
--             puede pedir las de otra persona.
--  p_session_id: visitante anónimo (id aleatorio del navegador).
--  p_context: { product_id, exclude: [uuid], target: pesos que faltan para
--               el envío gratis }
-- Devuelve { personalized, items: [tarjeta + reason], kits: [{id, reason}] }
--
-- Puntaje = afinidad (categoría 3 · embajador 2 · subregión 1,5)
--         + co-compra 2,5 + popularidad + FICCA + novedad + destacado
-- Afinidad: compra 5, carrito 3, deseo 3, vista 1, con decaimiento
-- exponencial (vida media ≈ 21 días) sobre los últimos 180 días.
-- ---------------------------------------------------------------------
create or replace function public.get_recommendations(
  p_user_id uuid, p_session_id text, p_limit integer default 12, p_context jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_sid text := case when p_session_id ~ '^[A-Za-z0-9-]{8,64}$' then p_session_id end;
  v_lim integer := least(greatest(coalesce(p_limit, 12), 1), 24);
  v_pid uuid;
  v_target integer := nullif(p_context ->> 'target', '')::integer;
  v_excl uuid[];
begin
  if p_user_id is not null and p_user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  v_uid := coalesce(p_user_id, auth.uid());
  begin
    v_pid := nullif(p_context ->> 'product_id', '')::uuid;
    v_excl := coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(
                case when jsonb_typeof(p_context -> 'exclude') = 'array' then p_context -> 'exclude' else '[]'::jsonb end) x), '{}');
  exception when invalid_text_representation then
    raise exception 'Contexto de recomendación inválido' using errcode = '22023';
  end;

  return (
  with ev as (
    -- Señales del visitante (cuenta y/o navegador)
    select e.product_id,
           sum(case e.event when 'purchase' then 5 when 'cart' then 3 when 'wishlist' then 3 else 1 end
               * exp(-extract(epoch from now() - e.created_at) / 86400.0 / 30.0)) as w,
           bool_or(e.event = 'purchase') as bought
    from public.product_events e
    where e.created_at > now() - interval '180 days'
      and ((v_uid is not null and e.user_id = v_uid) or (v_sid is not null and e.session_id = v_sid))
    group by e.product_id
    union all
    -- Compras de la cuenta (incluye pedidos anteriores al registro de eventos)
    select distinct oi.product_id, 0::numeric, true
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where v_uid is not null and o.user_id = v_uid and oi.product_id is not null
      and o.status in ('pagado', 'preparando', 'consolidado', 'enviado', 'entregado')
  ),
  personal as (select coalesce(bool_or(w > 0), false) as v from ev),
  seed as (
    select product_id, sum(w) as w, bool_or(bought) as bought
    from (select product_id, w, bought from ev
          -- El producto que se está mirando pesa como un carrito fresco y algo más.
          union all select v_pid, 6::numeric, false where v_pid is not null) s
    group by product_id
  ),
  prof as (
    select s.product_id, s.w, pr.category_id, pr.ambassador_id, m.subregion_id
    from seed s join public.products pr on pr.id = s.product_id
    join public.ambassadors a on a.id = pr.ambassador_id
    join public.municipalities m on m.id = a.municipality_id
    where s.w > 0
  ),
  tot as (select nullif(sum(w), 0) as t from prof),
  cat_aff as (select category_id as k, sum(w) / max(t) as a from prof, tot group by category_id),
  amb_aff as (select ambassador_id as k, sum(w) / max(t) as a from prof, tot group by ambassador_id),
  zone_aff as (select subregion_id as k, sum(w) / max(t) as a from prof, tot group by subregion_id),
  -- "Quienes compraron esto también compraron"
  cooc as (
    select oi2.product_id as k, sum(s.w) as n
    from prof s
    join public.order_items oi1 on oi1.product_id = s.product_id
    join public.orders o on o.id = oi1.order_id and o.status in ('pagado', 'preparando', 'consolidado', 'enviado', 'entregado')
    join public.order_items oi2 on oi2.order_id = oi1.order_id and oi2.product_id <> oi1.product_id
    group by oi2.product_id
  ),
  cooc_max as (select nullif(max(n), 0) as mx from cooc),
  pop_max as (select nullif(max(sales_count), 0) as mx from public.products where status = 'aprobado'),
  cand as (
    select pr.id, pr.category_id, pr.ambassador_id, pr.price, pr.sales_count, pr.created_at, pr.is_featured,
           m.subregion_id, a.brand_name, c.name as category_name, s.name as zone_name,
           (exists (select 1 from unnest(pr.badges) b where b ilike '%ficca%')
             or exists (select 1 from public.ambassador_badges ab where ab.ambassador_id = a.id and ab.label ilike '%ficca%')) as ficca
    from public.products pr
    join public.ambassadors a on a.id = pr.ambassador_id and a.status = 'activo'
    join public.categories c on c.id = pr.category_id
    join public.municipalities m on m.id = a.municipality_id
    join public.subregions s on s.id = m.subregion_id
    where pr.status = 'aprobado'
      and (pr.stock > 0 or exists (select 1 from public.product_variants v where v.product_id = pr.id and v.is_active and v.stock > 0))
      and pr.id <> all (v_excl)
      and pr.id is distinct from v_pid
      -- Lo ya comprado no se repite, salvo consumibles (café, chocolate, miel…)
      and (c.is_consumable or not exists (select 1 from seed s2 where s2.product_id = pr.id and s2.bought))
  ),
  parts as (
    select c.*,
           3.0 * coalesce(ca.a, 0) as p_cat,
           2.0 * coalesce(aa.a, 0) as p_amb,
           1.5 * coalesce(za.a, 0) as p_zone,
           2.5 * coalesce(co.n / cm.mx, 0) as p_cooc,
           0.6 * coalesce(ln(1 + c.sales_count) / ln(1 + pm.mx), 0) as p_pop,
           case when c.ficca then 0.5 else 0 end as p_ficca,
           case when c.created_at > now() - interval '45 days' then 0.3 else 0 end as p_new,
           case when c.is_featured then (case when pe.v then 0.2 else 0.8 end) else 0 end as p_feat,
           case when v_target > 0 then
             case when c.price >= v_target then 1.5 - least(1.0, (c.price - v_target)::numeric / v_target)
                  else 0.6 * c.price::numeric / v_target end
           else 0 end as p_target
    from cand c
    left join cat_aff ca on ca.k = c.category_id
    left join amb_aff aa on aa.k = c.ambassador_id
    left join zone_aff za on za.k = c.subregion_id
    left join cooc co on co.k = c.id
    cross join cooc_max cm cross join pop_max pm cross join personal pe
  ),
  scored as (
    select p.*, p_cat + p_amb + p_zone + p_cooc + p_pop + p_ficca + p_new + p_feat + p_target as score
    from parts p
  ),
  picked as (
    -- Variedad: como máximo 2 productos por embajador en los primeros puestos
    select s.*, row_number() over (order by (s.rn_amb > 2), s.score desc, s.sales_count desc, s.created_at desc) as ord
    from (select sc.*, row_number() over (partition by sc.ambassador_id order by sc.score desc) as rn_amb from scored sc) s
  ),
  kit_pick as (
    -- Kits que contienen productos de interés (o los del home si no hay señales)
    select k.id, k.slug, k.sort_order,
           coalesce(sum(s.w), 0) + case when k.show_on_home then 0.1 else 0 end as sc,
           case when sum(s.w) > 0 then 'Incluye productos que te interesan' else 'Para regalar' end as reason
    from public.kits k
    join public.kit_summaries ks on ks.kit_id = k.id and ks.is_available
    left join public.kit_items ki on ki.kit_id = k.id
    left join seed s on s.product_id = ki.product_id and s.w > 0
    cross join personal pe
    where k.is_active
    group by k.id, pe.v
    having sum(s.w) > 0 or (not pe.v and v_pid is null and k.show_on_home)
    order by 4 desc, k.sort_order
    limit 3
  )
  select jsonb_build_object(
    'personalized', (select v from personal),
    'items', coalesce((
      select jsonb_agg(
               public.product_card(pr) || jsonb_build_object(
                 'score', round(pk.score::numeric, 3),
                 'reason', case
                   when pk.p_target >= 1.2 then 'Completa tu envío gratis'
                   when pk.p_cooc >= greatest(pk.p_cat, pk.p_amb, pk.p_zone) and pk.p_cooc > 0.3 then
                     case when v_pid is not null then 'Quienes compraron este también llevaron' else 'Se lleva junto a lo que te gusta' end
                   when pk.p_cat >= greatest(pk.p_amb, pk.p_zone) and pk.p_cat > 0.6 then
                     case when v_pid is not null then 'Del mismo tipo' else 'Porque te gusta: ' || lower(pk.category_name) end
                   when pk.p_amb >= pk.p_zone and pk.p_amb > 0.4 then 'Más de ' || pk.brand_name
                   when pk.p_zone > 0.4 then 'También de la zona ' || pk.zone_name
                   when pk.ficca then 'Ganador FICCA'
                   when pk.p_new > 0 then 'Nuevo en la tienda'
                   when pk.is_featured then 'Destacado'
                   else 'De lo más pedido' end)
               order by pk.ord)
      from picked pk join public.products pr on pr.id = pk.id
      where pk.ord <= v_lim), '[]'::jsonb),
    'kits', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'reason', reason) order by sc desc, sort_order) from kit_pick), '[]'::jsonb))
  );
end $$;

revoke execute on function public.get_recommendations(uuid, text, integer, jsonb) from public;
grant execute on function public.get_recommendations(uuid, text, integer, jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Conservación: los eventos de navegación se borran a los 365 días.
-- ---------------------------------------------------------------------
create or replace function public.purge_old_product_events()
returns integer language plpgsql security definer
set search_path = ''
as $$
declare n integer;
begin
  delete from public.product_events where created_at < now() - interval '365 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.purge_old_product_events() from public, anon, authenticated;

select cron.schedule('mo-purge-product-events', '30 3 * * *', 'select public.purge_old_product_events()');
