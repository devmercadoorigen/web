import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Icon } from '../../components/ui.jsx';
import { Toast } from '../../components/Toast.jsx';
import { PageLoader } from '../../components/PageLoader.jsx';
import { UserMenu } from '../auth/UserMenu.jsx';
import { useDashboard, useMyAmbassador } from './usePanel.jsx';
import './panel.css';

const NAV = [
  ['/panel', 'Inicio', 'leaf', true],
  ['/panel/productos', 'Mis productos', 'bag'],
  ['/panel/pedidos', 'Por preparar', 'box'],
  ['/panel/pagos', 'Mis pagos', 'card'],
  ['/panel/perfil', 'Mi perfil', 'user'],
];

export default function PanelLayout() {
  const amb = useMyAmbassador();
  const dash = useDashboard();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (amb.isLoading) return <PageLoader />;
  if (!amb.data) {
    return (
      <section className="page-state">
        <div className="wrap">
          <div className="empty">
            <Icon name="leaf" size={40} stroke={1.6} />
            <b>Tu cuenta aún no está vinculada a un embajador</b>
            <p>Escríbenos y la conectamos con tu marca en Mercado Origen.</p>
            <Link className="btn btn-green" to="/">Ir a la tienda</Link>
          </div>
        </div>
      </section>
    );
  }

  const a = amb.data;
  const toPrepare = dash.data?.to_prepare ?? 0;
  return (
    <div className="pn">
      <a className="skip" href="#pn-main">Ir al contenido</a>
      <header className="pn-top">
        <Link to="/" className="pn-logo" aria-label="Mercado Origen, ir a la tienda">
          <img src="/brand/logo-vertical.svg" alt="" width="42" height="48" />
        </Link>
        <div className="pn-who">
          <span className="kicker">Panel de embajador</span>
          <b>{a.brand_name}</b>
        </div>
        <Link to="/" className="pn-store"><Icon name="bag" size={18} />Ver la tienda</Link>
        <UserMenu />
      </header>

      {a.status === 'suspendido' && (
        <div className="pn-alert" role="alert">
          <Icon name="lock" size={18} /> Tu tienda está suspendida: tus productos no se muestran. Escríbenos por WhatsApp para resolverlo.
        </div>
      )}

      <div className="pn-body">
        <nav className="pn-nav" aria-label="Panel de embajador">
          {NAV.map(([to, label, icon, end]) => (
            <NavLink key={to} to={to} end={end}>
              <Icon name={icon} size={20} />
              <span>{label}</span>
              {to === '/panel/pedidos' && toPrepare > 0 && <em className="pn-count" aria-label={`${toPrepare} por preparar`}>{toPrepare}</em>}
            </NavLink>
          ))}
        </nav>
        <main className="pn-main" id="pn-main">
          <Outlet context={{ amb: a }} />
        </main>
      </div>
      <Toast />
    </div>
  );
}
