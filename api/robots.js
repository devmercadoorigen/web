/** /robots.txt con la dirección del sitemap según el dominio en uso. */
import { origin } from './_shared.js';

const PRIVATE = ['/cuenta', '/checkout', '/carrito', '/pago', '/pedido', '/panel', '/admin', '/login', '/registro', '/recuperar', '/api/'];

export function GET(request) {
  const body = `User-agent: *\nAllow: /\n${PRIVATE.map((p) => `Disallow: ${p}`).join('\n')}\n\nSitemap: ${origin(request)}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400' } });
}
