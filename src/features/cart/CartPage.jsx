import { Link, useNavigate } from 'react-router';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { UpsellRow, useCompleteBox } from '../recommendations/CompleteBox.jsx';
import { useCart } from './CartProvider.jsx';

export default function CartPage() {
  useTitle('Tu caja');
  const { lines, subtotal, missing, freeShipping, setQty } = useCart();
  const navigate = useNavigate();
  const pct = Math.min(100, (subtotal / freeShipping) * 100);
  const box = useCompleteBox({ limit: 3, enabled: lines.length > 0 });
  const makers = new Set(lines.filter((l) => l.type === 'product').map((l) => l.maker)).size;

  if (!lines.length) {
    return (
      <section className="page-state">
        <div className="wrap">
          <div className="empty">
            <Icon name="bag" size={40} stroke={1.6} />
            <b>Tu caja está vacía</b>
            <p>Mezcla productos de varios municipios: te llegan juntos en un solo envío.</p>
            <Link className="btn btn-green" to="/#tienda">Ver lo más pedido del Huila</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div className="wrap">
        <header className="account-head">
          <span className="kicker">Tu caja del Huila</span>
          <h1>Carrito</h1>
        </header>
        <div className="co-grid">
          <div className="co-main">
            <div className="panel">
              <div className="ship ship-page">
                {missing > 0 ? (
                  <>Agrega <b>{money(missing)}</b> más y tu envío es <b>gratis</b></>
                ) : (
                  <><b className="ok">¡Tu envío es gratis!</b> Todo llega en una sola caja.</>
                )}
                <div className="bar"><i style={{ width: `${pct}%` }} /></div>
              </div>
              <ul className="cart-lines">
                {lines.map((l) => (
                  <li key={l.cartKey}>
                    <div className="thumb"><ProductArt art={l.art} artLabel={l.artLabel} colors={l.colors} image={l.image} maker={l.maker} alt={l.name} /></div>
                    <div className="cart-line-info">
                      <b>{l.name}</b>
                      <span className="muted">{l.sub}</span>
                      {l.type === 'product' && l.stock < l.qty && <span className="field-error">Solo quedan {l.stock} unidades</span>}
                      {l.type === 'kit' && !l.available && <span className="field-error">Este kit se agotó</span>}
                      <div className="cart-line-actions">
                        <span className="qty">
                          <button type="button" aria-label="Quitar uno" onClick={() => setQty(l.cartKey, l.qty - 1)}>−</button>
                          <span aria-live="polite">{l.qty}</span>
                          <button type="button" aria-label="Agregar uno" onClick={() => setQty(l.cartKey, l.qty + 1)}>+</button>
                        </span>
                        <button type="button" className="link-btn danger" onClick={() => setQty(l.cartKey, 0)}>Quitar</button>
                      </div>
                    </div>
                    <b className="cart-line-total">{money(l.price * l.qty)}</b>
                  </li>
                ))}
              </ul>
            </div>
            {box.items.length > 0 && (
              <div className="panel upsell-panel">
                <h2 className="panel-title">{box.title}</h2>
                {missing > 0 && <p className="muted small">Te faltan {money(missing)} para el envío gratis. Esto va bien con lo que llevas:</p>}
                <div className="upsell-list">
                  {box.items.map((p) => <UpsellRow key={p.id} p={p} missing={missing} />)}
                </div>
              </div>
            )}
          </div>
          <aside className="co-summary">
            <div className="panel">
              <h2 className="panel-title">Resumen</h2>
              <dl className="totals">
                <dt>Subtotal</dt><dd>{money(subtotal)}</dd>
                <dt>Envío</dt><dd>{missing > 0 ? 'Se calcula al pagar' : 'Gratis'}</dd>
              </dl>
              {makers > 1 && <p className="muted small">Productos de {makers} embajadores, en un solo envío desde el Huila.</p>}
              <button type="button" className="btn btn-ocre btn-lg btn-block" onClick={() => navigate('/checkout')}>
                Continuar al pago <Icon name="arrow" size={18} stroke={2.4} />
              </button>
              <Link to="/#tienda" className="link center-link">Seguir comprando</Link>
              <p className="pay-note"><Icon name="lock" size={15} />Pago seguro con Wompi: PSE, Nequi, Daviplata y tarjetas</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
