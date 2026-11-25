import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { longDate, money, ORDER_STATUS, plainDate, whatsappLink } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { StatusPill } from './StatusPill.jsx';
import { Timeline } from './Timeline.jsx';

// Seguimiento para quien compró como invitado: enlace del correo con número + token.
export default function GuestOrderPage() {
  const { numero } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t');
  useTitle(`Pedido ${numero}`);
  const q = useQuery({
    queryKey: ['guest-order', numero, token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('guest_order', { p_order_number: numero, p_access_token: token });
      if (error) throw error;
      return data;
    },
  });

  if (!token || q.error || (q.isSuccess && !q.data)) {
    return (
      <section className="page-state">
        <div className="wrap">
          <div className="empty">
            <Icon name="box" size={40} stroke={1.6} />
            <b>No pudimos abrir este pedido</b>
            <p>Usa el enlace de tu correo de confirmación o escríbenos con tu número de pedido.</p>
            <a className="btn btn-green" href={whatsappLink(`Hola, quiero saber el estado de mi pedido ${numero}`)} target="_blank" rel="noreferrer">Preguntar por WhatsApp</a>
          </div>
        </div>
      </section>
    );
  }
  if (q.isLoading) return <section className="account"><div className="wrap"><div className="skeleton" style={{ height: 360 }} /></div></section>;

  const o = q.data;
  const closed = o.status === 'cancelado' || o.status === 'reembolsado';
  return (
    <section className="account">
      <div className="wrap order-detail">
        <div className="panel order-head">
          <div>
            <span className="kicker">Pedido</span>
            <h2>{o.order_number}</h2>
            <span className="muted">Hecho el {longDate(o.created_at)}</span>
          </div>
          <StatusPill status={o.status} />
        </div>
        <div className="order-cols">
          <div className="panel">
            <h3 className="panel-title">Seguimiento</h3>
            {closed ? <p className="notice notice-mute">Este pedido está {ORDER_STATUS[o.status].label.toLowerCase()}.</p> : <Timeline status={o.status} history={o.history || []} />}
          </div>
          <aside className="order-side">
            <div className="panel">
              <h3 className="panel-title">Envío</h3>
              <dl className="kv">
                {o.carrier && (<><dt>Transportadora</dt><dd>{o.carrier}</dd></>)}
                {o.tracking_code && (<><dt>Número de guía</dt><dd><span className="sku">{o.tracking_code}</span></dd></>)}
                {o.estimated_delivery && o.status !== 'entregado' && (<><dt>Entrega estimada</dt><dd>{plainDate(o.estimated_delivery)}</dd></>)}
              </dl>
              {!o.carrier && <p className="muted small">Te avisamos la guía cuando despachemos tu caja.</p>}
            </div>
            <div className="panel">
              <h3 className="panel-title">Productos</h3>
              <ul className="item-list">
                {(o.items || []).map((it, i) => (
                  <li key={i}><div><b>{it.name}</b><span className="sku">{it.sku}</span></div><span className="muted">{it.quantity} ×</span><b>{money(it.unit_price * it.quantity)}</b></li>
                ))}
              </ul>
              <dl className="totals">
                <dt className="total">Total</dt><dd className="total">{money(o.total)}</dd>
              </dl>
            </div>
            <Link to="/registro" className="btn btn-outline btn-block">Crea una cuenta para seguir tus pedidos</Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
