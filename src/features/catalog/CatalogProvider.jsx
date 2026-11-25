import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { cachedQuery } from '../../lib/cache.js';

/*
 * Catálogo desde Supabase, adaptado a la forma que ya usan los componentes del
 * home (maker, town, zone, cat, art, colors…) para no cambiar su diseño.
 * El catálogo de productos aprobados es pequeño, así que se carga completo y
 * se cachea; en la Fase 6 /tienda pasa a paginar en el servidor.
 */


const PRODUCT_FIELDS = `
  id, slug, sku, name, price, compare_at_price, stock, badges, mockup, is_featured, is_age_restricted,
  rating_avg, rating_count, sales_count, created_at,
  category:categories (code, slug, name),
  ambassador:ambassadors (id, slug, brand_name, municipality:municipalities (name, subregion:subregions (slug, name))),
  images:product_images (url, thumb_url, alt, sort_order),
  variants:product_variants (id, sku, name, attributes, price_override, stock, is_active, sort_order)`;

/** Fila de `products` (con sus relaciones) -> producto de tarjeta. */
export function toCardProduct(p) {
  const muni = p.ambassador?.municipality;
  const firstImage = [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    id: p.id,
    cartKey: `p:${p.id}`,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    maker: p.ambassador?.brand_name ?? '',
    makerSlug: p.ambassador?.slug,
    ambassadorId: p.ambassador?.id,
    town: muni?.name === 'Colombia' ? 'Colombia (Huila)' : muni?.name ?? '',
    zone: muni?.subregion?.slug ?? 'norte',
    zoneName: muni?.subregion?.name ?? '',
    cat: p.category?.slug,
    categoryName: p.category?.name,
    price: p.price,
    comparePrice: p.compare_at_price,
    stock: p.stock,
    badge: p.badges?.[0],
    badges: p.badges || [],
    art: p.mockup?.art ?? 'bar',
    colors: p.mockup?.colors ?? ['#F5F3EE', '#0B7A3B'],
    artLabel: p.mockup?.label,
    image: firstImage?.url ?? '',
    thumb: firstImage?.thumb_url ?? '',
    featured: p.is_featured,
    ageRestricted: p.is_age_restricted,
    rating: Number(p.rating_avg),
    reviews: p.rating_count,
    createdAt: p.created_at,
    // Presentaciones activas ("1 kg", "500 g"); si las hay, se elige en la página del producto.
    variants: (p.variants || []).filter((v) => v.is_active).sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({ ...v, price: v.price_override ?? p.price, cartKey: `v:${v.id}` })),
    hasVariants: p.has_variants ?? (p.variants || []).some((v) => v.is_active),
  };
}

async function fetchCatalog() {
  const [products, kits, summaries, shipping] = await Promise.all([
    supabase.from('products').select(PRODUCT_FIELDS).order('sales_count', { ascending: false }).order('created_at'),
    supabase.from('kits').select('id, slug, sku, name, tagline, price, bg_color, fg_color, mockup, badge, show_on_home, sort_order, items:kit_items (product_id, quantity, sort_order)').order('sort_order'),
    supabase.from('kit_summaries').select('*'),
    supabase.from('shipping_settings').select('free_shipping_threshold, flat_rate').maybeSingle(),
  ]);
  for (const r of [products, kits, summaries, shipping]) if (r.error) throw r.error;

  const sum = new Map(summaries.data.map((s) => [s.kit_id, s]));
  return {
    products: products.data.map(toCardProduct),
    kits: kits.data.map((k) => {
      const s = sum.get(k.id) || {};
      return {
        id: k.id,
        cartKey: `k:${k.id}`,
        slug: k.slug,
        sku: k.sku,
        name: k.name,
        note: k.tagline,
        items: [...k.items].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.product_id),
        price: k.price,
        was: s.separate_price ?? k.price,
        available: !!s.is_available,
        ageRestricted: !!s.is_age_restricted,
        bg: k.bg_color,
        fg: k.fg_color,
        art: k.mockup?.art ?? 'ball',
        badge: k.badge,
        popular: !!k.badge,
        onHome: k.show_on_home,
      };
    }),
    freeShipping: shipping.data?.free_shipping_threshold ?? 150000,
  };
}

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const cache = useMemo(() => cachedQuery('catalog', fetchCatalog), []);
  const q = useQuery({ queryKey: ['catalog'], ...cache, staleTime: 5 * 60_000 });

  const value = useMemo(() => {
    const data = q.data ?? { products: [], kits: [], freeShipping: 150000 };
    const byId = new Map(data.products.map((p) => [p.id, p]));
    const bySlug = new Map(data.products.map((p) => [p.slug, p]));
    const kitById = new Map(data.kits.map((k) => [k.id, k]));
    const kitBySlug = new Map(data.kits.map((k) => [k.slug, k]));
    const variantById = new Map(data.products.flatMap((p) => p.variants.map((v) => [v.id, { product: p, variant: v }])));
    // Destacados en el orden en que se publicaron (estable aunque cambien las ventas).
    const featured = data.products.filter((p) => p.featured).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      ...data,
      ready: q.isSuccess,
      error: q.error,
      retry: q.refetch,
      featured,
      homeKits: data.kits.filter((k) => k.onHome && k.items.every((id) => byId.has(id))),
      productById: (id) => byId.get(id),
      productBySlug: (slug) => bySlug.get(slug),
      kitById: (id) => kitById.get(id),
      kitBySlug: (slug) => kitBySlug.get(slug),
      variantById: (id) => variantById.get(id),
    };
  }, [q.data, q.isSuccess, q.error, q.refetch]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
