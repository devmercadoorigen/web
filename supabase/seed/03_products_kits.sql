-- =====================================================================
-- Semilla 03 · Catálogo real de los embajadores (43 productos).
-- GENERADO por scripts/build-product-seed.mjs desde private/productos.csv.
-- No lo edites a mano: corrige la hoja o GROUPS y vuelve a generarlo.
--  · SKU y slug los genera la base (trigger); supplier_code = código del embajador.
--  · Presentaciones (peso, grano/molido, unidades) = variantes con su precio y stock.
--  · Calificaciones en 0: aún no hay reseñas reales.
-- =====================================================================

create temporary table seed_products (key text primary key, product_id uuid not null);

-- petit-achiras (EM0001_4, EM0001_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Achiras tradicionales huilenses', '100% naturales y artesanales, en bolsa kraft con cierre hermético.', 'Achiras tradicionales del Huila, elaboradas de manera artesanal con ingredientes 100 % naturales. Un bocado tradicional para compartir y disfrutar en cualquier momento.', 9200, 20, null,
         array['Típico'], '{"art":"achira","colors":["#FDEBD0","#D98A1F"]}'::jsonb, true, false, null, null,
         'aprobado', now(), now() - make_interval(mins => 999)
  from public.ambassadors a, public.categories c where a.code = 'EM0001' and c.code = 'TIP'
  returning id
)
insert into seed_products select 'petit-achiras', id from p;
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '60G', '60 g', '{"supplier_code":"EM0001_4","format":"Bolsa kraft - cierre zip y hermético","weight_g":60,"height_cm":20,"width_cm":12,"depth_cm":4,"image":"/img/products/EM0001_4.webp"}'::jsonb, null, 10, 0 from seed_products where key = 'petit-achiras';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '140G', '140 g', '{"supplier_code":"EM0001_1","format":"Bolsa kraft - cierre zip y hermético","weight_g":140,"height_cm":22,"width_cm":15,"depth_cm":5,"image":"/img/products/EM0001_1.webp"}'::jsonb, 19000, 10, 1 from seed_products where key = 'petit-achiras';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_4.webp', '/img/products/EM0001_4-400.webp', 'Achiras tradicionales huilenses', 1200, 857, 0 from seed_products where key = 'petit-achiras';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_1.webp', '/img/products/EM0001_1-400.webp', 'Achiras tradicionales huilenses', 1200, 857, 1 from seed_products where key = 'petit-achiras';

-- petit-geisha (EM0001_11, EM0001_2, EM0001_10, EM0001_12)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Café exótico Geisha · tueste medio', 'Pitalito, 1.850 msnm. Proceso honey y secado natural.', 'Café exótico de origen Pitalito, Huila, cultivado a 1.850 m s. n. m. Su variedad Geisha, proceso honey y secado natural dan vida a una experiencia de café de origen cuidadosamente seleccionada.', 34500, 40, null,
         '{}'::text[], '{"art":"tea","colors":["#F3E6D8","#4A2C1E"],"label":"Café Geisha"}'::jsonb, false, false, null, null,
         'aprobado', now(), now() - make_interval(mins => 998)
  from public.ambassadors a, public.categories c where a.code = 'EM0001' and c.code = 'CAF'
  returning id
)
insert into seed_products select 'petit-geisha', id from p;
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'G250', 'Grano · 250 g', '{"supplier_code":"EM0001_11","format":"Bolsa doypack, válvula y cierre zip 13 x 20 cm","weight_g":250,"height_cm":19,"width_cm":13,"depth_cm":5,"image":"/img/products/EM0001_11.webp"}'::jsonb, null, 10, 0 from seed_products where key = 'petit-geisha';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'M250', 'Molido · 250 g', '{"supplier_code":"EM0001_2","format":"Bolsa doypack, válvula y cierre zip 13 x 20 cm","weight_g":250,"height_cm":19,"width_cm":13,"depth_cm":5,"image":"/img/products/EM0001_2.webp"}'::jsonb, null, 10, 1 from seed_products where key = 'petit-geisha';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'G500', 'Grano · 500 g', '{"supplier_code":"EM0001_10","format":"Bolsa doypack, válvula y cierre zip 13,5 x 26 cm","weight_g":500,"height_cm":25,"width_cm":13.5,"depth_cm":6,"image":"/img/products/EM0001_10.webp"}'::jsonb, 70000, 10, 2 from seed_products where key = 'petit-geisha';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'M500', 'Molido · 500 g', '{"supplier_code":"EM0001_12","format":"Bolsa doypack, válvula y cierre zip 13,5 x 26 cm","weight_g":500,"height_cm":25,"width_cm":13.5,"depth_cm":6,"image":"/img/products/EM0001_12.webp"}'::jsonb, 70000, 10, 3 from seed_products where key = 'petit-geisha';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_11.webp', '/img/products/EM0001_11-400.webp', 'Café exótico Geisha · tueste medio', 1000, 1200, 0 from seed_products where key = 'petit-geisha';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_2.webp', '/img/products/EM0001_2-400.webp', 'Café exótico Geisha · tueste medio', 1000, 1200, 1 from seed_products where key = 'petit-geisha';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_10.webp', '/img/products/EM0001_10-400.webp', 'Café exótico Geisha · tueste medio', 1000, 1200, 2 from seed_products where key = 'petit-geisha';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_12.webp', '/img/products/EM0001_12-400.webp', 'Café exótico Geisha · tueste medio', 1000, 1200, 3 from seed_products where key = 'petit-geisha';

-- petit-pacamara (EM0001_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Café exótico Pacamara en grano · 500 g', 'Pitalito, 1.800 msnm. Proceso honey y secado natural.', 'Café exótico de Pitalito, Huila, cultivado a 1.800 m s. n. m. en variedad Pacamara, con proceso honey y secado natural. Una presentación en grano para quienes prefieren moler el café al momento de prepararlo.', 72500, 10, 500,
         '{}'::text[], '{"art":"tea","colors":["#F3E6D8","#4A2C1E"],"label":"Café Pacamara"}'::jsonb, false, false, 'EM0001_3', '{"format":"Bolsa doypack, válvula y cierre zip 13,5 x 26 cm","weight_g":500,"height_cm":25,"width_cm":13.5,"depth_cm":6}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 997)
  from public.ambassadors a, public.categories c where a.code = 'EM0001' and c.code = 'CAF'
  returning id
)
insert into seed_products select 'petit-pacamara', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_3.webp', '/img/products/EM0001_3-400.webp', 'Café exótico Pacamara en grano · 500 g', 1000, 1200, 0 from seed_products where key = 'petit-pacamara';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_6.webp', '/img/products/EM0001_6-400.webp', 'Café exótico Pacamara en grano · 500 g', 1000, 1200, 1 from seed_products where key = 'petit-pacamara';

