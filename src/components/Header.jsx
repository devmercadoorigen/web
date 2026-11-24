import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { Icon } from './ui.jsx';

const NEWS = [
  ['truck', <>Envío <b>gratis</b> desde $150.000</>],
  ['box', <>Varios productores, <b>una sola caja</b></>],
  ['gift', <>10% en tu primera compra: <b>ORIGEN10</b></>],
  ['pin', <>Despachamos desde el Huila a <b>toda Colombia</b></>],
];

// Cinta de anuncios en movimiento continuo (se pausa al pasar el cursor).
export function Announce() {
  const row = NEWS.map(([icon, text], i) => (
    <span key={i} className="news-item"><Icon name={icon} size={16} />{text}</span>
  ));
  return (
    <div className="announce" role="region" aria-label="Novedades">
      <div className="news-track">
        <div className="news-row">{row}</div>
        <div className="news-row" aria-hidden="true">{row}</div>
      </div>
    </div>
  );
}

export function Header({ query, onQuery }) {
  const { count, setOpen, bump } = useCart();
  const [bumping, setBumping] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!bump) return;
    setBumping(true);
    const t = setTimeout(() => setBumping(false), 500);
    return () => clearTimeout(t);
  }, [bump]);

  return (
    <header className={`top${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap top-in">
        <a className="logo" href="#inicio">
          <img src="/img/logo.png" alt="Mercado Origen — Productos de origen del Huila" width="1254" height="1254" />
        </a>
        <nav className="main" aria-label="Principal">
          <a href="#tienda">Tienda</a>
          <a href="#territorio">Territorio</a>
          <a href="#kits">Regalos</a>
          <a href="#embajadores">Embajadores</a>
          <a href="#historia">Historia</a>
        </nav>
        <label className="search">
          <Icon name="search" size={18} />
          <input
            id="q"
            type="search"
            value={query}
            placeholder="Busca café, chocolate, miel…"
            aria-label="Buscar productos"
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('tienda')?.scrollIntoView({ behavior: 'smooth' })}
          />
        </label>
        <button className="icon-btn acct" type="button" aria-label="Mi cuenta">
          <Icon name="user" size={22} stroke={1.8} />
        </button>
        <button className={`cart-btn${bumping ? ' bump' : ''}`} type="button" aria-label={`Abrir carrito, ${count} productos`} onClick={() => setOpen(true)}>
          <Icon name="bag" size={20} stroke={2} />
          <span className="cart-label">Carrito</span>
          <span className="cart-count">{count}</span>
        </button>
      </div>
    </header>
  );
}
