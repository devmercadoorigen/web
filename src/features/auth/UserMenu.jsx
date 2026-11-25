import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { firstName, useAuth } from './AuthProvider.jsx';

/** Ícono de usuario del header: lleva al login o abre el menú de la cuenta según el rol. */
export function UserMenu() {
  const { user, profile, role, signOut } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    const here = location.pathname === '/login' ? '' : `?next=${encodeURIComponent(location.pathname + location.search)}`;
    return (
      <Link className="icon-btn acct" to={`/login${here}`} aria-label="Iniciar sesión o crear cuenta">
        <Icon name="user" size={22} stroke={1.8} />
      </Link>
    );
  }

  const name = firstName(profile, user);
  const initials = (profile?.full_name || user.email).split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const logout = async () => {
    setOpen(false);
    await signOut();
    notify('Cerraste sesión. ¡Vuelve pronto!');
    navigate('/');
  };

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="icon-btn acct acct-on" aria-haspopup="menu" aria-expanded={open} aria-label={`Mi cuenta, ${name}`} onClick={() => setOpen((o) => !o)}>
        <span className="acct-ava">{initials}</span>
      </button>
      {open && (
        <div className="user-pop" role="menu">
          <div className="user-pop-head">
            <b>Hola, {name}</b>
            <span>{user.email}</span>
          </div>
          <Link role="menuitem" to="/cuenta"><Icon name="user" size={18} />Mi cuenta</Link>
          <Link role="menuitem" to="/cuenta/pedidos"><Icon name="box" size={18} />Mis pedidos</Link>
          <Link role="menuitem" to="/cuenta/deseos"><Icon name="heart" size={18} />Lista de deseos</Link>
          {role === 'embajador' && <Link role="menuitem" to="/panel"><Icon name="leaf" size={18} />Panel de embajador</Link>}
          {role === 'admin' && <Link role="menuitem" to="/admin"><Icon name="shield" size={18} />Administración</Link>}
          <button role="menuitem" type="button" onClick={logout}><Icon name="logout" size={18} />Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
