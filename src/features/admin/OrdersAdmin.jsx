import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { dateTime, longDate, money, ORDER_STATUS, whatsappLink } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';
import { StatusPill } from '../orders/StatusPill.jsx';
import { Timeline } from '../orders/Timeline.jsx';
import { DataTable, Tabs, useServerTable } from './kit.jsx';

const STATUS_OPTIONS = Object.entries(ORDER_STATUS).map(([v, s]) => [v, s.label]);
const ITEM_STATUS = { pendiente: ['Por preparar', 'mute'], listo_para_recoger: ['Listo para recoger', 'ocre'], recibido_en_bodega: ['En bodega', 'verde'] };
const PAY_TONE = { APPROVED: 'verde', PENDING: 'ocre', DECLINED: 'err', ERROR: 'err', VOIDED: 'mute' };

/* ------------------------------------------------------------ Lista */
export function OrdersList() {
  useTitle('Pedidos');
  const [params] = useSearchParams();
  const [tab, setTab] = useState('pedidos');
  const table = useServerTable({
    key: ['orders'],
    initialSort: { col: 'created_at', asc: false },
    initialFilters: { status: params.get('estado') || undefined, review: params.get('revision') || undefined },
    query: ({ search, filters, sort, from, to }) => {
      let q = supabase.from('orders').select('id, order_number, status, total, email, customer_name, created_at, needs_review, status_changed_at, shipping_address, items:order_items (quantity)', { count: 'exact' });
      if (search) q = q.or(`order_number.ilike.%${search}%,email.ilike.%${search}%,customer_name.ilike.%${search}%`);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.review) q = q.eq('needs_review', true);
      return q.order(sort.col, { ascending: sort.asc }).range(from, to);
    },
  });

  return (
    <div className="pn-stack">
      <header className="pn-head"><h1>Pedidos</h1></header>
      <Tabs tabs={[['pedidos', 'Todos los pedidos'], ['recoger', 'Por recoger']]} value={tab} onChange={setTab} />
      {tab === 'recoger' ? <Pickups /> : (
        <DataTable
          table={table}
          searchPlaceholder="Número, correo o nombre"
          filterDefs={[{ key: 'status', label: 'Estado', options: STATUS_OPTIONS }, { key: 'review', label: 'Revisión', options: [['1', 'Para revisar']] }]}
          empty="No hay pedidos con esos filtros."
          columns={[
            { key: 'order_number', label: 'Pedido', sort: 'order_number', render: (o) => <Link to={`/admin/pedidos/${o.order_number}`} className="link">{o.order_number}</Link> },
            { key: 'created_at', label: 'Fecha', sort: 'created_at', render: (o) => dateTime(o.created_at) },
            { key: 'customer', label: 'Cliente', render: (o) => <>{o.customer_name}<br /><span className="muted small">{o.shipping_address?.city}</span></> },
            { key: 'items', label: 'Unid.', className: 'num', render: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
            { key: 'total', label: 'Total', sort: 'total', className: 'num', render: (o) => money(o.total) },
            { key: 'status', label: 'Estado', sort: 'status', render: (o) => <>{o.needs_review && <span className="pill pill-err">Revisar</span>} <StatusPill status={o.status} /></> },
          ]}
        />
      )}
    </div>
  );
}

