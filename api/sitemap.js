/**
 * /sitemap.xml generado con los datos públicos de la tienda
 * (productos aprobados, embajadores activos, kits, categorías y zonas).
 */
import { esc, origin, rest } from './_shared.js';

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);

export async function GET(request) {
  const base = origin(request);
  const [products, ambassadors, kits, categories, zones] = await Promise.all([
    rest('products?select=slug,updated_at&order=updated_at.desc&limit=5000'),
    rest('ambassadors?select=slug,updated_at&limit=1000'),
    rest('kits?select=slug,updated_at&is_active=eq.true&limit=500'),
    rest('categories?select=slug&limit=100'),
    rest('subregions?select=slug&limit=50'),
  ]);
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/tienda', priority: '0.9', changefreq: 'daily' },
    { loc: '/embajadores', priority: '0.7' },
    { loc: '/kits', priority: '0.7' },
    { loc: '/quiero-ser-embajador', priority: '0.4' },
    ...(categories || []).map((c) => ({ loc: `/categoria/${c.slug}`, priority: '0.6' })),
    ...(zones || []).map((z) => ({ loc: `/zona/${z.slug}`, priority: '0.6' })),
    ...(products || []).map((p) => ({ loc: `/producto/${p.slug}`, lastmod: day(p.updated_at), priority: '0.8' })),
    ...(ambassadors || []).map((a) => ({ loc: `/embajador/${a.slug}`, lastmod: day(a.updated_at), priority: '0.6' })),
    ...(kits || []).map((k) => ({ loc: `/kit/${k.slug}`, lastmod: day(k.updated_at), priority: '0.6' })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(base + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
