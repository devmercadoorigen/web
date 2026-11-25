import { Link } from 'react-router';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { ProductCard } from '../catalog/Catalog.jsx';
import { useCatalog } from '../catalog/CatalogProvider.jsx';
import { useWishlist } from './useWishlist.js';

export default function WishlistPage() {
  useTitle('Lista de deseos');
  const { items, isLoading, toggle } = useWishlist();
  const { productById, ready } = useCatalog();

  if (isLoading || !ready) {
    return <div className="grid">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ aspectRatio: '0.72' }} />)}</div>;
  }

  if (!items.length) {
    return (
      <div className="empty">
        <Icon name="heart" size={40} stroke={1.6} />
        <b>Tu lista de deseos está vacía</b>
        <p>Toca el corazón de cualquier producto para guardarlo y te avisamos si baja de precio.</p>
        <Link className="btn btn-green" to="/#tienda">Explorar productos</Link>
      </div>
    );
  }

  return (
    <div className="grid wish-grid">
      {items.map((row) => {
        const p = productById(row.product_id);
        if (!p) {
          // Producto pausado o retirado: la RLS ya no lo muestra en el catálogo.
          return (
            <article key={row.product_id} className="card card-gone">
              <div className="card-gone-body">
                <Icon name="leaf" size={32} stroke={1.6} />
                <b>Este producto ya no está disponible</b>
                <button type="button" className="link-btn" onClick={() => toggle(row.product_id)}>Quitar de la lista</button>
              </div>
            </article>
          );
        }
        const dropped = row.price_at_add && p.price < row.price_at_add;
        const out = p.stock <= 0;
        return (
          <ProductCard
            key={p.id}
            p={p}
            notice={
              out ? <span className="card-notice out">Agotado por ahora</span>
              : dropped ? <span className="card-notice drop">Bajó de precio · antes {money(row.price_at_add)}</span>
              : null
            }
            soldOut={out}
          />
        );
      })}
    </div>
  );
}
