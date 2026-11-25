-- =====================================================================
-- Mercado Origen · Importación del catálogo real
--  · supplier_code: código del producto en la hoja de los embajadores
--    (EM0001_2). Permite volver a importar sin duplicar.
--  · package: empaque y medidas para cotizar con la transportadora
--    { format, weight_g, height_cm, width_cm, depth_cm }
-- Las presentaciones guardan lo mismo en product_variants.attributes.
-- =====================================================================
alter table public.products
  add column if not exists supplier_code text check (char_length(supplier_code) <= 40),
  add column if not exists package jsonb;

create unique index if not exists products_supplier_code_uq on public.products (supplier_code) where supplier_code is not null;