/** Items listos en los talleres: ruta de recolección agrupada por embajador. */
function Pickups() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'pickups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('id, sku, name, quantity, ready_at, item_status, order:orders!inner (order_number, status), ambassador:ambassadors (id, brand_name, municipality:municipalities (name), private:ambassador_private (phone))')
        .in('item_status', ['pendiente', 'listo_para_recoger'])
        .in('order.status', ['pagado', 'preparando'])
        .order('ready_at', { nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  const groups = useMemo(() => {
    const m = new Map();
    for (const it of q.data || []) {
      const k = it.ambassador?.id;
      if (!m.has(k)) m.set(k, { amb: it.ambassador, items: [] });
      m.get(k).items.push(it);
    }
    return [...m.values()].sort((a, b) => b.items.filter((i) => i.item_status === 'listo_para_recoger').length - a.items.filter((i) => i.item_status === 'listo_para_recoger').length);
  }, [q.data]);

  const receive = async (ids) => {
    const { error } = await supabase.rpc('admin_receive_items', { p_item_ids: ids });
    if (error) return notify(friendlyError(error), 'error');
    qc.invalidateQueries({ queryKey: ['admin'] });
    notify('Recibido en bodega');
  };

  if (q.isLoading) return <div className="skeleton" style={{ height: 200 }} />;
  if (!groups.length) return <div className="empty"><Icon name="truck" size={40} stroke={1.6} /><b>No hay nada por recoger</b><p>Aquí aparecen los productos de pedidos pagados que aún no llegan a la bodega.</p></div>;
  return (
    <ul className="prep-list">
      {groups.map((g) => {
        const ready = g.items.filter((i) => i.item_status === 'listo_para_recoger');
        const phone = g.amb?.private?.phone;
        return (
          <li key={g.amb?.id} className="panel prep-card">
            <header>
              <div><b className="prep-order">{g.amb?.brand_name}</b> <span className="muted small"><Icon name="pin" size={13} />{g.amb?.municipality?.name}</span></div>
              <div className="form-actions">
                {phone && <a className="btn btn-outline btn-sm" href={whatsappLink('Hola, vamos a pasar a recoger los productos de Mercado Origen').replace(/wa\.me\/\d+/, `wa.me/57${phone.replace(/\D/g, '').slice(-10)}`)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} />WhatsApp</a>}
                {ready.length > 0 && <button type="button" className="btn btn-green btn-sm" onClick={() => receive(ready.map((i) => i.id))}>Recibí los {ready.length} listos</button>}
              </div>
            </header>
            <ul className="item-list">
              {g.items.map((it) => (
                <li key={it.id}>
                  <div><b>{it.name}</b><span className="sku">{it.sku}</span><Link to={`/admin/pedidos/${it.order.order_number}`} className="link small">{it.order.order_number}</Link></div>
                  <span className="prep-qty">{it.quantity} und.</span>
                  <span className={`pill pill-${ITEM_STATUS[it.item_status][1]}`}>{ITEM_STATUS[it.item_status][0]}</span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------ Detalle */
export function OrderAdminDetail() {
  const { numero } = useParams();
  useTitle(`Pedido ${numero}`);
  const { notify } = useToast();
  const qc = useQueryClient();
  const [statusForm, setStatusForm] = useState(null);
  const [ship, setShip] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const q = useQuery({
    queryKey: ['admin', 'order', numero],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from('orders')
        .select(`*, items:order_items (id, sku, name, unit_price, quantity, line_total, kit_id, item_status, ready_at, received_at,
                   ambassador:ambassadors (id, brand_name, municipality:municipalities (name))),
                 history:order_status_history (status, note, created_at, changed_by),
                 payments (reference, wompi_transaction_id, status, status_message, payment_method_type, amount_in_cents, created_at),
                 user:profiles (full_name, email)`)
        .eq('order_number', numero)
        .maybeSingle();
      if (e) throw e;
      return data;
    },
  });
  const o = q.data;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin'] }); qc.invalidateQueries({ queryKey: ['catalog'] }); };

  if (q.isLoading) return <div className="skeleton" style={{ height: 400 }} />;
  if (!o) return <div className="empty"><b>No encontramos el pedido {numero}</b><Link to="/admin/pedidos" className="btn btn-green">Volver</Link></div>;

  const history = [...o.history].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const groups = [];
  for (const it of o.items) {
    let g = groups.find((x) => x.id === it.ambassador?.id);
    if (!g) groups.push((g = { id: it.ambassador?.id, amb: it.ambassador, items: [] }));
    g.items.push(it);
  }
  const notReceived = o.items.filter((i) => i.item_status !== 'recibido_en_bodega');
  const addr = o.shipping_address || {};

  const changeStatus = async () => {
    const { status, note } = statusForm;
    if (['cancelado', 'reembolsado'].includes(status) && !window.confirm(status === 'cancelado'
      ? '¿Cancelar el pedido? Se devuelve el stock y se anula lo que se le debía a los embajadores.'
      : '¿Marcar como reembolsado? Haz primero el reembolso en el panel de Wompi.')) return;
    setBusy(true);
    const { error: e } = await supabase.rpc('admin_set_order_status', { p_order_id: o.id, p_status: status, p_note: note || null });
    setBusy(false);
    if (e) return setError(friendlyError(e));
    setStatusForm(null);
    refresh();
    notify(`Pedido ${ORDER_STATUS[status].label.toLowerCase()}`);
  };

  const saveShipping = async () => {
    setBusy(true);
    const { error: e } = await supabase.from('orders').update({
      carrier: ship.carrier.trim() || null, tracking_code: ship.tracking_code.trim() || null, estimated_delivery: ship.estimated_delivery || null,
    }).eq('id', o.id);
    setBusy(false);
    if (e) return setError(friendlyError(e));
    setShip(null);
    refresh();
    notify('Datos de envío guardados');
  };

  const receive = async (ids) => {
    const { error: e } = await supabase.rpc('admin_receive_items', { p_item_ids: ids });
    if (e) return notify(friendlyError(e), 'error');
    refresh();
    notify('Recibido en bodega');
  };

  const clearReview = async () => {
    const { error: e } = await supabase.from('orders').update({ needs_review: false }).eq('id', o.id);
    if (e) return notify(friendlyError(e), 'error');
    refresh();
    notify('Marcado como revisado');
  };

  return (
    <div className="pn-stack">
      <Link to="/admin/pedidos" className="back-link"><Icon name="arrow" size={16} stroke={2.4} /> Pedidos</Link>
      <header className="pn-head pn-head-row">
        <div>
          <h1>{o.order_number}</h1>
          <p className="muted">Hecho el {dateTime(o.created_at)}{o.user ? ' · cliente registrado' : ' · invitado'}</p>
        </div>
        <StatusPill status={o.status} />
      </header>

      {o.needs_review && (
        <div className="alert alert-crit"><Icon name="shield" size={20} /><div><b>Para revisar</b><span>{o.review_reason}</span></div><button type="button" className="link-btn" onClick={clearReview}>Marcar revisado</button></div>
      )}
      <FormNotice>{error}</FormNotice>

      <div className="order-cols">
        <div className="order-main">
          <section className="panel">
            <div className="panel-row">
              <h2 className="panel-title">Productos por embajador</h2>
              {notReceived.length > 0 && ['pagado', 'preparando'].includes(o.status) && (
                <button type="button" className="btn btn-green btn-sm" onClick={() => receive(notReceived.map((i) => i.id))}>Todo llegó a bodega</button>
              )}
            </div>
            {groups.map((g) => (
              <div className="amb-group" key={g.id}>
                <div className="amb-group-head"><div><b><Link to={`/admin/embajadores/${g.id}`} className="link">{g.amb?.brand_name}</Link></b><span><Icon name="pin" size={13} />{g.amb?.municipality?.name}</span></div></div>
                <ul className="item-list">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <div><b>{it.name}</b><span className="sku">{it.sku}</span>{it.kit_id && <span className="tag">Kit</span>}</div>
                      <span className="muted">{it.quantity} × {money(it.unit_price)}</span>
                      <span className="item-status">
                        <span className={`pill pill-${ITEM_STATUS[it.item_status][1]}`}>{ITEM_STATUS[it.item_status][0]}</span>
                        {it.item_status !== 'recibido_en_bodega' && ['pagado', 'preparando'].includes(o.status) && (
                          <button type="button" className="link-btn" onClick={() => receive([it.id])}>Recibido</button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="panel">
            <div className="panel-row">
              <h2 className="panel-title">Seguimiento</h2>
              {!statusForm && <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatusForm({ status: o.status, note: '' })}>Cambiar estado</button>}
            </div>
            {statusForm && (
              <form className="form inline-form" onSubmit={(e) => { e.preventDefault(); changeStatus(); }}>
                <div className="form-2">
                  <Field id="os-status" label="Nuevo estado">
                    <select id="os-status" value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                      {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Field>
                  <Field id="os-note" label="Nota para el historial" optional hint="El cliente la ve en su línea de tiempo.">
                    <input id="os-note" value={statusForm.note} onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })} maxLength={200} />
                  </Field>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-green btn-sm" disabled={busy || statusForm.status === o.status}>Guardar estado</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatusForm(null)}>Cancelar</button>
                </div>
              </form>
            )}
            <Timeline status={o.status} history={history} />
            {['cancelado', 'reembolsado'].includes(o.status) && <p className="notice notice-mute">Pedido {ORDER_STATUS[o.status].label.toLowerCase()}: {history.at(-1)?.note || 'sin nota'}.</p>}
          </section>
        </div>

        <aside className="order-side">
          <section className="panel">
            <h2 className="panel-title">Cliente</h2>
            <dl className="kv">
              <dt>Nombre</dt><dd>{o.customer_name}</dd>
              <dt>Correo</dt><dd><a className="link" href={`mailto:${o.email}`}>{o.email}</a></dd>
              {o.customer_phone && (<><dt>Celular</dt><dd><a className="link" href={whatsappLink(`Hola ${o.customer_name.split(' ')[0]}, te escribimos de Mercado Origen por tu pedido ${o.order_number}`).replace(/wa\.me\/\d+/, `wa.me/57${o.customer_phone.replace(/\D/g, '').slice(-10)}`)} target="_blank" rel="noreferrer">{o.customer_phone}</a></dd></>)}
              {o.customer_document && (<><dt>Documento</dt><dd>{o.customer_document}</dd></>)}
              {o.age_confirmed_at && (<><dt>Mayor de edad</dt><dd>Confirmado</dd></>)}
            </dl>
            <div className="addr"><b>{addr.recipient} · {addr.phone}</b><span>{addr.address_line}</span><span>{addr.city}, {addr.department}</span>{addr.notes && <span className="muted">{addr.notes}</span>}</div>
            {o.customer_notes && <p className="small"><b>Nota del cliente:</b> {o.customer_notes}</p>}
          </section>

          <section className="panel">
            <div className="panel-row">
              <h2 className="panel-title">Envío</h2>
              {!ship && <button type="button" className="link-btn" onClick={() => setShip({ carrier: o.carrier || '', tracking_code: o.tracking_code || '', estimated_delivery: o.estimated_delivery || '' })}>Editar</button>}
            </div>
            {ship ? (
              <form className="form" onSubmit={(e) => { e.preventDefault(); saveShipping(); }}>
                <Field id="sh-carrier" label="Transportadora"><input id="sh-carrier" value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} list="carriers" /></Field>
                <datalist id="carriers">{['Servientrega', 'Interrapidísimo', 'Coordinadora', 'Envía', 'TCC', 'Deprisa', '4-72'].map((c) => <option key={c} value={c} />)}</datalist>
                <Field id="sh-tracking" label="Número de guía"><input id="sh-tracking" value={ship.tracking_code} onChange={(e) => setShip({ ...ship, tracking_code: e.target.value })} /></Field>
                <Field id="sh-eta" label="Entrega estimada"><input id="sh-eta" type="date" value={ship.estimated_delivery} onChange={(e) => setShip({ ...ship, estimated_delivery: e.target.value })} /></Field>
                <div className="form-actions"><button type="submit" className="btn btn-green btn-sm" disabled={busy}>Guardar</button><button type="button" className="btn btn-outline btn-sm" onClick={() => setShip(null)}>Cancelar</button></div>
              </form>
            ) : (
              <dl className="kv">
                <dt>Transportadora</dt><dd>{o.carrier || '—'}</dd>
                <dt>Guía</dt><dd>{o.tracking_code ? <span className="sku">{o.tracking_code}</span> : '—'}</dd>
                <dt>Entrega estimada</dt><dd>{o.estimated_delivery ? longDate(`${o.estimated_delivery}T12:00:00`) : '—'}</dd>
              </dl>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-title">Pagos (Wompi)</h2>
            <ul className="pay-list">
              {[...o.payments].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => (
                <li key={p.reference}>
                  <div><span className={`pill pill-${PAY_TONE[p.status]}`}>{p.status}</span> {p.payment_method_type && <b>{p.payment_method_type}</b>}</div>
                  <span className="sku">{p.reference}</span>
                  {p.wompi_transaction_id && <span className="muted small">Transacción {p.wompi_transaction_id}</span>}
                  {p.status_message && <span className="muted small">{p.status_message}</span>}
                  <span className="muted small">{dateTime(p.created_at)} · {money(p.amount_in_cents / 100)}</span>
                </li>
              ))}
            </ul>
            <dl className="totals">
              <dt>Subtotal</dt><dd>{money(o.subtotal)}</dd>
              {o.discount > 0 && (<><dt>Descuento {o.coupon_code}</dt><dd>−{money(o.discount)}</dd></>)}
              <dt>Envío</dt><dd>{o.shipping ? money(o.shipping) : 'Gratis'}</dd>
              <dt className="total">Total</dt><dd className="total">{money(o.total)}</dd>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
