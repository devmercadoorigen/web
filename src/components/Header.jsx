import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useCart } from '../features/cart/CartProvider.jsx';
import { UserMenu } from '../features/auth/UserMenu.jsx';
import { SearchBox } from '../features/search/SearchBox.jsx';
import { RichText, useSite } from '../features/site/SiteProvider.jsx';
import { HashLink } from './HashLink.jsx';
import { Garland, LogoHat, XMAS, XMAS_NEWS } from '../features/xmas/Christmas.jsx';
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
  }, [pathname]);

  return (
    <header className={`top${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap top-in">
        {isHome ? (
          <a className="logo" href="#inicio">
            <img src="/brand/logo-horizontal.svg" width="180" height="50" alt="Mercado Origen — Productos de origen del Huila" fetchpriority="high" /><LogoHat />
          </a>
        ) : (
          <Link className="logo" to="/">
            <img src="/brand/logo-horizontal.svg" width="180" height="50" alt="Mercado Origen — Productos de origen del Huila" fetchpriority="high" /><LogoHat />
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
    </header>
  );
}
