import { Link, useOutletContext } from 'react-router';
import { money, rating } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { firstName, useAuth } from '../auth/AuthProvider.jsx';
import { useDashboard } from './usePanel.jsx';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function Kpi({ label, value, hint, tone, to, icon }) {
  const body = (
    <>
      <span className="kpi-label"><Icon name={icon} size={18} />{label}</span>
      <b className="kpi-value">{value}</b>
      {hint && <span className="kpi-hint">{hint}</span>}
    </>
  );
  return to ? <Link to={to} className={`kpi kpi-${tone || 'plain'}`}>{body}</Link> : <div className={`kpi kpi-${tone || 'plain'}`}>{body}</div>;
}

export default function PanelHome() {
  useTitle('Panel de embajador');
  const { amb } = useOutletContext();
  const { profile, user } = useAuth();
  const q = useDashboard();
  const d = q.data;

  if (q.isLoading || !d) return <div className="kpi-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>;

  const p = d.products || {};
  const delta = d.prev_month_sales ? Math.round(((d.month_sales - d.prev_month_sales) / d.prev_month_sales) * 100) : null;
  const max = Math.max(1, ...(d.series || []).map((s) => s.sales));

  return (
    <div className="pn-stack">
      <header className="pn-head">
        <h1>Hola, {firstName(profile, user)}</h1>
        <p className="muted">Así va {amb.brand_name} en Mercado Origen.</p>
      </header>

      {d.to_prepare > 0 && (
        <Link to="/panel/pedidos" className="pn-callout">
          <Icon name="box" size={24} />
          <div>
            <b>Tienes {d.to_prepare} {d.to_prepare === 1 ? 'producto' : 'productos'} por preparar</b>
            <span>Alístalos y márcalos como listos para que pasemos a recogerlos.</span>
          </div>
          <Icon name="arrow" size={20} stroke={2.4} />
        </Link>
      )}

      <div className="kpi-grid">
        <Kpi icon="bag" label="Ventas del mes" value={money(d.month_sales)}
          hint={delta === null ? 'Primer mes con ventas' : `${delta >= 0 ? '+' : ''}${delta}% frente al mes anterior`} tone="verde" />
        <Kpi icon="box" label="Unidades vendidas" value={d.month_units} hint={`${d.sales_count} en total`} />
        <Kpi icon="card" label="Saldo por pagarte" value={money(d.pending_payout)} hint={d.commission_rate == null ? 'Comisión por acordar' : `Ya descontada la comisión (${Number(d.commission_rate)}%)`} to="/panel/pagos" tone="ocre" />
        <Kpi icon="award" label="Calificación" value={d.rating_count ? `${rating(Number(d.rating_avg))} ★` : '—'} hint={d.rating_count ? `${d.rating_count} reseñas` : 'Aún sin reseñas'} />
      </div>

      <div className="pn-cols">
        <section className="panel">
          <h2 className="panel-title">Ventas de los últimos 6 meses</h2>
          <div className="bars" role="img" aria-label={(d.series || []).map((s) => `${MONTHS[Number(s.month.slice(5)) - 1]}: ${money(s.sales)}`).join(', ')}>
            {(d.series || []).map((s) => (
              <div key={s.month} className="bar-col">
                <span className="bar-val">{s.sales ? money(s.sales) : ''}</span>
                <i style={{ height: `${Math.max(3, (s.sales / max) * 100)}%` }} />
                <span className="bar-lbl">{MONTHS[Number(s.month.slice(5)) - 1]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title">Tus productos</h2>
          <ul className="status-list">
            <li><span className="pill pill-verde">Publicados</span><b>{p.aprobado || 0}</b></li>
            <li><span className="pill pill-ocre">En revisión</span><b>{p.pendiente || 0}</b></li>
            <li><span className="pill pill-err">Rechazados</span><b>{p.rechazado || 0}</b></li>
            <li><span className="pill pill-mute">Borradores y pausados</span><b>{(p.borrador || 0) + (p.inactivo || 0)}</b></li>
          </ul>
          {d.low_stock > 0 && <p className="notice notice-error"><Icon name="box" size={18} />{d.low_stock} {d.low_stock === 1 ? 'producto tiene' : 'productos tienen'} 3 unidades o menos.</p>}
          <div className="form-actions">
            <Link to="/panel/productos/nuevo" className="btn btn-green">Subir un producto</Link>
            <Link to="/panel/productos" className="btn btn-outline">Ver todos</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