-- petit-bourbon (EM0001_7, EM0001_9, EM0001_5, EM0001_8)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Café especial Bourbon Rosado · tueste medio', 'Pitalito, 1.800 msnm. Proceso honey y secado natural.', 'Café especial de Pitalito, Huila, variedad Bourbon Rosado, cultivado a 1.800 m s. n. m. y elaborado mediante proceso honey y secado natural. Ideal para preparar y disfrutar una taza de café de origen.', 24500, 40, null,
         '{}'::text[], '{"art":"tea","colors":["#F3E6D8","#4A2C1E"],"label":"Bourbon Rosado"}'::jsonb, false, false, null, null,
         'aprobado', now(), now() - make_interval(mins => 996)
  from public.ambassadors a, public.categories c where a.code = 'EM0001' and c.code = 'CAF'
  returning id
)
insert into seed_products select 'petit-bourbon', id from p;
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'G250', 'Grano · 250 g', '{"supplier_code":"EM0001_7","format":"Bolsa doypack, válvula y cierre zip 13 x 20 cm","weight_g":250,"height_cm":19,"width_cm":13,"depth_cm":5,"image":"/img/products/EM0001_7.webp"}'::jsonb, null, 10, 0 from seed_products where key = 'petit-bourbon';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'M250', 'Molido · 250 g', '{"supplier_code":"EM0001_9","format":"Bolsa doypack, válvula y cierre zip 13 x 20 cm","weight_g":250,"height_cm":19,"width_cm":13,"depth_cm":5,"image":"/img/products/EM0001_9.webp"}'::jsonb, null, 10, 1 from seed_products where key = 'petit-bourbon';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'G500', 'Grano · 500 g', '{"supplier_code":"EM0001_5","format":"Bolsa doypack, válvula y cierre zip 13,5 x 26 cm","weight_g":500,"height_cm":25,"width_cm":13.5,"depth_cm":6,"image":"/img/products/EM0001_5.webp"}'::jsonb, 45000, 10, 2 from seed_products where key = 'petit-bourbon';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'M500', 'Molido · 500 g', '{"supplier_code":"EM0001_8","format":"Bolsa doypack, válvula y cierre zip 13,5 x 26 cm","weight_g":500,"height_cm":25,"width_cm":13.5,"depth_cm":6,"image":"/img/products/EM0001_8.webp"}'::jsonb, 45000, 10, 3 from seed_products where key = 'petit-bourbon';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_7.webp', '/img/products/EM0001_7-400.webp', 'Café especial Bourbon Rosado · tueste medio', 1000, 1200, 0 from seed_products where key = 'petit-bourbon';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_9.webp', '/img/products/EM0001_9-400.webp', 'Café especial Bourbon Rosado · tueste medio', 1000, 1200, 1 from seed_products where key = 'petit-bourbon';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_5.webp', '/img/products/EM0001_5-400.webp', 'Café especial Bourbon Rosado · tueste medio', 1000, 1200, 2 from seed_products where key = 'petit-bourbon';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0001_8.webp', '/img/products/EM0001_8-400.webp', 'Café especial Bourbon Rosado · tueste medio', 1000, 1200, 3 from seed_products where key = 'petit-bourbon';

