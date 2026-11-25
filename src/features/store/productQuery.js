import { supabase } from '../../lib/supabase.js';

// Consulta de la página de producto, compartida con las tarjetas para
// precargarla al pasar el mouse o tocar (la página abre sin esperar).
const FIELDS = `
  id, slug, sku, name, short_description, description, price, compare_at_price, stock, badges, mockup, is_featured,
  is_age_restricted, rating_avg, rating_count, sales_count, weight_grams, created_at,
  category:categories (code, slug, name),
  ambassador:ambassadors (id, slug, brand_name, initials, avatar_url, rating_avg, rating_count, sales_count, short_description,
    municipality:municipalities (name, slug, subregion:subregions (slug, name))),
  images:product_images (url, thumb_url, alt, width, height, sort_order),
  variants:product_variants (id, sku, name, attributes, price_override, stock, is_active, sort_order)`;

export const productQuery = (slug) => ({
  queryKey: ['product', slug],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from('products').select(FIELDS).eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data;
  },
});
