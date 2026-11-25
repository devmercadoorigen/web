import { NavLink, Outlet } from 'react-router';
import { Icon } from '../../components/ui.jsx';
import { firstName, useAuth } from '../auth/AuthProvider.jsx';

const TABS = [
  ['/cuenta', 'Resumen', 'user', true],
  ['/cuenta/pedidos', 'Mis pedidos', 'box'],
  ['/cuenta/deseos', 'Lista de deseos', 'heart'],
  ['/cuenta/direcciones', 'Direcciones', 'pin'],
];

export default function AccountLayout() {
  const { profile, user } = useAuth();
  return (
    <section className="account">
      <div className="wrap">
        <header className="account-head">
          <span className="kicker">Mi cuenta</span>
          <h1>Hola, {firstName(profile, user) || 'bienvenido'}</h1>
        </header>
        <nav className="account-nav" aria-label="Secciones de mi cuenta">
          {TABS.map(([to, label, icon, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'on' : undefined)}>
              <Icon name={icon} size={18} stroke={2.2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="account-body">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