-- bried-100 (EM0003_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate de mesa 100% cacao', 'Sin endulzantes, desde nuestro cultivo. Caja de 250 g.', 'Chocolate de mesa artesanal elaborado con cacao de cultivo propio. No contiene endulzantes y se produce con respeto por el medio ambiente, para disfrutar el sabor auténtico del cacao.', 24000, 10, 250,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"]}'::jsonb, false, false, 'EM0003_1', '{"format":"Caja","weight_g":250,"height_cm":4,"width_cm":14,"depth_cm":9}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 995)
  from public.ambassadors a, public.categories c where a.code = 'EM0003' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'bried-100', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0003_1.webp', '/img/products/EM0003_1-400.webp', 'Chocolate de mesa 100% cacao', 895, 1116, 0 from seed_products where key = 'bried-100';

-- bried-cardamomo (EM0003_2)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate de mesa 100% cacao con cardamomo y canela', 'Sin endulzantes, con cardamomo y canela. Caja de 250 g.', 'Chocolate de mesa artesanal 100 % cacao, sin endulzantes, elaborado con cacao de cultivo propio. Su combinación de cardamomo y canela aporta un perfil especiado y aromático.', 25000, 10, 250,
         array['Más vendido'], '{"art":"bar","colors":["#FCEFC2","#6B2F22"]}'::jsonb, false, false, 'EM0003_2', '{"format":"Caja","weight_g":250,"height_cm":4,"width_cm":14,"depth_cm":9}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 994)
  from public.ambassadors a, public.categories c where a.code = 'EM0003' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'bried-cardamomo', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0003_2.webp', '/img/products/EM0003_2-400.webp', 'Chocolate de mesa 100% cacao con cardamomo y canela', 895, 1113, 0 from seed_products where key = 'bried-cardamomo';

-- bried-nuez (EM0003_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate de mesa 100% cacao con nuez moscada y clavos', 'Sin endulzantes, con nuez moscada y clavos. Bolsa de 250 g.', 'Chocolate de mesa artesanal 100 % cacao, sin endulzantes, elaborado con cacao de cultivo propio. La nuez moscada y los clavos aportan notas especiadas a esta preparación tradicional.', 25000, 10, 250,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"]}'::jsonb, false, false, 'EM0003_3', '{"format":"Bolsa","weight_g":250,"height_cm":22,"width_cm":13,"depth_cm":5}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 993)
  from public.ambassadors a, public.categories c where a.code = 'EM0003' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'bried-nuez', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0003_3.webp', '/img/products/EM0003_3-400.webp', 'Chocolate de mesa 100% cacao con nuez moscada y clavos', 896, 1195, 0 from seed_products where key = 'bried-nuez';

-- bried-nibs (EM0003_4)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Nibs de cacao', 'Cacao tostado 100% natural y crujiente. 150 g.', 'Trozos de cacao tostado 100 % natural, crujientes y llenos de sabor. Una opción versátil para disfrutar como snack o incorporar en postres y bebidas.', 19500, 10, 150,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"],"label":"Nibs de cacao"}'::jsonb, false, false, 'EM0003_4', '{"format":"Bolsa","weight_g":150,"height_cm":20,"width_cm":10,"depth_cm":3}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 992)
  from public.ambassadors a, public.categories c where a.code = 'EM0003' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'bried-nibs', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0003_4.webp', '/img/products/EM0003_4-400.webp', 'Nibs de cacao', 800, 1200, 0 from seed_products where key = 'bried-nibs';

-- bried-almendra (EM0003_5)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Almendra de cacao tostada', 'Grano tostado con su cascarilla natural. 300 g.', 'Granos de cacao tostados con su cascarilla natural, que conservan el aroma y la esencia propios del cacao. Una presentación para quienes disfrutan su sabor en estado natural.', 20000, 10, 300,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"],"label":"Cacao tostado"}'::jsonb, false, false, 'EM0003_5', '{"format":"Bolsa","weight_g":300,"height_cm":22,"width_cm":12,"depth_cm":6}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 991)
  from public.ambassadors a, public.categories c where a.code = 'EM0003' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'bried-almendra', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0003_5.webp', '/img/products/EM0003_5-400.webp', 'Almendra de cacao tostada', 800, 1200, 0 from seed_products where key = 'bried-almendra';

-- susana-tradicional (EM0004_1, EM0004_2)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate de mesa artesanal tradicional en bolitas', 'Cacao huilense con panela, canela y clavos.', 'Chocolate artesanal elaborado con cacao huilense de alta calidad, endulzado con panela y sazonado con canela y clavos. Viene en bolitas para preparar una auténtica taza de chocolate colombiano.', 21000, 20, null,
         array['Ganador FICCA 2024'], '{"art":"ball","colors":["#F6E7C9","#5A2E1E"]}'::jsonb, true, false, null, null,
         'aprobado', now(), now() - make_interval(mins => 990)
  from public.ambassadors a, public.categories c where a.code = 'EM0004' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'susana-tradicional', id from p;
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '250G', '250 g', '{"supplier_code":"EM0004_1","format":"Bolsa aluminizada","weight_g":250,"height_cm":20,"width_cm":10,"depth_cm":5,"image":"/img/products/EM0004_1.webp"}'::jsonb, null, 10, 0 from seed_products where key = 'susana-tradicional';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '1KG', '1 kg · 50 bolitas', '{"supplier_code":"EM0004_2","format":"Bolsa aluminizada","weight_g":1000,"height_cm":35,"width_cm":15,"depth_cm":7.5,"image":"/img/products/EM0004_2.webp"}'::jsonb, 79000, 10, 1 from seed_products where key = 'susana-tradicional';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0004_1.webp', '/img/products/EM0004_1-400.webp', 'Chocolate de mesa artesanal tradicional en bolitas', 1200, 800, 0 from seed_products where key = 'susana-tradicional';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0004_2.webp', '/img/products/EM0004_2-400.webp', 'Chocolate de mesa artesanal tradicional en bolitas', 1200, 800, 1 from seed_products where key = 'susana-tradicional';

-- susana-100 (EM0004_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate de mesa artesanal 100% cacao en bolitas', 'Sin azúcar añadida, con clavos y canela. 125 g.', 'Chocolate artesanal 100 % cacao, sin azúcar añadida, con clavos y canela. Su presentación en bolitas permite preparar una bebida de sabor intenso y carácter natural.', 28000, 10, 125,
         '{}'::text[], '{"art":"ball","colors":["#F6E7C9","#5A2E1E"]}'::jsonb, false, false, 'EM0004_3', '{"weight_g":125,"height_cm":15,"width_cm":10,"depth_cm":5}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 989)
  from public.ambassadors a, public.categories c where a.code = 'EM0004' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'susana-100', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0004_3.webp', '/img/products/EM0004_3-400.webp', 'Chocolate de mesa artesanal 100% cacao en bolitas', 675, 1200, 0 from seed_products where key = 'susana-100';

-- susana-nibs (EM0004_4)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Nibs de cacao tostados', '100% cacao, textura crujiente. 125 g.', 'Nibs tostados y triturados a partir de granos de cacao de alta calidad. Producto 100 % cacao, de textura crujiente y sabor y aroma intensos, característicos del cacao tostado.', 26000, 10, 125,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"],"label":"Nibs de cacao"}'::jsonb, false, false, 'EM0004_4', '{"format":"Bolsa","weight_g":125,"height_cm":20,"width_cm":12,"depth_cm":3}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 988)
  from public.ambassadors a, public.categories c where a.code = 'EM0004' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'susana-nibs', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0004_4.webp', '/img/products/EM0004_4-400.webp', 'Nibs de cacao tostados', 900, 1200, 0 from seed_products where key = 'susana-nibs';

-- susana-nibs-choco (EM0004_5)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Nibs de cacao cubiertos con chocolate al 60%', 'Un snack crujiente y lleno de energía. 125 g.', 'Nibs de cacao tostados y triturados, recubiertos con chocolate al 60 %. Un snack crujiente elaborado a partir de cacao de alta calidad, con sabor y aroma característicos.', 26000, 10, 125,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"],"label":"Nibs con chocolate"}'::jsonb, false, false, 'EM0004_5', '{"format":"Bolsa","weight_g":125,"height_cm":20,"width_cm":12,"depth_cm":3}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 987)
  from public.ambassadors a, public.categories c where a.code = 'EM0004' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'susana-nibs-choco', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0004_5.webp', '/img/products/EM0004_5-400.webp', 'Nibs de cacao cubiertos con chocolate al 60%', 900, 1200, 0 from seed_products where key = 'susana-nibs-choco';

-- artbacu-pocillo (EM0005_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Pocillo chocolatero tallado huilense', 'Pocillo para servir a la mesa, alusivo al Huila.', 'Pocillo para servir a la mesa, con diseño alusivo al Huila. Una pieza artesanal que lleva la identidad regional a los momentos de compartir una bebida caliente.', 25000, 10, 220,
         '{}'::text[], '{"art":"bar","colors":["#F7E6DA","#B14A3A"],"label":"Pocillo tallado"}'::jsonb, false, false, 'EM0005_1', '{"format":"CAJA","weight_g":220,"height_cm":14,"width_cm":12,"depth_cm":12}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 986)
  from public.ambassadors a, public.categories c where a.code = 'EM0005' and c.code = 'ART'
  returning id
)
insert into seed_products select 'artbacu-pocillo', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0005_1.webp', '/img/products/EM0005_1-400.webp', 'Pocillo chocolatero tallado huilense', 1200, 800, 0 from seed_products where key = 'artbacu-pocillo';

-- apifit-miel (EM0006_4, EM0006_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Miel de abejas natural', 'Miel pura de abejas del Huila.', 'Miel de abejas natural, en botella de 500 g o envase de vidrio de 450 g. Un producto versátil para tener en casa y acompañar bebidas, desayunos y diferentes recetas.', 29990, 20, null,
         '{}'::text[], '{"art":"jar","colors":["#FFF4CC","#E59A00"]}'::jsonb, true, false, null, null,
         'aprobado', now(), now() - make_interval(mins => 985)
  from public.ambassadors a, public.categories c where a.code = 'EM0006' and c.code = 'MIE'
  returning id
)
insert into seed_products select 'apifit-miel', id from p;
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '450G', '450 g · frasco de vidrio', '{"supplier_code":"EM0006_4","format":"Envase de Vidrio","weight_g":450,"height_cm":12,"width_cm":5.5,"depth_cm":6.2,"image":"/img/products/EM0006_4.webp"}'::jsonb, null, 10, 0 from seed_products where key = 'apifit-miel';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '500G', '500 g · botella', '{"supplier_code":"EM0006_1","format":"Botella","weight_g":500,"height_cm":17,"width_cm":7,"depth_cm":4,"image":"/img/products/EM0006_1.webp"}'::jsonb, null, 10, 1 from seed_products where key = 'apifit-miel';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0006_4.webp', '/img/products/EM0006_4-400.webp', 'Miel de abejas natural', 800, 1200, 0 from seed_products where key = 'apifit-miel';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0006_1.webp', '/img/products/EM0006_1-400.webp', 'Miel de abejas natural', 549, 750, 1 from seed_products where key = 'apifit-miel';

-- apifit-jengibre (EM0006_2)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Miel con jengibre y limón', 'Frasco de vidrio de 250 g.', 'Combinación de miel, jengibre y limón en envase de vidrio. Una mezcla de sabores para disfrutar sola o como complemento de bebidas y preparaciones.', 26990, 10, 250,
         '{}'::text[], '{"art":"jar","colors":["#FFF4CC","#E59A00"],"label":"Miel y jengibre"}'::jsonb, false, false, 'EM0006_2', '{"format":"Envase de Vidrio","weight_g":250,"height_cm":8,"width_cm":7.5,"depth_cm":7}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 984)
  from public.ambassadors a, public.categories c where a.code = 'EM0006' and c.code = 'MIE'
  returning id
)
insert into seed_products select 'apifit-jengibre', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0006_2.webp', '/img/products/EM0006_2-400.webp', 'Miel con jengibre y limón', 800, 1200, 0 from seed_products where key = 'apifit-jengibre';

-- apifit-propoleo (EM0006_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Propóleo con miel, eucalipto y extracto de marañón', 'Frasco de vidrio de 300 g.', 'Preparación que reúne propóleo, miel, eucalipto y extracto de marañón en un práctico envase de vidrio. Una combinación de ingredientes en una sola presentación.', 29990, 10, 250,
         '{}'::text[], '{"art":"jar","colors":["#FFF4CC","#E59A00"],"label":"Propóleo y miel"}'::jsonb, false, false, 'EM0006_3', '{"format":"Envase de Vidrio","weight_g":250,"height_cm":10.5,"width_cm":6,"depth_cm":6}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 983)
  from public.ambassadors a, public.categories c where a.code = 'EM0006' and c.code = 'MIE'
  returning id
)
insert into seed_products select 'apifit-propoleo', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0006_3.webp', '/img/products/EM0006_3-400.webp', 'Propóleo con miel, eucalipto y extracto de marañón', 286, 641, 0 from seed_products where key = 'apifit-propoleo';

-- apifit-cacao (EM0006_5)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Miel con cacao', 'Frasco de vidrio de 250 g.', 'Una combinación de miel y cacao en envase de vidrio. Una propuesta para disfrutar nuevos matices de sabor en desayunos, bebidas y preparaciones dulces.', 26990, 10, 250,
         '{}'::text[], '{"art":"jar","colors":["#FFF4CC","#E59A00"],"label":"Miel y cacao"}'::jsonb, false, false, 'EM0006_5', '{"format":"Envase de Vidrio","weight_g":250,"height_cm":8,"width_cm":7.5,"depth_cm":7}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 982)
  from public.ambassadors a, public.categories c where a.code = 'EM0006' and c.code = 'MIE'
  returning id
)
insert into seed_products select 'apifit-cacao', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0006_5.webp', '/img/products/EM0006_5-400.webp', 'Miel con cacao', 800, 1200, 0 from seed_products where key = 'apifit-cacao';

-- bambuqueras-achiras (EM0007_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Achiras Bambuqueras', 'Achiras huilenses en caja de 75 g.', 'Achiras tradicionales en presentación de caja. Un producto de sabor regional, ideal para compartir o llevar como detalle representativo del Huila.', 10000, 10, 75,
         '{}'::text[], '{"art":"achira","colors":["#FDEBD0","#D98A1F"]}'::jsonb, false, false, 'EM0007_1', '{"format":"Caja","weight_g":75,"height_cm":10,"width_cm":20,"depth_cm":10}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 981)
  from public.ambassadors a, public.categories c where a.code = 'EM0007' and c.code = 'TIP'
  returning id
)
insert into seed_products select 'bambuqueras-achiras', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0007_1.webp', '/img/products/EM0007_1-400.webp', 'Achiras Bambuqueras', 935, 1200, 0 from seed_products where key = 'bambuqueras-achiras';

-- macchi-ecru (EM0008_2, EM0008_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Abanico Écru en madera de cedro', 'Pieza de estilo con estructura en cedro achapo.', 'Abanico de la línea Macchi Infinite con estructura en madera de cedro achapo, en formato Compact (24 cm) o Standard (28 cm). Un accesorio funcional y de estilo que ofrece amplitud al abanicar sin perder ligereza.', 75000, 20, null,
         '{}'::text[], '{"art":"bar","colors":["#F7E6DA","#B14A3A"],"label":"Abanico"}'::jsonb, false, false, null, null,
         'aprobado', now(), now() - make_interval(mins => 980)
  from public.ambassadors a, public.categories c where a.code = 'EM0008' and c.code = 'ART'
  returning id
)
insert into seed_products select 'macchi-ecru', id from p;
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'C24', 'Compact · 24 cm', '{"supplier_code":"EM0008_2","format":"Bolsa tela","weight_g":90,"height_cm":28,"width_cm":15,"depth_cm":4,"image":"/img/products/EM0008_2.webp"}'::jsonb, null, 10, 0 from seed_products where key = 'macchi-ecru';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, 'S28', 'Standard · 28 cm', '{"supplier_code":"EM0008_1","format":"Bolsa tela","weight_g":100,"height_cm":28,"width_cm":15,"depth_cm":4,"image":"/img/products/EM0008_1.webp"}'::jsonb, 95000, 10, 1 from seed_products where key = 'macchi-ecru';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0008_2.webp', '/img/products/EM0008_2-400.webp', 'Abanico Écru en madera de cedro', 675, 1200, 0 from seed_products where key = 'macchi-ecru';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0008_1.webp', '/img/products/EM0008_1-400.webp', 'Abanico Écru en madera de cedro', 799, 1200, 1 from seed_products where key = 'macchi-ecru';

-- macchi-noche (EM0008_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Abanico Noche Standard · 28 cm', 'La versión más imponente, en cedro achapo.', 'La versión más imponente de la línea Macchi Infinite. Su apertura generosa y estructura en madera de cedro achapo hacen de este abanico un accesorio que combina funcionalidad y estilo.', 95000, 10, 100,
         '{}'::text[], '{"art":"bar","colors":["#F7E6DA","#B14A3A"],"label":"Abanico"}'::jsonb, false, false, 'EM0008_3', '{"format":"Bolsa tela","weight_g":100,"height_cm":30,"width_cm":15,"depth_cm":4}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 979)
  from public.ambassadors a, public.categories c where a.code = 'EM0008' and c.code = 'ART'
  returning id
)
insert into seed_products select 'macchi-noche', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0008_3.webp', '/img/products/EM0008_3-400.webp', 'Abanico Noche Standard · 28 cm', 800, 1200, 0 from seed_products where key = 'macchi-noche';

-- macchi-panthere (EM0008_4)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Abanico Panthère Compact · 24 cm', 'Versátil, cómodo y sofisticado.', 'Un abanico de formato compacto, versátil y sofisticado. Su tamaño ofrece una buena amplitud al abanicar, manteniendo la ligereza que caracteriza a Macchi Infinite.', 75000, 10, 90,
         '{}'::text[], '{"art":"bar","colors":["#F7E6DA","#B14A3A"],"label":"Abanico"}'::jsonb, false, false, 'EM0008_4', '{"format":"Bolsa tela","weight_g":90,"height_cm":28,"width_cm":15,"depth_cm":4}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 978)
  from public.ambassadors a, public.categories c where a.code = 'EM0008' and c.code = 'ART'
  returning id
)
insert into seed_products select 'macchi-panthere', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0008_4.webp', '/img/products/EM0008_4-400.webp', 'Abanico Panthère Compact · 24 cm', 675, 1200, 0 from seed_products where key = 'macchi-panthere';

