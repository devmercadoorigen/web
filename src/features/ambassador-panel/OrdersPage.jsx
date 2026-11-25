import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { dateTime, money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

const TABS = [
  ['pendiente', 'Por preparar'],
  ['listo_para_recoger', 'Listos para recoger'],
  ['recibido_en_bodega', 'Entregados en bodega'],
];

/** Items vendidos del embajador agrupados por pedido (sin datos del cliente). */
export default function OrdersPage() {
  useTitle('Pedidos por preparar');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('pendiente');

  const q = useQuery({
    queryKey: ['amb-items'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ambassador_order_items', { p_status: null });
      if (error) throw error;
      return data;
    },
  });

  const ready = useMutation({
    mutationFn: async (itemId) => {
      const { error } = await supabase.rpc('ambassador_mark_ready', { p_order_item_id: itemId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['amb-items'] });
      qc.invalidateQueries({ queryKey: ['amb-dashboard'] });
      notify('Marcado como listo: pasaremos a recogerlo');
    },
    onError: (e) => notify(friendlyError(e), 'error'),
  });

  const counts = useMemo(() => (q.data || []).reduce((m, i) => ({ ...m, [i.item_status]: (m[i.item_status] || 0) + 1 }), {}), [q.data]);
  const groups = useMemo(() => {
    const out = [];
    for (const it of (q.data || []).filter((i) => i.item_status === tab)) {
      let g = out.find((x) => x.order === it.order_number);
      if (!g) out.push((g = { order: it.order_number, paid_at: it.paid_at, items: [] }));
      g.items.push(it);
    }
    return out;
  }, [q.data, tab]);

  return (
    <div className="pn-stack">
      <header className="pn-head">
        <h1>Pedidos por preparar</h1>
        <p className="muted">Alista y empaca cada producto. Cuando esté listo, márcalo y Mercado Origen pasa a recogerlo para enviarlo con el resto de la caja del cliente.</p>
      </header>

      <div className="chips" role="tablist" aria-label="Estado de preparación">
        {TABS.map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>
            {l}{counts[v] ? <em>{counts[v]}</em> : null}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="skeleton-list">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>
      ) : q.error ? (
        <p className="notice notice-error">{friendlyError(q.error)}</p>
      ) : !groups.length ? (
        <div className="empty">
          <Icon name="box" size={40} stroke={1.6} />
          <b>{tab === 'pendiente' ? 'No tienes nada por preparar' : 'Nada por aquí todavía'}</b>
          <p>{tab === 'pendiente' ? 'Cuando un cliente compre tus productos, aparecerán aquí.' : 'Los pedidos aparecerán aquí a medida que avancen.'}</p>
        </div>
      ) : (
        <ul className="prep-list">
          {groups.map((g) => (
            <li key={g.order} className="panel prep-card">
              <header>
                <b className="prep-order">{g.order}</b>
                <span className="muted small">Pagado el {dateTime(g.paid_at)}</span>
              </header>
              <ul className="item-list">
                {g.items.map((it) => (
                  <li key={it.order_item_id}>
                    <div>
                      <b>{it.name}</b>
                      <span className="sku">{it.sku}</span>
                      {it.in_kit && <span className="tag">Va en un kit de regalo</span>}
                    </div>
                    <span className="prep-qty">{it.quantity} und.</span>
                    {tab === 'pendiente' ? (
                      <button type="button" className="btn btn-green btn-sm" disabled={ready.isPending} onClick={() => ready.mutate(it.order_item_id)}>
                        <Icon name="check" size={16} stroke={2.6} />Listo para recoger
                      </button>
                    ) : (
                      <span className="muted small">{money(it.line_total)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
