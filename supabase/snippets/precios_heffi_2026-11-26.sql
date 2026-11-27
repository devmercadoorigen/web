-- =====================================================================
-- Precios de venta desde "COSTOS - MERCADO ORIGEN.xlsx", hoja COST. UNID. HEFFI,
-- columna AD (PRECIO DE VENTA NECESARIO Pmin), redondeados hacia arriba a la
-- centena (23.563,61 -> 23.600). 57 códigos de producto (columna J).
-- Ejecútalo en Supabase > SQL Editor. Corre en una transacción.
--  · Producto con variantes: price = el menor precio de sus presentaciones;
--    cada variante guarda price_override solo si difiere de ese precio base.
--  · Variantes que no estén en la hoja conservan su precio actual.
--  · compare_at_price se borra si ya no es mayor que el precio nuevo.
-- =====================================================================
begin;
set local app.trusted = 'on';

create temporary table new_prices (code text primary key, price integer not null) on commit drop;
insert into new_prices (code, price) values
  ('EM0001_1', 23600),
  ('EM0001_2', 41800),
  ('EM0001_3', 81600),
  ('EM0001_4', 13400),
  ('EM0001_5', 56400),
  ('EM0001_6', 81600),
  ('EM0001_7', 31200),
  ('EM0001_8', 56400),
  ('EM0001_9', 31200),
  ('EM0001_10', 79600),
  ('EM0001_11', 41800),
  ('EM0001_12', 79600),
  ('EM0003_1', 31800),
  ('EM0003_2', 33200),
  ('EM0003_3', 33200),
  ('EM0003_4', 26600),
  ('EM0003_5', 26600),
  ('EM0004_1', 27700),
  ('EM0004_2', 93200),
  ('EM0004_3', 35600),
  ('EM0004_4', 33300),
  ('EM0004_5', 33300),
  ('EM0005_1', 28000),
  ('EM0006_1', 35800),
  ('EM0006_2', 31800),
  ('EM0006_3', 35800),
  ('EM0006_4', 35800),
  ('EM0006_5', 31800),
  ('EM0007_1', 15400),
  ('EM0008_1', 92100),
  ('EM0008_2', 73600),
  ('EM0008_3', 92100),
  ('EM0008_4', 73600),
  ('EM0009_1', 37800),
  ('EM0009_2', 20900),
  ('EM0009_3', 26500),
  ('EM0009_4', 32100),
  ('EM0009_5', 20900),
  ('EM0010_1', 59700),
  ('EM0010_2', 25400),
  ('EM0010_3', 46900),
  ('EM0011_1', 50400),
  ('EM0011_2', 31900),
  ('EM0011_3', 19900),
  ('EM0012_1', 191400),
  ('EM0012_2', 112000),
  ('EM0012_3', 112000),
  ('EM0014_1', 106400),
  ('EM0014_2', 106400),
  ('EM0014_3', 106400),
  ('EM0014_4', 106400),
  ('EM0014_5', 193000),
  ('EM0002_1', 414300),
  ('EM0016_1', 43800),
  ('EM0015_1', 35900),
  ('EM0015_2', 35800),
  ('EM0015_3', 35800);

-- Precio efectivo de cada variante (nuevo si está en la hoja, si no el actual).
create temporary table eff on commit drop as
select v.id as variant_id, v.product_id,
       coalesce(np.price, v.price_override, p.price) as price, np.code is not null as from_sheet
from public.product_variants v
join public.products p on p.id = v.product_id
left join new_prices np on np.code = v.attributes->>'supplier_code'
where v.product_id in (select v2.product_id from public.product_variants v2
                       join new_prices n2 on n2.code = v2.attributes->>'supplier_code');

create temporary table base on commit drop as
select product_id, min(price) as price from eff group by product_id;

-- Productos con variantes
update public.products p
   set price = b.price,
       compare_at_price = case when p.compare_at_price > b.price then p.compare_at_price end
  from base b where p.id = b.product_id;

update public.product_variants v
   set price_override = case when e.price = b.price then null else e.price end
  from eff e join base b on b.product_id = e.product_id
 where v.id = e.variant_id;

-- Productos sin variantes que guardan el código en products.supplier_code
update public.products p
   set price = np.price,
       compare_at_price = case when p.compare_at_price > np.price then p.compare_at_price end
  from new_prices np
 where p.supplier_code = np.code
   and p.id not in (select product_id from base);

-- Revisión: códigos de la hoja que no se encontraron en la base
select np.code, np.price as precio_hoja
  from new_prices np
 where not exists (select 1 from public.product_variants v where v.attributes->>'supplier_code' = np.code)
   and not exists (select 1 from public.products p where p.supplier_code = np.code)
 order by 1;

commit;

-- Para verificar después:
-- select p.name, v.name as presentacion, v.attributes->>'supplier_code' as codigo,
--        coalesce(v.price_override, p.price) as precio
--   from public.products p left join public.product_variants v on v.product_id = p.id
--  order by p.name, v.sort_order;