-- shalena-barra (EM0009_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate de mesa en barra 100% cacao · 250 g', 'Barra de chocolate de mesa 100% cacao.', 'Chocolate de mesa en barra, elaborado con 100 % cacao. Una presentación de 250 gramos para preparar bebidas y disfrutar el carácter propio del cacao.', 30000, 10, 250,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"]}'::jsonb, false, false, 'EM0009_1', '{"format":"Caja","weight_g":250,"height_cm":13,"width_cm":2.8,"depth_cm":11}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 977)
  from public.ambassadors a, public.categories c where a.code = 'EM0009' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'shalena-barra', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0009_1.webp', '/img/products/EM0009_1-400.webp', 'Chocolate de mesa en barra 100% cacao · 250 g', 675, 1200, 0 from seed_products where key = 'shalena-barra';

-- shalena-sabores (EM0009_2)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate al 55%: amazónico, mexicano, enchilado, sal y pimienta', 'Chocolate de consumo directo, 45 g.', 'Chocolate amazónico y mexicano, además de variedades enchiladas y con sal y pimienta. Elaborado con 55 % de cacao, en una presentación práctica para disfrutar directamente.', 15000, 10, 45,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"]}'::jsonb, false, false, 'EM0009_2', '{"format":"Caja","weight_g":45,"height_cm":11,"width_cm":0.7,"depth_cm":7}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 976)
  from public.ambassadors a, public.categories c where a.code = 'EM0009' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'shalena-sabores', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0009_2.webp', '/img/products/EM0009_2-400.webp', 'Chocolate al 55%: amazónico, mexicano, enchilado, sal y pimienta', 800, 1200, 0 from seed_products where key = 'shalena-sabores';

-- shalena-chocolatinas (EM0009_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolatinas al 55%, 70% y 75%', 'Chocolate de consumo directo, 90 g.', 'Chocolatina disponible en diferentes porcentajes de cacao: 55 %, 70 % y 75 %. Una opción para elegir la intensidad de chocolate que prefieras.', 20000, 10, 90,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"]}'::jsonb, false, false, 'EM0009_3', '{"format":"Caja","weight_g":90,"height_cm":20,"width_cm":0.7,"depth_cm":8}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 975)
  from public.ambassadors a, public.categories c where a.code = 'EM0009' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'shalena-chocolatinas', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0009_3.webp', '/img/products/EM0009_3-400.webp', 'Chocolatinas al 55%, 70% y 75%', 540, 720, 0 from seed_products where key = 'shalena-chocolatinas';

-- shalena-intenso (EM0009_4)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate intenso al 80% y 90%', 'Chocolate de consumo directo, 90 g.', 'Chocolate de consumo directo en variedades de 80 % y 90 % de cacao, para quienes prefieren un perfil de sabor más intenso.', 25000, 10, 90,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"]}'::jsonb, false, false, 'EM0009_4', '{"format":"Caja","weight_g":90,"height_cm":20,"width_cm":0.7,"depth_cm":8}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 974)
  from public.ambassadors a, public.categories c where a.code = 'EM0009' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'shalena-intenso', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0009_4.webp', '/img/products/EM0009_4-400.webp', 'Chocolate intenso al 80% y 90%', 900, 1200, 0 from seed_products where key = 'shalena-intenso';

-- shalena-nibs (EM0009_5)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Nibs de cacao caramelizados', 'Bolsa de 50 g.', 'Nibs de cacao caramelizados en una presentación práctica. Una alternativa crujiente para disfrutar como snack o acompañar otras preparaciones.', 15000, 10, 50,
         '{}'::text[], '{"art":"bar","colors":["#FCEFC2","#6B2F22"],"label":"Nibs de cacao"}'::jsonb, false, false, 'EM0009_5', '{"format":"Bolsa","weight_g":50,"height_cm":10,"width_cm":3,"depth_cm":8}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 973)
  from public.ambassadors a, public.categories c where a.code = 'EM0009' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'shalena-nibs', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0009_5.webp', '/img/products/EM0009_5-400.webp', 'Nibs de cacao caramelizados', 900, 1200, 0 from seed_products where key = 'shalena-nibs';

-- tachacoa-100 (EM0010_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate de mesa en bola 100% cacao con nuez moscada, canela y clavos', 'Bolsa de 20 bolas.', 'Chocolate de mesa en bola elaborado con 100 % cacao y una mezcla de nuez moscada, canela y clavos. Una preparación de sabor profundo con notas especiadas.', 46000, 10, 250,
         '{}'::text[], '{"art":"ball","colors":["#F6E7C9","#5A2E1E"]}'::jsonb, false, false, 'EM0010_1', '{"format":"Bolsas de 20 unidades","weight_g":250,"height_cm":24,"width_cm":16.5,"depth_cm":5}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 972)
  from public.ambassadors a, public.categories c where a.code = 'EM0010' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'tachacoa-100', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0010_1.webp', '/img/products/EM0010_1-400.webp', 'Chocolate de mesa en bola 100% cacao con nuez moscada, canela y clavos', 800, 1200, 0 from seed_products where key = 'tachacoa-100';

-- tachacoa-40 (EM0010_2, EM0010_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Chocolate de mesa en bola 40% con nuez moscada, canela y clavos', 'Receta tradicional del desierto de la Tatacoa.', 'Chocolate de mesa en bola con 40 % de cacao, acompañado de nuez moscada, canela y clavos. Una opción para preparar una bebida tradicional y aromática.', 18000, 20, null,
         '{}'::text[], '{"art":"ball","colors":["#F6E7C9","#5A2E1E"]}'::jsonb, false, false, null, null,
         'aprobado', now(), now() - make_interval(mins => 971)
  from public.ambassadors a, public.categories c where a.code = 'EM0010' and c.code = 'CHO'
  returning id
)
insert into seed_products select 'tachacoa-40', id from p;
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '10U', '10 bolas · 250 g', '{"supplier_code":"EM0010_2","format":"Bolsa de 10 unidades","weight_g":250,"height_cm":24,"width_cm":16.5,"depth_cm":5,"image":"/img/products/EM0010_2.webp"}'::jsonb, null, 10, 0 from seed_products where key = 'tachacoa-40';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '20U', '20 bolas · 500 g', '{"supplier_code":"EM0010_3","format":"Bolsa de 20 unidades","weight_g":500,"height_cm":30,"width_cm":24,"depth_cm":8,"image":"/img/products/EM0010_3.webp"}'::jsonb, 35000, 10, 1 from seed_products where key = 'tachacoa-40';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0010_2.webp', '/img/products/EM0010_2-400.webp', 'Chocolate de mesa en bola 40% con nuez moscada, canela y clavos', 800, 1200, 0 from seed_products where key = 'tachacoa-40';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0010_3.webp', '/img/products/EM0010_3-400.webp', 'Chocolate de mesa en bola 40% con nuez moscada, canela y clavos', 800, 1200, 1 from seed_products where key = 'tachacoa-40';

-- horizonte-cafe (EM0011_3, EM0011_2, EM0011_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Café especial Café Horizonte', 'Notas cítricas, achocolatadas y apaneladas. Incluye una semilla para sembrar.', 'Café especial elaborado a partir de granos seleccionados de alta calidad. Presenta notas sensoriales cítricas, achocolatadas y apaneladas, que ofrecen una taza balanceada, aromática y de excelente sabor.', 14000, 30, null,
         '{}'::text[], '{"art":"tea","colors":["#F3E6D8","#4A2C1E"],"label":"Café Horizonte"}'::jsonb, false, false, null, null,
         'aprobado', now(), now() - make_interval(mins => 970)
  from public.ambassadors a, public.categories c where a.code = 'EM0011' and c.code = 'CAF'
  returning id
)
insert into seed_products select 'horizonte-cafe', id from p;
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '125G', '125 g · molido', '{"supplier_code":"EM0011_3","format":"Bolsa semi biodegradable.","weight_g":125,"height_cm":12,"width_cm":6,"depth_cm":4,"image":"/img/products/EM0011_3.webp"}'::jsonb, null, 10, 0 from seed_products where key = 'horizonte-cafe';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '250G', '250 g · molido', '{"supplier_code":"EM0011_2","format":"Bolsa semi biodegradable.","weight_g":250,"height_cm":15,"width_cm":10,"depth_cm":5,"image":"/img/products/EM0011_2.webp"}'::jsonb, 23000, 10, 1 from seed_products where key = 'horizonte-cafe';
insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, '500G', '500 g · grano o molido', '{"supplier_code":"EM0011_1","format":"Bolsa semi biodegradable con doble proteccion de manera artesanal","weight_g":500,"height_cm":17,"width_cm":12,"depth_cm":6,"image":"/img/products/EM0011_1.webp"}'::jsonb, 45000, 10, 2 from seed_products where key = 'horizonte-cafe';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0011_3.webp', '/img/products/EM0011_3-400.webp', 'Café especial Café Horizonte', 800, 1200, 0 from seed_products where key = 'horizonte-cafe';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0011_2.webp', '/img/products/EM0011_2-400.webp', 'Café especial Café Horizonte', 800, 1200, 1 from seed_products where key = 'horizonte-cafe';
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0011_1.webp', '/img/products/EM0011_1-400.webp', 'Café especial Café Horizonte', 800, 1200, 2 from seed_products where key = 'horizonte-cafe';

-- indian-pureza (EM0012_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Cerveza artesanal INDIAN · Pureza Alemana', 'Malta, lúpulo, levadura y agua, según la ley de pureza alemana.', 'Cerveza elaborada siguiendo prácticas tradicionales y los principios de la ley alemana de pureza Reinheitsgebot, que establece malta, lúpulo, levadura y agua como ingredientes principales permitidos.', 288000, 10, 8400,
         '{}'::text[], '{"art":"bar","colors":["#FFF1C7","#B8741A"],"label":"Cerveza artesanal"}'::jsonb, false, true, 'EM0012_1', '{"format":"Botella y barril","weight_g":8400,"height_cm":28,"width_cm":40,"depth_cm":21}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 969)
  from public.ambassadors a, public.categories c where a.code = 'EM0012' and c.code = 'TEB'
  returning id
)
insert into seed_products select 'indian-pureza', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0012_1.webp', '/img/products/EM0012_1-400.webp', 'Cerveza artesanal INDIAN · Pureza Alemana', 800, 1200, 0 from seed_products where key = 'indian-pureza';

-- indian-gaitana (EM0012_2)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Cerveza Gaitana Dorada · caja x 24', 'Tributo a la cacica Gaitana. 100% malta Pilsen, 5% a 5,5% de alcohol.', 'Una cerveza que rinde homenaje a la cacica Gaitana, figura que representa identidad, soberanía, fortaleza y liderazgo de las mujeres huilenses y colombianas.', 288000, 10, 8000,
         '{}'::text[], '{"art":"bar","colors":["#FFF1C7","#B8741A"],"label":"Gaitana Dorada"}'::jsonb, false, true, 'EM0012_2', '{"format":"Caja de 24 unidades de botella","weight_g":8000,"height_cm":28,"width_cm":40,"depth_cm":21}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 968)
  from public.ambassadors a, public.categories c where a.code = 'EM0012' and c.code = 'TEB'
  returning id
)
insert into seed_products select 'indian-gaitana', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0012_2.webp', '/img/products/EM0012_2-400.webp', 'Cerveza Gaitana Dorada · caja x 24', 800, 1200, 0 from seed_products where key = 'indian-gaitana';

-- indian-serrania (EM0012_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Cerveza Serranía Rojas · caja x 24', 'Homenaje a la Serranía de Chiribiquete. 5% a 5,5% de alcohol.', 'Una cerveza inspirada en la Serranía de Chiribiquete, uno de los tesoros naturales de Colombia. Su nombre evoca la grandeza de este territorio entre Guaviare y Caquetá.', 288000, 10, 8000,
         '{}'::text[], '{"art":"bar","colors":["#FFF1C7","#B8741A"],"label":"Serranía Roja"}'::jsonb, false, true, 'EM0012_3', '{"format":"Caja de 24 botellas","weight_g":8000,"height_cm":28,"width_cm":40,"depth_cm":21}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 967)
  from public.ambassadors a, public.categories c where a.code = 'EM0012' and c.code = 'TEB'
  returning id
)
insert into seed_products select 'indian-serrania', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0012_3.webp', '/img/products/EM0012_3-400.webp', 'Cerveza Serranía Rojas · caja x 24', 800, 1200, 0 from seed_products where key = 'indian-serrania';

-- maca-cafe (EM0014_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Candongas Grano de Café', 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', 'Dije elaborado en zamak con baño de oro de 24 quilates y laca cataforética. Inspirado en el grano de café y en las raíces del territorio. Se entrega en caja tipo libro con mensaje de inspiración, protegida por una bolsa.', 95200, 10, 13,
         '{}'::text[], '{"art":"bar","colors":["#F7EFD9","#8A6A1F"],"label":"Joyería"}'::jsonb, false, false, 'EM0014_1', '{"format":"Cada pieza de Raíces de mi Tierra se entrega en una caja tipo libro, diseñada especialmente para la colección y con un mensaje que cuenta su esencia e inspiración. La caja se entrega protegida dentro de su bolsa, lista para regalar o conservar.","weight_g":13,"height_cm":16,"width_cm":12,"depth_cm":7}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 966)
  from public.ambassadors a, public.categories c where a.code = 'EM0014' and c.code = 'MOD'
  returning id
)
insert into seed_products select 'maca-cafe', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0014_1.webp', '/img/products/EM0014_1-400.webp', 'Candongas Grano de Café', 675, 1200, 0 from seed_products where key = 'maca-cafe';

-- maca-cholupa (EM0014_2)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Candongas Flor de Cholupa', 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', 'Pieza inspirada en la flor de la cholupa, símbolo de la tierra huilense. Elaborada en zamak con baño de oro de 24 quilates y laca cataforética; se presenta en caja tipo libro con mensaje de inspiración.', 95200, 10, 13,
         '{}'::text[], '{"art":"bar","colors":["#F7EFD9","#8A6A1F"],"label":"Joyería"}'::jsonb, false, false, 'EM0014_2', '{"format":"Cada pieza de Raíces de mi Tierra se entrega en una caja tipo libro, diseñada especialmente para la colección y con un mensaje que cuenta su esencia e inspiración. La caja se entrega protegida dentro de su bolsa, lista para regalar o conservar.","weight_g":13,"height_cm":16,"width_cm":12,"depth_cm":7}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 965)
  from public.ambassadors a, public.categories c where a.code = 'EM0014' and c.code = 'MOD'
  returning id
)
insert into seed_products select 'maca-cholupa', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0014_2.webp', '/img/products/EM0014_2-400.webp', 'Candongas Flor de Cholupa', 675, 1200, 0 from seed_products where key = 'maca-cholupa';

-- maca-chiva (EM0014_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Candongas Chiva', 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', 'Candongas inspiradas en la chiva, ícono de la cultura y los caminos de nuestra tierra. Elaboradas en zamak con baño de oro de 24 quilates y laca cataforética, evocan la identidad huilense.', 95200, 10, 13,
         '{}'::text[], '{"art":"bar","colors":["#F7EFD9","#8A6A1F"],"label":"Joyería"}'::jsonb, false, false, 'EM0014_3', '{"format":"Cada pieza de Raíces de mi Tierra se entrega en una caja tipo libro, diseñada especialmente para la colección y con un mensaje que cuenta su esencia e inspiración. La caja se entrega protegida dentro de su bolsa, lista para regalar o conservar.","weight_g":13,"height_cm":16,"width_cm":12,"depth_cm":7}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 964)
  from public.ambassadors a, public.categories c where a.code = 'EM0014' and c.code = 'MOD'
  returning id
)
insert into seed_products select 'maca-chiva', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0014_3.webp', '/img/products/EM0014_3-400.webp', 'Candongas Chiva', 675, 1200, 0 from seed_products where key = 'maca-chiva';

-- maca-sanjuanero (EM0014_4)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Candongas Pareja del Sanjuanero', 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', 'Una joya inspirada en la pareja del Sanjuanero Huilense, símbolo de cultura, danza y tradición. Elaborada en zamak con baño de oro de 24 quilates y laca cataforética, se entrega en caja tipo libro.', 95200, 10, 13,
         '{}'::text[], '{"art":"bar","colors":["#F7EFD9","#8A6A1F"],"label":"Joyería"}'::jsonb, false, false, 'EM0014_4', '{"format":"Cada pieza de Raíces de mi Tierra se entrega en una caja tipo libro, diseñada especialmente para la colección y con un mensaje que cuenta su esencia e inspiración. La caja se entrega protegida dentro de su bolsa, lista para regalar o conservar.","weight_g":13,"height_cm":16,"width_cm":12,"depth_cm":7}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 963)
  from public.ambassadors a, public.categories c where a.code = 'EM0014' and c.code = 'MOD'
  returning id
)
insert into seed_products select 'maca-sanjuanero', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0014_4.webp', '/img/products/EM0014_4-400.webp', 'Candongas Pareja del Sanjuanero', 675, 1200, 0 from seed_products where key = 'maca-sanjuanero';

