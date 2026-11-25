import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useCart } from '../features/cart/CartProvider.jsx';
import { UpsellRow, useCompleteBox } from '../features/recommendations/CompleteBox.jsx';
import { money } from '../lib/format.js';
import { HashLink } from './HashLink.jsx';
import { Icon, ProductArt } from './ui.jsx';

export function CartDrawer() {
  const { lines, subtotal, missing, freeShipping, setQty, open, setOpen, notify } = useCart();
  const navigate = useNavigate();
  const pct = Math.min(100, (subtotal / freeShipping) * 100);
  // Sugerencias personalizadas para completar la caja (solo con el carrito abierto).
  const box = useCompleteBox({ limit: 2, enabled: open && lines.length > 0 });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  return (
    <>
      <div className={`scrim${open ? ' on' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`drawer${open ? ' on' : ''}`} aria-label="Carrito" aria-hidden={!open}>
        <div className="drawer-hd">
          <h3>Tu caja del Huila</h3>
          <button className="icon-btn" type="button" aria-label="Cerrar carrito" onClick={() => setOpen(false)}><Icon name="close" size={22} /></button>
        </div>
        <div className="ship">
          {missing > 0 ? (
            <>Agrega <b>{money(missing)}</b> más y tu envío es <b>gratis</b></>
          ) : (
            <><b className="ok">¡Tu envío es gratis!</b> Todo llega en una sola caja.</>
          )}
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="items">
          {lines.length ? (
            lines.map((l) => (
              <div className="line" key={l.cartKey}>
                <div className="thumb"><ProductArt art={l.art} artLabel={l.artLabel} colors={l.colors} image={l.image} maker={l.maker} alt={l.name} /></div>
                <div className="info">
                  <b>{l.name}</b>
                  <span className="muted">{l.sub}</span>
                  <span className="qty">
                    <button type="button" aria-label="Quitar uno" onClick={() => setQty(l.cartKey, l.qty - 1)}>−</button>
                    <span>{l.qty}</span>
                    <button type="button" aria-label="Agregar uno" onClick={() => setQty(l.cartKey, l.qty + 1)}>+</button>
                  </span>
                </div>
                <span className="lp">{money(l.price * l.qty)}</span>
              </div>
            ))
          ) : (
            <div className="cart-empty">
              <p className="cart-empty-title">Tu caja está vacía</p>
              <p>Empieza por lo más pedido del Huila.</p>
              <HashLink className="btn btn-buy btn-sm" to="#tienda" onClick={() => setOpen(false)}>Ver productos</HashLink>
            </div>
          )}
        </div>
        {lines.length > 0 && box.items.length > 0 && (
          <div className="upsell">
            <p className="upsell-title">{missing > 0 ? 'Completa tu envío gratis' : 'Suma otro sabor'}</p>
            <div className="upsell-list">
              {box.items.map((p) => <UpsellRow key={p.id} p={p} missing={missing} onPick={() => setOpen(false)} />)}
            </div>
          </div>
        )}
        <div className="drawer-ft">
          <div className="tot"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <button className="btn btn-buy" type="button" onClick={() => { if (!subtotal) return notify('Agrega un producto para continuar'); setOpen(false); navigate('/checkout'); }}>
            Pagar de forma segura
          </button>
          {lines.length > 0 && <Link to="/carrito" className="link drawer-cart-link" onClick={() => setOpen(false)}>Ver carrito completo</Link>}
          <small>PSE · Nequi · Daviplata · Tarjetas · Pago único para todos los productores</small>
        </div>
      </aside>
    </>
  );
}

export function MobileBar() {
  const { count, subtotal, missing, setOpen } = useCart();
  const { pathname } = useLocation();
  const hidden = pathname === '/checkout' || pathname === '/carrito';
  return (
    <div className={`mbar${count && !hidden ? ' show' : ''}`}>
      <div className="t">
        <b>{money(subtotal)}</b>
        <span>{missing > 0 ? `Faltan ${money(missing)} para envío gratis` : 'Envío gratis activado'}</span>
      </div>
      <button className="btn btn-buy btn-sm" type="button" onClick={() => setOpen(true)}>Ver carrito</button>
    </div>
  );
}

