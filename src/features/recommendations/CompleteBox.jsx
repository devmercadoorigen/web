import { useMemo } from 'react';
import { Link } from 'react-router';
import { useCart } from '../cart/CartProvider.jsx';
import { useCatalog } from '../catalog/CatalogProvider.jsx';
import { money } from '../../lib/format.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { useRecommendations } from './useRecommendations.js';

/** Ids de producto que ya están en el carrito (incluye presentaciones y kits). */
export function useCartProductIds() {
  const { items } = useCart();
  const { variantById, kitById } = useCatalog();
  return useMemo(() => {
    const ids = new Set();
    for (const key of Object.keys(items)) {
      const id = key.slice(2);
      if (key.startsWith('p:')) ids.add(id);
      else if (key.startsWith('v:')) { const v = variantById(id); if (v) ids.add(v.product.id); }
      else if (key.startsWith('k:')) kitById(id)?.items.forEach((pid) => ids.add(pid));
    }
    return [...ids];
  }, [items, variantById, kitById]);
}

/** Fila compacta de sugerencia: "+" agrega; si tiene presentaciones, lleva a elegir. */
export function UpsellRow({ p, missing, onPick }) {
  const { add } = useCart();
  const closes = missing > 0 && p.price >= missing;
  return (
    <div className="zp">
      <Link to={`/producto/${p.slug}`} className="thumb" onClick={onPick} tabIndex={-1} aria-hidden="true"><ProductArt {...p} alt="" /></Link>
      <div>
        <Link to={`/producto/${p.slug}`} className="zp-name" onClick={onPick}><b>{p.name}</b></Link>
        {p.maker} · {money(p.price)}
        {closes && <span className="zp-note">Con este llegas al envío gratis</span>}
      </div>
      {p.hasVariants ? (
        <Link to={`/producto/${p.slug}`} className="zp-go" aria-label={`Elegir presentación de ${p.name}`} onClick={onPick}><Icon name="arrow" size={18} stroke={2.4} /></Link>
      ) : (
        <button type="button" aria-label={`Añadir ${p.name}`} onClick={() => add(p.cartKey)}>+</button>
      )}
    </div>
  );
}

/**
 * "Completa tu caja": sugerencias personalizadas que ayudan a llegar al envío
 * gratis (o a sumar otro sabor si ya llegó). Sin datos aún, usa la sugerencia local.
 */
export function useCompleteBox({ limit = 3, enabled = true } = {}) {
  const { items, missing } = useCart();
  const { products } = useCatalog();
  const exclude = useCartProductIds();
  const recs = useRecommendations({ exclude, target: missing }, { limit, enabled });
  const fallback = useMemo(() => {
    const target = missing || 40000;
    return products
      .filter((p) => !items[p.cartKey] && !exclude.includes(p.id) && p.stock > 0 && !p.hasVariants)
      .sort((a, b) => Math.abs(target - a.price) - Math.abs(target - b.price))
      .slice(0, limit);
  }, [products, items, exclude, missing, limit]);
  // Primero los que cierran el envío gratis, conservando el orden del servidor.
  const list = recs.items.length ? recs.items : fallback;
  const sorted = missing > 0 ? [...list.filter((p) => p.price >= missing), ...list.filter((p) => p.price < missing)] : list;
  return { items: sorted.slice(0, limit), missing, title: missing > 0 ? 'Completa tu caja' : 'Suma otro sabor' };
}