-- maca-collar (EM0014_5)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Collar Raíces', 'Chiva, cholupa, Sanjuanero, café y el Águila de San Agustín en una joya.', 'Collar que reúne símbolos emblemáticos del Huila: la chiva, la flor de cholupa, la pareja del Sanjuanero, el grano de café y el Águila de San Agustín. Elaborado en zamak con baño de oro de 24 quilates y laca cataforética.', 178500, 10, 32,
         '{}'::text[], '{"art":"bar","colors":["#F7EFD9","#8A6A1F"],"label":"Joyería"}'::jsonb, false, false, 'EM0014_5', '{"format":"Cada pieza de Raíces de mi Tierra se entrega en una caja tipo libro, diseñada especialmente para la colección y con un mensaje que cuenta su esencia e inspiración. La caja se entrega protegida dentro de su bolsa, lista para regalar o conservar.","weight_g":32,"height_cm":16,"width_cm":12,"depth_cm":7}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 962)
  from public.ambassadors a, public.categories c where a.code = 'EM0014' and c.code = 'MOD'
  returning id
)
insert into seed_products select 'maca-collar', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0014_5.webp', '/img/products/EM0014_5-400.webp', 'Collar Raíces', 675, 1200, 0 from seed_products where key = 'maca-collar';

-- adames-boyaca (EM0002_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Vestido de baño Boyacá', 'Enterizo con escote cuadrado tejido y panty anudado.', 'Vestido de baño enterizo con escote cuadrado tejido y panty anudado. Una pieza de diseño resortwear pensada para destacar en días de sol y descanso.', 350000, 10, 350,
         array['Diseño huilense'], '{"art":"swim","colors":["#DDF0F2","#0B7A3B"]}'::jsonb, false, false, 'EM0002_1', '{"format":"Caja","weight_g":350,"height_cm":5,"width_cm":28,"depth_cm":28}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 961)
  from public.ambassadors a, public.categories c where a.code = 'EM0002' and c.code = 'MOD'
  returning id
)
insert into seed_products select 'adames-boyaca', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0002_1.webp', '/img/products/EM0002_1-400.webp', 'Vestido de baño Boyacá', 800, 1200, 0 from seed_products where key = 'adames-boyaca';

