import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { dateTime, money, ORDER_STATUS } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { LABELS, PATHS } from '../territory/Territory.jsx';
import { DailySalesChart, HuilaHeatmap, RankBars } from './kit.jsx';

const ACTION = { insert: 'creó', update: 'editó', delete: 'eliminó', sku_changed: 'cambió el SKU de', ambassador_invited: 'invitó a', ambassador_linked: 'vinculó una cuenta a', user_deactivated: 'desactivó', user_activated: 'reactivó', payments_mode_changed: 'cambió el modo de' };
const ENTITY = { products: 'un producto', ambassadors: 'un embajador', ambassador_private: 'datos privados de un embajador', orders: 'un pedido', coupons: 'un cupón', kits: 'un kit', kit_items: 'un kit', categories: 'una categoría', faqs: 'una pregunta frecuente', site_settings: 'textos del sitio', payments_mode: 'pagos (prueba / producción)', profiles: 'un usuario', reviews: 'una reseña', ambassador_payouts: 'una liquidación', ambassador_badges: 'una insignia', ambassador_applications: 'una solicitud', order_items: 'un item de pedido', subregions: 'una zona', municipalities: 'un municipio', shipping_settings: 'el envío' };

function Kpi({ icon, label, value, hint, tone, to }) {
  const C = to ? Link : 'div';
  return (
    <C to={to} className={`kpi kpi-${tone || 'plain'}`}>
      <span className="kpi-label"><Icon name={icon} size={18} />{label}</span>
      <b className="kpi-value">{value}</b>
      {hint && <span className="kpi-hint">{hint}</span>}
    </C>
  );
}

function Alert({ tone = 'warn', icon, title, children, to, cta }) {
  return (
    <div className={`alert alert-${tone}`}>
      <Icon name={icon} size={20} />
      <div><b>{title}</b>{children}</div>
      {to && <Link to={to} className="link-btn">{cta}</Link>}
    </div>
  );
}

