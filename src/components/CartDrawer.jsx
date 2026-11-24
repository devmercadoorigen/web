import { useEffect } from 'react';
import { FREE_SHIPPING, PRODUCTS } from '../data/catalog.js';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../lib/format.js';
import { Icon, ProductArt } from './ui.jsx';

// Sugiere el producto que mejor completa el umbral de envío gratis.
function suggestion(items, missing) {
  const target = missing || 40000;
  return PRODUCTS.filter((p) => !items[p.id] && p.price <= 40000).sort((a, b) => Math.abs(target - a.price) - Math.abs(target - b.price))[0];
}

export function CartDrawer() {
  const { items, lines, subtotal, missing, add, setQty, open, setOpen, notify } = useCart();
  const pct = Math.min(100, (subtotal / FREE_SHIPPING) * 100);
  const sug = suggestion(items, missing);

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
              <div className="line" key={l.id}>
                <div className="thumb"><ProductArt art={l.art} colors={l.colors} image={l.image} maker={l.maker} alt={l.name} /></div>
                <div className="info">
                  <b>{l.name}</b>
                  <span className="muted">{l.sub}</span>
                  <span className="qty">
                    <button type="button" aria-label="Quitar uno" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                    <span>{l.qty}</span>
                    <button type="button" aria-label="Agregar uno" onClick={() => setQty(l.id, l.qty + 1)}>+</button>
                  </span>
                </div>
                <span className="lp">{money(l.price * l.qty)}</span>
              </div>
            ))
          ) : (
            <div className="cart-empty">
              <p className="cart-empty-title">Tu caja está vacía</p>
              <p>Empieza por lo más pedido del Huila.</p>
              <a className="btn btn-buy btn-sm" href="#tienda" onClick={() => setOpen(false)}>Ver productos</a>
            </div>
          )}
        </div>
        {sug && (
          <div className="upsell">
            <p className="upsell-title">{missing > 0 ? 'Completa tu envío gratis' : 'Suma otro sabor'}</p>
            <div className="zp">
              <div className="thumb"><ProductArt {...sug} alt={sug.name} /></div>
              <div><b>{sug.name}</b>{sug.maker} · {money(sug.price)}</div>
              <button type="button" aria-label={`Añadir ${sug.name}`} onClick={() => add(sug.id)}>+</button>
            </div>
          </div>
        )}
        <div className="drawer-ft">
          <div className="tot"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <button className="btn btn-buy" type="button" onClick={() => notify(subtotal ? 'Aquí se conecta la pasarela de pago' : 'Agrega un producto para continuar')}>
            Pagar de forma segura
          </button>
          <small>PSE · Nequi · Tarjetas · Pago único para todos los productores</small>
        </div>
      </aside>
    </>
  );
}

export function MobileBar() {
  const { count, subtotal, missing, setOpen } = useCart();
  return (
    <div className={`mbar${count ? ' show' : ''}`}>
      <div className="t">
        <b>{money(subtotal)}</b>
        <span>{missing > 0 ? `Faltan ${money(missing)} para envío gratis` : 'Envío gratis activado'}</span>
      </div>
      <button className="btn btn-buy btn-sm" type="button" onClick={() => setOpen(true)}>Ver carrito</button>
    </div>
  );
}

export function Toast() {
  const { toast } = useCart();
  return <div className={`toast${toast ? ' on' : ''}`} role="status">{toast}</div>;
}