-- acacias-fit (EM0016_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Acacias Fit · té natural', 'Té natural en bolsitas.', 'Té natural en presentación de bolsitas. Una opción práctica para preparar en casa y disfrutar en cualquier momento del día.', 35000, 10, 250,
         '{}'::text[], '{"art":"tea","colors":["#E8EFE2","#0B7A3B"]}'::jsonb, false, false, 'EM0016_1', '{"format":"Caja , bolsitas","weight_g":250,"height_cm":30,"width_cm":30,"depth_cm":30}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 960)
  from public.ambassadors a, public.categories c where a.code = 'EM0016' and c.code = 'TEB'
  returning id
)
insert into seed_products select 'acacias-fit', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0016_1.webp', '/img/products/EM0016_1-400.webp', 'Acacias Fit · té natural', 960, 1200, 0 from seed_products where key = 'acacias-fit';

-- mva-shampoo (EM0015_1)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Shampoo de romero y extracto de café', 'Fortalece la raíz y aporta brillo. 450 ml.', 'Fórmula capilar que combina romero y extracto de café. La descripción del productor destaca su uso para fortalecer la raíz y aportar brillo al cabello.', 35000, 10, 450,
         '{}'::text[], '{"art":"tea","colors":["#EEF2EC","#5E6B62"],"label":"Shampoo"}'::jsonb, false, false, 'EM0015_1', '{"format":"Botella","weight_g":450,"height_cm":21.37,"width_cm":7.84,"depth_cm":7.84}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 959)
  from public.ambassadors a, public.categories c where a.code = 'EM0015' and c.code = 'CUI'
  returning id
)
insert into seed_products select 'mva-shampoo', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0015_1.webp', '/img/products/EM0015_1-400.webp', 'Shampoo de romero y extracto de café', 801, 1200, 0 from seed_products where key = 'mva-shampoo';