export default function Dashboard() {
  useTitle('Administración');
  const q = useQuery({
    queryKey: ['admin', 'dashboard'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_dashboard', { p_stuck_days: 3 });
      if (error) throw error;
      return data;
    },
  });
  const d = q.data;
  if (q.isLoading) return <div className="kpi-grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ height: 118 }} />)}</div>;
  if (q.error) return <p className="notice notice-error">No pudimos cargar el resumen: {q.error.message}</p>;

  const a = d.alerts;
  const statusOrder = ['pendiente_pago', 'pagado', 'preparando', 'consolidado', 'enviado', 'entregado', 'cancelado', 'reembolsado'];
  const alertCount = a.low_stock.length + a.stuck_orders.length + a.review_orders.length + (a.payment_errors > 0 ? 1 : 0) + a.idle_ambassadors.length + a.empty_zones.length + a.missing_commission.length + (d.new_applications > 0 ? 1 : 0);

  return (
    <div className="pn-stack">
      <header className="pn-head"><h1>Resumen</h1><p className="muted">Ventas y operación de Mercado Origen. Se actualiza cada minuto.</p></header>

      {d.environment === 'sandbox' && (
        <Link to="/admin/pagos" className="pn-callout">
          <Icon name="shield" size={24} />
          <div><b>Estás viendo datos de prueba</b><span>Ventas, pedidos y liquidaciones de los pagos en modo prueba. Al pasar a producción solo verás los reales.</span></div>
        </Link>
      )}

      {d.pending_products > 0 && (
        <Link to="/admin/aprobaciones" className="pn-callout">
          <Icon name="check" size={24} />
          <div><b>{d.pending_products} {d.pending_products === 1 ? 'producto espera' : 'productos esperan'} tu aprobación</b><span>Los embajadores no venden hasta que los revises.</span></div>
          <Icon name="arrow" size={20} stroke={2.4} />
        </Link>
      )}

      <div className="kpi-grid">
        <Kpi icon="bag" label="Ventas hoy" value={money(d.sales.today)} tone="verde" />
        <Kpi icon="bag" label="Esta semana" value={money(d.sales.week)} />
        <Kpi icon="bag" label="Este mes" value={money(d.sales.month)} hint={`${d.sales.orders_month} pedidos pagados`} />
        <Kpi icon="card" label="Ticket promedio" value={money(d.sales.aov_month)} hint="Pedidos pagados este mes" />
        <Kpi icon="shield" label="Aprobación de pagos" value={d.approval_rate === null ? '—' : `${d.approval_rate}%`} hint={`${d.payments_30d} pagos finalizados en 30 días`} />
        <Kpi icon="user" label="Clientes nuevos" value={d.new_customers.month} hint={`${d.new_customers.week} esta semana`} to="/admin/usuarios" />
        <Kpi icon="check" label="Por aprobar" value={d.pending_products} tone={d.pending_products ? 'ocre' : undefined} to="/admin/aprobaciones" hint="Productos en revisión" />
        <Kpi icon="leaf" label="Solicitudes nuevas" value={d.new_applications} tone={d.new_applications ? 'ocre' : undefined} to="/admin/solicitudes" hint="Quiero ser embajador" />
      </div>

      <section className="panel">
        <h2 className="panel-title">Ventas de los últimos 30 días</h2>
        <DailySalesChart series={d.series} />
      </section>

      <section className="panel">
        <h2 className="panel-title">Pedidos por estado</h2>
        <div className="status-strip">
          {statusOrder.map((s) => (
            <Link key={s} to={`/admin/pedidos?estado=${s}`} className="status-cell">
              <b>{d.orders_by_status[s] || 0}</b>
              <span className={`pill pill-${ORDER_STATUS[s].tone}`}>{ORDER_STATUS[s].label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="pn-cols adm-cols-3">
        <section className="panel"><h2 className="panel-title">Productos más vendidos</h2><p className="muted small">Últimos 30 días</p><RankBars items={d.top_products} sub={(p) => p.sku} /></section>
        <section className="panel"><h2 className="panel-title">Embajadores con más ventas</h2><p className="muted small">Últimos 30 días</p><RankBars items={d.top_ambassadors} sub={(p) => `${p.units} und.`} /></section>
        <section className="panel"><h2 className="panel-title">Ventas por categoría</h2><p className="muted small">Últimos 30 días</p><RankBars items={d.by_category.filter((c) => c.revenue > 0)} /></section>
      </div>

      <div className="pn-cols">
        <section className="panel">
          <h2 className="panel-title">Ventas por subregión</h2>
          <p className="muted small">Últimos 30 días · según el municipio de cada embajador</p>
          <HuilaHeatmap data={d.by_subregion} paths={PATHS} labels={LABELS} />
        </section>

        <section className="panel">
          <h2 className="panel-title">Alertas {alertCount > 0 && <span className="pill pill-ocre">{alertCount}</span>}</h2>
          <div className="alerts">
            {alertCount === 0 && <p className="muted">Todo en orden.</p>}
            {a.review_orders.length > 0 && (
              <Alert tone="crit" icon="shield" title={`${a.review_orders.length} pedidos para revisar`} to="/admin/pedidos?revision=1" cta="Ver">
                <span>{a.review_orders[0].order_number}: {a.review_orders[0].review_reason}</span>
              </Alert>
            )}
            {a.stuck_orders.length > 0 && (
              <Alert icon="box" title={`${a.stuck_orders.length} pedidos detenidos`} to="/admin/pedidos" cta="Ver">
                <span>{a.stuck_orders.slice(0, 3).map((o) => `${o.order_number} (${ORDER_STATUS[o.status].label.toLowerCase()}, ${o.days} días)`).join(' · ')}</span>
              </Alert>
            )}
            {a.payment_errors > 0 && (
              <Alert icon="card" title={`${a.payment_errors} pagos rechazados o con error esta semana`} to="/admin/pedidos?estado=pendiente_pago" cta="Ver"><span>Revisa si hay un problema con algún medio de pago.</span></Alert>
            )}
            {a.low_stock.length > 0 && (
              <Alert icon="bag" title={`${a.low_stock.length} productos con poco stock`} to="/admin/productos?stock=bajo" cta="Ver">
                <span>{a.low_stock.slice(0, 3).map((p) => `${p.name} (${p.stock})`).join(' · ')}</span>
              </Alert>
            )}
            {a.missing_commission.length > 0 && (
              <Alert icon="card" title={`${a.missing_commission.length} embajadores con ventas sin comisión acordada`} to="/admin/liquidaciones" cta="Ver">
                <span>{a.missing_commission.map((m) => m.brand_name).join(' · ')}</span>
              </Alert>
            )}
            {d.new_applications > 0 && (
              <Alert tone="info" icon="leaf" title={`${d.new_applications} solicitudes nuevas de embajador`} to="/admin/solicitudes" cta="Revisar"><span>Quiero ser embajador</span></Alert>
            )}
            {a.empty_zones.length > 0 && (
              <Alert tone="info" icon="mountain" title={`Zonas sin embajadores: ${a.empty_zones.join(', ')}`}><span>El mapa muestra “Esta zona espera a sus primeros embajadores”.</span></Alert>
            )}
            {a.idle_ambassadors.length > 0 && (
              <Alert tone="info" icon="award" title={`${a.idle_ambassadors.length} embajadores sin productos publicados`} to="/admin/embajadores?sin_productos=1" cta="Ver">
                <span>{a.idle_ambassadors.slice(0, 4).map((x) => x.brand_name).join(' · ')}{a.idle_ambassadors.length > 4 ? '…' : ''}</span>
              </Alert>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2 className="panel-title">Actividad reciente</h2>
        <ul className="activity">
          {d.activity.map((l) => (
            <li key={l.id}>
              <b>{l.actor}</b> {ACTION[l.action] ?? l.action} {ENTITY[l.entity] ?? l.entity}
              <span className="muted small">{dateTime(l.created_at)}</span>
            </li>
          ))}
          {!d.activity.length && <li className="muted">Sin actividad todavía.</li>}
        </ul>
        <Link to="/admin/actividad" className="link">Ver toda la actividad</Link>
      </section>
    </div>
  );
}

export { ACTION, ENTITY };
