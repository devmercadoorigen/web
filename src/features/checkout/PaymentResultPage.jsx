import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { money, whatsappLink } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { PageLoader } from '../../components/PageLoader.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useCart } from '../cart/CartProvider.jsx';
import { clearPending, PAYMENT_LABEL, paymentStatus, readPending, retryPayment } from './api.js';
import { openWompi } from './wompi.js';

const MAX_WAIT_MS = 3 * 60_000;

/**
 * Resultado del pago. El estado sale SIEMPRE del servidor (payment-status
 * consulta a Wompi con la llave privada); los parámetros de la URL solo dicen
 * qué transacción consultar.
 */
export default function PaymentResultPage() {
  const [params, setParams] = useSearchParams();
  const txId = params.get('id');
  const [pending] = useState(readPending);
  const { user } = useAuth();
  const { clear } = useCart();
  const qc = useQueryClient();
  const started = useRef(Date.now());
  const cleared = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  const q = useQuery({
    queryKey: ['payment-status', txId, pending?.order_number],
    enabled: !!txId || !!pending,
    retry: 2,
    queryFn: () => paymentStatus(txId ? { id: txId } : { order_number: pending.order_number, access_token: pending.access_token }),
    refetchInterval: (query) =>
      query.state.data?.payment_status === 'PENDING' && Date.now() - started.current < MAX_WAIT_MS ? 4000 : false,
  });
  const s = q.data;
  const status = s?.payment_status;
  useTitle(status === 'APPROVED' ? 'Pago aprobado' : status === 'PENDING' ? 'Pago en proceso' : 'Resultado del pago');

  // Pago aprobado: se vacía el carrito (solo si es el pedido de este navegador).
  useEffect(() => {
    if (status !== 'APPROVED' || cleared.current) return;
    if (pending?.order_number === s.order_number || !pending) {
      cleared.current = true;
      clear();
      clearPending();
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['catalog'] }); // el stock cambió
    }
  }, [status, s, pending, clear, qc]);

  const retry = async () => {
    setRetryError('');
    setRetrying(true);
    try {
      const res = await retryPayment(pending.order_number, pending.access_token);
      await openWompi(res.wompi, res.customer || { email: pending.email }, (tx) => {
        if (tx?.id) setParams({ id: tx.id });
      });
    } catch (e) {
      setRetryError(e.message);
    } finally {
      setRetrying(false);
    }
  };

  if (!txId && !pending) {
    return (
      <Shell icon="leaf" tone="mute" title="No hay un pago en curso">
        <p>Si acabas de pagar, revisa tu correo: ahí te llega la confirmación.</p>
        <div className="result-actions"><Link className="btn btn-green" to={user ? '/cuenta/pedidos' : '/'}>{user ? 'Ver mis pedidos' : 'Volver a la tienda'}</Link></div>
      </Shell>
    );
  }

  if (q.isLoading) return <PageLoader label="Confirmando tu pago con el banco…" />;

  if (q.error || !s) {
    return (
      <Shell icon="leaf" tone="mute" title="Aún no tenemos noticias de tu pago">
        <p>{q.error?.message || 'Puede tardar unos segundos.'}</p>
        <div className="result-actions">
          <button type="button" className="btn btn-green" onClick={() => q.refetch()}>Volver a consultar</button>
          <a className="btn btn-outline" href={whatsappLink(`Hola, pagué un pedido y no veo la confirmación${pending ? ` (${pending.order_number})` : ''}`)} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>
        </div>
      </Shell>
    );
  }

  const orderLink = user && s.has_account ? `/cuenta/pedidos/${s.order_number}` : pending?.access_token ? `/pedido/${s.order_number}?t=${pending.access_token}` : null;
  const method = PAYMENT_LABEL[s.payment_method_type];

  if (status === 'APPROVED') {
    return (
      <Shell icon="check" tone="ok" title="¡Pago aprobado!" kicker={`Pedido ${s.order_number}`}>
        <p>
          Recibimos {money(s.total)}{method ? ` con ${method}` : ''}. Te enviamos la confirmación a <b>{s.email}</b>.
          Los embajadores ya están alistando tus productos y te llegan juntos en una sola caja desde el Huila.
        </p>
        <ol className="result-steps">
          <li><b>Preparan</b> cada embajador alista su parte</li>
          <li><b>Consolidamos</b> todo en nuestra bodega del Huila</li>
          <li><b>Despachamos</b> y te avisamos el número de guía</li>
        </ol>
        <div className="result-actions">
          {orderLink && <Link className="btn btn-green" to={orderLink}>Seguir mi pedido</Link>}
          <Link className="btn btn-outline" to="/">Seguir comprando</Link>
        </div>
      </Shell>
    );
  }

  if (status === 'PENDING') {
    const waitedOut = Date.now() - started.current >= MAX_WAIT_MS;
    return (
      <Shell icon="refresh" tone="ocre" title="Tu pago está en proceso" kicker={`Pedido ${s.order_number}`}>
        <p>
          {method === 'PSE' ? 'Tu banco aún está confirmando la transferencia.' : method === 'Nequi' ? 'Acepta la notificación en tu app de Nequi.' : 'El banco aún no confirma el pago.'}{' '}
          {waitedOut ? 'Te avisaremos por correo apenas se confirme.' : 'Esta página se actualiza sola.'}
        </p>
        <div className="result-actions">
          <button type="button" className="btn btn-green" onClick={() => q.refetch()} disabled={q.isFetching}>{q.isFetching ? 'Consultando…' : 'Actualizar'}</button>
          {orderLink && <Link className="btn btn-outline" to={orderLink}>Ver mi pedido</Link>}
        </div>
      </Shell>
    );
  }

  // DECLINED, VOIDED o ERROR
  const canRetry = !!pending?.access_token && pending.order_number === s.order_number && s.order_status === 'pendiente_pago';
  return (
    <Shell icon="close" tone="err" title="Tu pago no fue aprobado" kicker={`Pedido ${s.order_number}`}>
      <p>
        {status === 'ERROR' ? 'Hubo un problema con el medio de pago.' : 'El banco o la billetera rechazó la transacción.'} No se hizo ningún cobro.
        {canRetry ? ' Tu pedido sigue reservado: puedes intentarlo de nuevo con otro medio de pago.' : ''}
      </p>
      {retryError && <p className="notice notice-error">{retryError}</p>}
      <div className="result-actions">
        {canRetry ? (
          <button type="button" className="btn btn-ocre" onClick={retry} disabled={retrying}>{retrying ? 'Abriendo la pasarela…' : 'Intentar de nuevo'}</button>
        ) : (
          <Link className="btn btn-ocre" to="/checkout">Volver al pago</Link>
        )}
        <a className="btn btn-outline" href={whatsappLink(`Hola, mi pago del pedido ${s.order_number} no fue aprobado`)} target="_blank" rel="noreferrer">Ayuda por WhatsApp</a>
      </div>
    </Shell>
  );
}

function Shell({ icon, tone, title, kicker, children }) {
  return (
    <section className="result">
      <div className="wrap">
        <div className={`result-card result-${tone}`}>
          <span className="result-ico"><Icon name={icon} size={34} stroke={2.4} /></span>
          {kicker && <span className="kicker">{kicker}</span>}
          <h1>{title}</h1>
          {children}
        </div>
      </div>
    </section>
  );
}
