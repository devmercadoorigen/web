import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { PageLoader } from '../../components/PageLoader.jsx';
import { Icon } from '../../components/ui.jsx';
import { useAuth } from './AuthProvider.jsx';

/** Rutas que piden sesión: sin sesión, al login y de vuelta aquí. */
export function RequireAuth({ children }) {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children ?? <Outlet />;
}

/**
 * Rutas por rol (/panel, /admin). Es solo la puerta de la interfaz: la base
 * rechaza igual cualquier consulta que el rol no tenga permitida (RLS).
 */
export function RequireRole({ roles, children }) {
  const { role, profileLoading } = useAuth();
  if (profileLoading) return <PageLoader />;
  if (!roles.includes(role)) {
    return (
      <section className="page-state">
        <div className="wrap">
          <div className="empty">
            <Icon name="lock" size={40} stroke={1.6} />
            <b>Esta sección no está disponible para tu cuenta</b>
            <p>Si eres embajador y no ves tu panel, escríbenos y lo activamos.</p>
            <Link className="btn btn-green" to="/cuenta">Ir a mi cuenta</Link>
          </div>
        </div>
      </section>
    );
  }
  return children ?? <Outlet />;
}

/** Login y registro: si ya hay sesión, sigue de largo. */
export function GuestOnly({ children }) {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (user) {
    const next = new URLSearchParams(location.search).get('next');
    return <Navigate to={safeNext(next)} replace />;
  }
  return children ?? <Outlet />;
}

/** Solo rutas internas: evita redirecciones abiertas (?next=https://…). */
export const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/cuenta');
