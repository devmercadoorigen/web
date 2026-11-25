import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { Icon } from '../../components/ui.jsx';
import { Toast } from '../../components/Toast.jsx';
import { UserMenu } from '../auth/UserMenu.jsx';
import '../ambassador-panel/panel.css';
import './admin.css';

const NAV = [
  ['Operación', [
    ['/admin', 'Resumen', 'sun', true],
    ['/admin/aprobaciones', 'Aprobaciones', 'check', false, 'pending'],
    ['/admin/pedidos', 'Pedidos', 'box'],
    ['/admin/liquidaciones', 'Liquidaciones', 'card'],
  ]],
  ['Catálogo', [
    ['/admin/productos', 'Productos', 'bag'],
    ['/admin/kits', 'Kits', 'gift'],
    ['/admin/embajadores', 'Embajadores', 'award'],
    ['/admin/solicitudes', 'Solicitudes', 'leaf', false, 'apps'],
  ]],
  ['Clientes y contenido', [
    ['/admin/usuarios', 'Usuarios', 'user'],
    ['/admin/resenas', 'Reseñas', 'heart'],
    ['/admin/cupones', 'Cupones y boletín', 'mail'],
    ['/admin/contenido', 'Contenido', 'mountain'],
    ['/admin/actividad', 'Actividad', 'refresh'],
  ]],
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('mo-admin-collapsed') === '1'; } catch { return false; }
  });
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    try { localStorage.setItem('mo-admin-collapsed', collapsed ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }, [collapsed]);

  // Contadores de la barra lateral (consultas de solo conteo).
  const counts = useQuery({
    queryKey: ['admin', 'counts'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [p, a] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pendiente'),
        supabase.from('ambassador_applications').select('id', { count: 'exact', head: true }).eq('status', 'nueva'),
      ]);
      return { pending: p.count || 0, apps: a.count || 0 };
    },
  });

  return (
    <div className={`adm${collapsed ? ' is-collapsed' : ''}${drawer ? ' drawer-open' : ''}`}>
      <a className="skip" href="#adm-main">Ir al contenido</a>
      <header className="pn-top adm-top">
        <button type="button" className="icon-btn adm-burger" aria-label="Abrir menú" aria-expanded={drawer} onClick={() => setDrawer(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <Link to="/" className="pn-logo" aria-label="Mercado Origen, ir a la tienda"><img src="/brand/logo-vertical.svg" alt="" width="42" height="48" /></Link>
        <div className="pn-who"><span className="kicker">Administración</span><b>Mercado Origen</b></div>
        <Link to="/" className="pn-store"><Icon name="bag" size={18} /><span>Ver la tienda</span></Link>
        <UserMenu />
      </header>

      <div className="adm-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />
      <aside className="adm-side" aria-label="Menú de administración">
        <div className="adm-side-head">
          <button type="button" className="icon-btn adm-collapse" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'} aria-pressed={collapsed}>
            <Icon name="arrow" size={18} stroke={2.4} />
          </button>
          <button type="button" className="icon-btn adm-close" onClick={() => setDrawer(false)} aria-label="Cerrar menú"><Icon name="close" size={20} /></button>
        </div>
        <nav>
          {NAV.map(([group, items]) => (
            <div key={group} className="adm-group">
              <span className="adm-group-label">{group}</span>
              {items.map(([to, label, icon, end, badge]) => {
                const n = badge ? counts.data?.[badge] : 0;
                return (
                  <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined}>
                    <Icon name={icon} size={20} />
                    <span className="adm-label">{label}</span>
                    {n > 0 && <em className="pn-count" aria-label={`${n} pendientes`}>{n}</em>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="adm-main" id="adm-main">
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}
