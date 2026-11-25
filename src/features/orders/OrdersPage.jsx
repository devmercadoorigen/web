import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { longDate, money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { StatusPill } from './StatusPill.jsx';

export default function OrdersPage() {
  useTitle('Mis pedidos');
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['orders', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total, created_at, estimated_delivery, items:order_items (quantity)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (q.isLoading) return <div className="panel"><div className="skeleton-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 76 }} />)}</div></div>;
  if (q.error) return <div className="panel"><p className="notice notice-error">{friendlyError(q.error)}</p></div>;

  if (!q.data.length) {
    return (
      <div className="empty">
        <Icon name="box" size={40} stroke={1.6} />
        <b>Aún no tienes pedidos</b>
        <p>Cuando compres, aquí verás cada paso: del taller del embajador a tu puerta.</p>
        <Link className="btn btn-green" to="/#tienda">Ver productos del Huila</Link>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Mis pedidos</h2>
      <ul className="order-list">
        {q.data.map((o) => {
          const units = o.items.reduce((s, i) => s + i.quantity, 0);
          return (
            <li key={o.id}>
              <Link to={`/cuenta/pedidos/${o.order_number}`} className="order-row">
                <div>
                  <b>{o.order_number}</b>
                  <span>{longDate(o.created_at)} · {units} {units === 1 ? 'producto' : 'productos'}</span>
                </div>
                <StatusPill status={o.status} />
                <span className="order-total">{money(o.total)}</span>
                <Icon name="arrow" size={18} stroke={2.4} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
