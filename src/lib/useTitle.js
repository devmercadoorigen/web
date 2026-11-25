import { useEffect } from 'react';

const SITE = 'Mercado Origen';
const BASE_TITLE = 'Mercado Origen · Productos 100% del Huila';
const BASE_DESC = 'Marketplace del Huila: café, cacao, miel, artesanías y todo lo que se produce en los 37 municipios. Un carrito, un pago, un envío.';
const BASE_IMAGE = '/og.jpg';
// Páginas privadas o transaccionales: no se indexan (también en robots.txt).
const PRIVATE = /^\/(cuenta|checkout|carrito|pago|pedido|login|registro|recuperar|panel|admin)(\/|$)/;

const abs = (url) => {
  if (!url) return `${location.origin}${BASE_IMAGE}`;
  try { return new URL(url, location.origin).href; } catch { return url; }
};

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}
const clip = (s, n = 160) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : t;
};

function apply({ title, description, image, type = 'website', noindex = false }) {
  const full = title ? `${title} · ${SITE}` : BASE_TITLE;
  const desc = clip(description || BASE_DESC);
  const url = `${location.origin}${location.pathname}`;
  document.title = full;
  setMeta('name', 'description', desc);
  setMeta('name', 'robots', noindex || PRIVATE.test(location.pathname) ? 'noindex, nofollow' : null);
  setMeta('property', 'og:site_name', SITE);
  setMeta('property', 'og:locale', 'es_CO');
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:title', title || BASE_TITLE);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', abs(image));
  setMeta('name', 'twitter:card', 'summary_large_image');
  setCanonical(url);
}

/**
 * SEO por página: título, descripción, Open Graph (WhatsApp, Facebook…) y
 * URL canónica. Para los robots de redes que no ejecutan JavaScript, Vercel
 * sirve las mismas etiquetas desde api/og.js (ver vercel.json).
 */
export function useSeo(seo) {
  const key = JSON.stringify(seo || {});
  useEffect(() => {
    apply(seo || {});
    return () => apply({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** Título de la pestaña por página ("Mis pedidos · Mercado Origen"). */
export function useTitle(title, extra) {
  useSeo({ title, ...extra });
}
