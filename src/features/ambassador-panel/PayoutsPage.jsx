import { useOutletContext } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { dateTime, longDate, money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

export default function PayoutsPage() {
  useTitle('Mis pagos');
  const { amb } = useOutletContext();
  const { notify } = useToast();
  const rate = amb.private?.commission_rate;

  const payouts = useQuery({
    queryKey: ['amb-payouts', amb.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ambassador_payouts')
        .select('id, period_start, period_end, gross, commission, net, status, paid_at, receipt_url, items_without_commission')
        .eq('ambassador_id', amb.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const open = payouts.data?.find((p) => p.status === 'pendiente');
  const ledger = useQuery({
    queryKey: ['amb-ledger', open?.id],
    enabled: !!open,
    queryFn: async () => {
      const [{ data: rows, error }, { data: items }] = await Promise.all([
        supabase.from('ambassador_ledger').select('order_item_id, gross, commission, net, created_at').eq('payout_id', open.id).order('created_at', { ascending: false }),
        supabase.rpc('ambassador_order_items', { p_status: null }),
      ]);
      if (error) throw error;
      const byItem = new Map((items || []).map((i) => [i.order_item_id, i]));
      return rows.map((r) => ({ ...r, item: byItem.get(r.order_item_id) }));
    },
  });

  // El comprobante está en un bucket privado: se abre con un enlace firmado de 1 minuto.
  const openReceipt = async (path) => {
    if (/^https?:/.test(path)) return window.open(path, '_blank', 'noopener');
    const { data, error } = await supabase.storage.from('payout-receipts').createSignedUrl(path, 60);
    if (error) return notify(friendlyError(error), 'error');
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const paid = (payouts.data || []).filter((p) => p.status === 'pagado');

  return (
    <div className="pn-stack">
      <header className="pn-head">
        <h1>Mis pagos</h1>
        <p className="muted">
          Mercado Origen recibe el pago de cada cliente y te transfiere tu parte: el precio de tus productos menos la comisión acordada
          {rate != null ? ` (${Number(rate)}%)` : ''}.
        </p>
      </header>

      <div className="kpi-grid">
        <div className="kpi kpi-ocre">
          <span className="kpi-label"><Icon name="card" size={18} />Saldo por pagarte</span>
          <b className="kpi-value">{money(open?.net || 0)}</b>
          <span className="kpi-hint">{open ? `Ventas desde el ${longDate(open.period_start)}` : 'Sin ventas pendientes'}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label"><Icon name="check" size={18} />Total recibido</span>
          <b className="kpi-value">{money(paid.reduce((s, p) => s + p.net, 0))}</b>
          <span className="kpi-hint">{paid.length} {paid.length === 1 ? 'pago' : 'pagos'}</span>
        </div>
      </div>

      {open?.items_without_commission > 0 && (
        <p className="notice notice-mute"><Icon name="leaf" size={18} />Aún no hemos acordado tu comisión. El saldo mostrado es el valor bruto; te escribiremos para definirla antes de pagarte.</p>
      )}

      {open && (
        <section className="panel">
          <h2 className="panel-title">Ventas de este periodo</h2>
          {ledger.isLoading ? <div className="skeleton" style={{ height: 120 }} /> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Pedido</th><th>Producto</th><th className="num">Venta</th><th className="num">Comisión</th><th className="num">Para ti</th></tr></thead>
                <tbody>
                  {(ledger.data || []).map((r) => (
                    <tr key={r.order_item_id}>
                      <td data-label="Pedido">{r.item?.order_number ?? '—'}<br /><span className="muted small">{dateTime(r.created_at)}</span></td>
                      <td data-label="Producto">{r.item?.name ?? '—'} {r.item && <span className="muted">× {r.item.quantity}</span>}</td>
                      <td data-label="Venta" className="num">{money(r.gross)}</td>
                      <td data-label="Comisión" className="num">{r.commission == null ? 'Por acordar' : `−${money(r.commission)}`}</td>
                      <td data-label="Para ti" className="num"><b>{money(r.net ?? r.gross)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="panel">
        <h2 className="panel-title">Historial de pagos</h2>
        {payouts.isLoading ? <div className="skeleton" style={{ height: 80 }} /> : !paid.length ? (
          <p className="muted">Aún no tienes pagos registrados. Te avisaremos cada vez que te transfiramos.</p>
        ) : (
          <ul className="payout-list">
            {paid.map((p) => (
              <li key={p.id}>
                <div>
                  <b>{money(p.net)}</b>
                  <span className="muted small">Ventas del {longDate(p.period_start)} al {longDate(p.period_end)} · pagado el {longDate(p.paid_at)}</span>
                </div>
                {p.receipt_url && <button type="button" className="link-btn" onClick={() => openReceipt(p.receipt_url)}>Ver comprobante</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
