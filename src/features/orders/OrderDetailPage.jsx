import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { longDate, money, ORDER_STATUS, plainDate, whatsappLink } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { useToast } from '../../components/Toast.jsx';
import { Icon } from '../../components/ui.jsx';
import { StatusPill } from './StatusPill.jsx';
import { Timeline } from './Timeline.jsx';

export default function OrderDetailPage() {
  const { numero } = useParams();
  useTitle(`Pedido ${numero}`);
  const { notify } = useToast();
  const q = useQuery({
    queryKey: ['orders', 'detail', numero],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`id, order_number, status, subtotal, discount, shipping, total, coupon_code, shipping_address, carrier, tracking_code,
                 estimated_delivery, created_at, needs_review,
                 items:order_items (id, sku, name, unit_price, quantity, line_total, kit_id, product_id, product:products (slug),
                   ambassador:ambassadors (id, slug, brand_name, initials, municipality:municipalities (name))),
                 history:order_status_history (status, note, created_at)`)
        .eq('order_number', numero)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (q.isLoading) return <div className="panel"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (q.error) return <div className="panel"><p className="notice notice-error">{friendlyError(q.error)}</p></div>;
  if (!q.data) {
    return (
      <div className="empty">
        <Icon name="box" size={40} stroke={1.6} />
        <b>No encontramos el pedido {numero}</b>
        <p>Revisa el número o mira la lista de tus pedidos.</p>
        <Link className="btn btn-green" to="/cuenta/pedidos">Ver mis pedidos</Link>
      </div>
    );
  }

  const o = q.data;
  const history = [...o.history].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const closed = o.status === 'cancelado' || o.status === 'reembolsado';

  // Items agrupados por embajador: así llegan a la bodega del Huila.
  const groups = [];
  for (const it of o.items) {
    const key = it.ambassador?.id ?? 'x';
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, ambassador: it.ambassador, items: [] }));
    g.items.push(it);
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(o.tracking_code);
      notify('Número de guía copiado');
    } catch {
      notify('No pudimos copiarlo. Selecciónalo y cópialo a mano.', 'error');
    }
  };

  const addr = o.shipping_address || {};

  return (
    <div className="order-detail">
      <Link to="/cuenta/pedidos" className="back-link"><Icon name="arrow" size={16} stroke={2.4} /> Mis pedidos</Link>

      <div className="panel order-head">
        <div>
          <span className="kicker">Pedido</span>
          <h2>{o.order_number}</h2>
          <span className="muted">Hecho el {longDate(o.created_at)}</span>
        </div>
        <StatusPill status={o.status} />
      </div>

      <div className="order-cols">
        <div className="order-main">
          <div className="panel">
            <h3 className="panel-title">Seguimiento</h3>
            {closed ? (
              <div className="notice notice-mute">
                <Icon name="close" size={18} stroke={2.4} />
                <div>
                  Este pedido está <b>{ORDER_STATUS[o.status].label.toLowerCase()}</b>
                  {history.at(-1)?.note ? `: ${history.at(-1).note}` : '.'}
                </div>
              </div>
            ) : (
              <Timeline status={o.status} history={history} />
            )}
          </div>

          <div className="panel">
            <h3 className="panel-title">Tus productos</h3>
            <p className="muted small">Cada embajador entrega en nuestra bodega del Huila y te llega todo en una sola caja.</p>
            {groups.map((g) => (
              <div className="amb-group" key={g.key}>
                <div className="amb-group-head">
                  <span className="amb-ava sm">{g.ambassador?.initials ?? '··'}</span>
                  <div>
                    <b>{g.ambassador?.brand_name ?? 'Embajador'}</b>
                    {g.ambassador?.municipality && <span><Icon name="pin" size={13} stroke={2.4} />{g.ambassador.municipality.name}</span>}
                  </div>
                </div>
                <ul className="item-list">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <div>
                        <b>{it.name}</b>
                        <span className="sku">{it.sku}</span>
                        {it.kit_id && <span className="tag">Parte de un kit</span>}
                        {o.status === 'entregado' && it.product?.slug && <Link to={`/producto/${it.product.slug}#resena`} className="link small">Calificar</Link>}
                      </div>
                      <span className="muted">{it.quantity} × {money(it.unit_price)}</span>
                      <b>{money(it.line_total)}</b>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <aside className="order-side">
          <div className="panel">
            <h3 className="panel-title">Envío</h3>
            {o.carrier || o.tracking_code ? (
              <dl className="kv">
                {o.carrier && (<><dt>Transportadora</dt><dd>{o.carrier}</dd></>)}
                {o.tracking_code && (
                  <>
                    <dt>Número de guía</dt>
                    <dd className="kv-copy"><span className="sku">{o.tracking_code}</span><button type="button" className="link-btn" onClick={copy}>Copiar</button></dd>
                  </>
                )}
                {o.estimated_delivery && o.status !== 'entregado' && (<><dt>Entrega estimada</dt><dd>{plainDate(o.estimated_delivery)}</dd></>)}
              </dl>
            ) : (
              <p className="muted small">Te avisaremos la transportadora y el número de guía cuando despachemos tu caja.</p>
            )}
            <div className="addr">
              <b>{addr.recipient}</b>
              <span>{addr.address_line}</span>
              <span>{[addr.city, addr.department].filter(Boolean).join(', ')}</span>
              {addr.notes && <span className="muted">{addr.notes}</span>}
            </div>
          </div>

          <div className="panel">
            <h3 className="panel-title">Resumen</h3>
            <dl className="totals">
              <dt>Subtotal</dt><dd>{money(o.subtotal)}</dd>
              {o.discount > 0 && (<><dt>Descuento{o.coupon_code ? ` (${o.coupon_code})` : ''}</dt><dd>−{money(o.discount)}</dd></>)}
              <dt>Envío</dt><dd>{o.shipping ? money(o.shipping) : 'Gratis'}</dd>
              <dt className="total">Total</dt><dd className="total">{money(o.total)}</dd>
            </dl>
          </div>

          <a className="btn btn-green btn-block" href={whatsappLink(`Hola, necesito ayuda con mi pedido ${o.order_number}`)} target="_blank" rel="noreferrer">
            <Icon name="whatsapp" size={20} /> Ayuda por WhatsApp
          </a>
        </aside>
      </div>
    </div>
  );
}