-- mva-acondicionador (EM0015_2)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Acondicionador de coco', 'Suavidad y desenredo fácil. 450 ml.', 'Acondicionador con aceite de coco, rico en ácido láurico. Su fórmula ayuda a proteger la fibra capilar durante el lavado, aportar suavidad y facilitar el desenredo.', 35000, 10, 450,
         '{}'::text[], '{"art":"tea","colors":["#EEF2EC","#5E6B62"],"label":"Acondicionador"}'::jsonb, false, false, 'EM0015_2', '{"format":"Botella","weight_g":450,"height_cm":18.7,"width_cm":7.84,"depth_cm":6}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 958)
  from public.ambassadors a, public.categories c where a.code = 'EM0015' and c.code = 'CUI'
  returning id
)
insert into seed_products select 'mva-acondicionador', id from p;
insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, '/img/products/EM0015_2.webp', '/img/products/EM0015_2-400.webp', 'Acondicionador de coco', 965, 1200, 0 from seed_products where key = 'mva-acondicionador';

-- mva-coctel (EM0015_3)
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, 'Cóctel capilar de frutas y aceites vegetales', 'Nutrición para el cabello. 300 ml.', 'Mezcla capilar de frutas y aceites vegetales que reúne vitaminas, antioxidantes y ácidos grasos esenciales. Diseñada como tratamiento cosmético para nutrir y cuidar el cabello.', 35000, 10, 300,
         '{}'::text[], '{"art":"tea","colors":["#EEF2EC","#5E6B62"],"label":"Cóctel capilar"}'::jsonb, false, false, 'EM0015_3', '{"format":"Botella","weight_g":300,"height_cm":14.5,"width_cm":6,"depth_cm":4.5}'::jsonb,
         'aprobado', now(), now() - make_interval(mins => 957)
  from public.ambassadors a, public.categories c where a.code = 'EM0015' and c.code = 'CUI'
  returning id
)
insert into seed_products select 'mva-coctel', id from p;

