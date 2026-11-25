/**
 * Vista previa para robots de redes sociales (WhatsApp, Facebook, X, Telegram…).
 * Esos robots no ejecutan JavaScript, así que vercel.json les envía aquí las
 * páginas de producto, embajador, kit, categoría y zona con sus etiquetas
 * Open Graph ya armadas. Las personas siguen recibiendo la app normal.
 *
 *   GET /api/og?path=/producto/<slug>
 */
import { clip, esc, origin, rest } from './_shared.js';

const SITE = 'Mercado Origen';
const DEFAULT = {
  title: 'Mercado Origen · Productos 100% del Huila',
  description: 'Café, cacao, miel y artesanías de los productores del Huila. Un carrito, un pago, un envío.',
  image: '/og.jpg',
  type: 'website',
};
const money = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const enc = encodeURIComponent;

async function describe(path) {
  const [, kind, slug] = path.match(/^\/(producto|embajador|kit|categoria|zona)\/([\w-]+)\/?$/) || [];
  if (!kind) {
    if (path.startsWith('/tienda')) return { title: 'Tienda: todo el Huila', description: 'Compra directo a los productores de los 37 municipios del Huila.' };
    if (path.startsWith('/embajadores')) return { title: 'Embajadores del Huila', description: 'Conoce a los productores que hacen posible Mercado Origen.' };
    if (path.startsWith('/kits')) return { title: 'Kits y regalos del Huila', description: 'Cajas con productos de varios embajadores, listas para regalar.' };
    return {};
  }
  if (kind === 'producto') {
    const [p] = (await rest(`products?slug=eq.${enc(slug)}&select=name,short_description,description,price,images:product_images(url,sort_order),ambassador:ambassadors(brand_name)`)) || [];
    if (!p) return {};
    const img = [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
    return {
      title: p.name,
      description: `${p.short_description || p.description || ''} De ${p.ambassador?.brand_name || 'un embajador del Huila'} · ${money(p.price)}`,
      image: img, type: 'product', price: p.price,
    };
  }
  if (kind === 'embajador') {
    const [a] = (await rest(`ambassadors?slug=eq.${enc(slug)}&select=brand_name,short_description,avatar_url,banner_url`)) || [];
    return a ? { title: a.brand_name, description: a.short_description, image: a.banner_url || a.avatar_url, type: 'profile' } : {};
  }
  if (kind === 'kit') {
    const [k] = (await rest(`kits?slug=eq.${enc(slug)}&select=name,tagline,price,image_url`)) || [];
    return k ? { title: `Kit ${k.name}`, description: `${k.tagline || ''}. ${money(k.price)} · productos de varios embajadores en un solo envío.`, image: k.image_url } : {};
  }
  if (kind === 'categoria') {
    const [c] = (await rest(`categories?slug=eq.${enc(slug)}&select=name,tagline,image_url`)) || [];
    return c ? { title: c.name, description: `${c.name} del Huila: ${c.tagline || ''}`, image: c.image_url } : {};
  }
  const [z] = (await rest(`subregions?slug=eq.${enc(slug)}&select=name,description,image_url`)) || [];
  return z ? { title: `Zona ${z.name} del Huila`, description: z.description, image: z.image_url } : {};
}

export async function GET(request) {
  const base = origin(request);
  const path = new URL(request.url).searchParams.get('path') || '/';
  const d = { ...DEFAULT, ...Object.fromEntries(Object.entries(await describe(path)).filter(([, v]) => v)) };
  const title = d.title === DEFAULT.title ? d.title : `${d.title} · ${SITE}`;
  // Fotos del catálogo: versión JPG 1200×630 (WhatsApp no siempre muestra WebP).
  const image = new URL(String(d.image).replace(/^(\/img\/products\/[\w-]+)\.webp$/, '$1.jpg'), base).href;
  const url = new URL(path, base).href;
  const desc = clip(d.description);
  const html = `<!doctype html><html lang="es-CO"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="${SITE}"><meta property="og:locale" content="es_CO">
<meta property="og:type" content="${esc(d.type)}"><meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(d.title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
${d.price ? `<meta property="product:price:amount" content="${d.price}"><meta property="product:price:currency" content="COP">` : ''}
<meta name="twitter:card" content="summary_large_image">
</head><body><h1>${esc(d.title)}</h1><p>${esc(desc)}</p><p><a href="${esc(url)}">${esc(url)}</a></p></body></html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' },
  });
}
