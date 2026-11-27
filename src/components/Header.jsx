import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router';
import { useCart } from '../features/cart/CartProvider.jsx';
import { UserMenu } from '../features/auth/UserMenu.jsx';
import { SearchBox } from '../features/search/SearchBox.jsx';
import { RichText, useSite } from '../features/site/SiteProvider.jsx';
import { HashLink } from './HashLink.jsx';
import { Garland, XMAS, XMAS_NEWS } from '../features/xmas/Christmas.jsx';
import { Icon } from './ui.jsx';

const DEFAULT_NEWS = [
  { icon: 'truck', text: 'Envío **gratis** desde $150.000' },
  { icon: 'box', text: 'Varios productores, **una sola caja**' },
  { icon: 'pin', text: 'Despachamos desde el Huila a **toda Colombia**' },
];

// Cinta de anuncios en movimiento continuo (se pausa al pasar el cursor). Se edita en el admin.
export function Announce() {
  const { settings, welcomeCoupon } = useSite();
  const base = settings.announcements?.length ? settings.announcements : DEFAULT_NEWS;
  const news = (XMAS ? [XMAS_NEWS, ...base] : base)
    .filter((n) => n.requires !== 'welcome_coupon' || welcomeCoupon)
    .map((n) => ({ ...n, text: n.text.replace('{welcome_coupon}', welcomeCoupon || '') }));
  const row = news.map((n, i) => (
    <span key={i} className="news-item"><Icon name={n.icon} size={16} /><RichText text={n.text} /></span>
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

export function Header() {
  const { count, setOpen, bump } = useCart();
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [bumping, setBumping] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMobileSearch(false);
    setMenuOpen(false);
  }, [pathname]);

  // Menú móvil: se cierra con Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`top${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap top-in">
        <button type="button" className="icon-btn menu-toggle" aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="menu-movil" onClick={() => setMenuOpen(true)}>
          <Icon name="menu" size={24} stroke={2} />
        </button>
        {isHome ? (
          <a className="logo" href="#inicio">
            <img src="/brand/logo-horizontal-navidad.webp" width="128" height="52" alt="Mercado Origen — Productos de origen del Huila" fetchpriority="high" />
          </a>
        ) : (
          <Link className="logo" to="/">
            <img src="/brand/logo-horizontal-navidad.webp" width="128" height="52" alt="Mercado Origen — Productos de origen del Huila" fetchpriority="high" />
          </Link>
        )}
        <nav className="main" aria-label="Principal">
          <NavLink to="/tienda">Tienda</NavLink>
          <HashLink to="#territorio">Territorio</HashLink>
          <NavLink to="/kits">Regalos</NavLink>
          <NavLink to="/embajadores">Embajadores</NavLink>
          <HashLink to="#historia">Historia</HashLink>
        </nav>
        <SearchBox />
        <button type="button" className="icon-btn search-toggle" aria-label="Buscar" aria-expanded={mobileSearch} onClick={() => setMobileSearch((v) => !v)}>
          <Icon name={mobileSearch ? 'close' : 'search'} size={22} stroke={1.9} />
        </button>
        <UserMenu />
        <button className={`cart-btn${bumping ? ' bump' : ''}`} type="button" aria-label={`Abrir carrito, ${count} productos`} onClick={() => setOpen(true)}>
          <Icon name="bag" size={20} stroke={2} />
          <span className="cart-label">Carrito</span>
          <span className="cart-count">{count}</span>
        </button>
      </div>
      {mobileSearch && (
        <div className="mobile-search wrap">
          <SearchBox autoFocus className="search search-m" onDone={() => setMobileSearch(false)} />
        </div>
      )}
      <Garland />
      {createPortal(<>
      <div className={`scrim menu-scrim${menuOpen ? ' on' : ''}`} onClick={closeMenu} aria-hidden="true" />
      <nav id="menu-movil" className={`menu-drawer${menuOpen ? ' on' : ''}`} aria-label="Menú" aria-hidden={!menuOpen} inert={menuOpen ? undefined : ''}>
        <div className="menu-drawer-hd">
          <span>Menú</span>
          <button type="button" className="icon-btn" aria-label="Cerrar menú" onClick={closeMenu}>
            <Icon name="close" size={22} stroke={2} />
          </button>
        </div>
        <NavLink to="/tienda" onClick={closeMenu}><Icon name="bag" size={20} />Tienda</NavLink>
        <HashLink to="#territorio" onClick={closeMenu}><Icon name="pin" size={20} />Territorio</HashLink>
        <NavLink to="/kits" onClick={closeMenu}><Icon name="gift" size={20} />Regalos</NavLink>
        <NavLink to="/embajadores" onClick={closeMenu}><Icon name="award" size={20} />Embajadores</NavLink>
        <HashLink to="#historia" onClick={closeMenu}><Icon name="leaf" size={20} />Historia</HashLink>
      </nav>
      </>, document.body)}
    </header>
  );
}