-- Kits (precio PROVISIONAL ≈ 8% menos que por separado; el admin lo ajusta y decide cuáles van al home)

with k as (
  insert into public.kits (name, tagline, price, bg_color, fg_color, mockup, badge, is_active, show_on_home, sort_order)
  values ('Ruta del Cacao', '3 embajadores · 3 municipios', 62000, '#0B7A3B', '#FFFFFF', '{"art":"ball"}'::jsonb, 'El más regalado', true, true, 1)
  returning id
)
insert into public.kit_items (kit_id, product_id, sort_order)
select k.id, s.product_id, x.ord from k, (values ('susana-100', 0), ('bried-cardamomo', 1), ('shalena-sabores', 2)) x(key, ord)
join seed_products s on s.key = x.key;

with k as (
  insert into public.kits (name, tagline, price, bg_color, fg_color, mockup, badge, is_active, show_on_home, sort_order)
  values ('Tarde en la Tatacoa', 'Onces huilenses para compartir', 83000, '#F2B705', '#2F3A33', '{"art":"achira"}'::jsonb, null, true, true, 2)
  returning id
)
insert into public.kit_items (kit_id, product_id, sort_order)
select k.id, s.product_id, x.ord from k, (values ('bambuqueras-achiras', 0), ('tachacoa-100', 1), ('acacias-fit', 2)) x(key, ord)
join seed_products s on s.key = x.key;

with k as (
  insert into public.kits (name, tagline, price, bg_color, fg_color, mockup, badge, is_active, show_on_home, sort_order)
  values ('Dulce del Sur', 'Del macizo a tu mesa', 47000, '#F39200', '#2F3A33', '{"art":"jar"}'::jsonb, null, true, true, 3)
  returning id
)
insert into public.kit_items (kit_id, product_id, sort_order)
select k.id, s.product_id, x.ord from k, (values ('apifit-jengibre', 0), ('bambuqueras-achiras', 1), ('shalena-sabores', 2)) x(key, ord)
join seed_products s on s.key = x.key;
