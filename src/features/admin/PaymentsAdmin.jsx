import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTitle } from '../../lib/useTitle.js';
import { PAYMENT_MODE_KEY } from '../../lib/paymentMode.js';
import { useToast } from '../../components/Toast.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';
import { Modal } from './kit.jsx';
import { adminFn } from './AmbassadorsAdmin.jsx';

const ENVS = {
  sandbox: { name: 'Prueba (sandbox)', short: 'prueba', tone: 'ocre', hint: 'Pagos simulados: no se cobra dinero. Tarjeta aprobada 4242 4242 4242 4242.' },
  production: { name: 'Producción', short: 'producción', tone: 'verde', hint: 'Pagos reales: Wompi cobra al cliente y te transfiere el dinero.' },
};
const PROBLEM = { falta: 'falta', otro_ambiente: 'es de otro ambiente' };

/** Modo de pagos activo (lo usa también la barra del admin). */
export function usePaymentsConfig() {
  return useQuery({
    queryKey: ['admin', 'payments-config'],
    queryFn: () => adminFn('payments-config', { action: 'get' }),
    staleTime: 30_000,
  });
}

export default function PaymentsAdmin() {
  useTitle('Pagos');
  const { notify } = useToast();
  const qc = useQueryClient();
  const cfg = usePaymentsConfig();
  const [target, setTarget] = useState(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const open = (mode) => { setTarget(mode); setTyped(''); setErr(''); };
  const confirmWord = target === 'production' ? 'PRODUCCION' : 'PRUEBA';
  const apply = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await adminFn('payments-config', { action: 'set_mode', mode: target });
      qc.setQueryData(['admin', 'payments-config'], r);
      qc.setQueryData(PAYMENT_MODE_KEY, r.mode);
      qc.invalidateQueries({ queryKey: ['admin'] }); // pedidos y resúmenes del modo nuevo
      setTarget(null);
      notify(`Pagos en modo ${ENVS[r.mode].short}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (cfg.isLoading) return <div className="pn-stack"><header className="pn-head"><h1>Pagos</h1></header><p className="muted">Cargando…</p></div>;
  if (cfg.error) return <div className="pn-stack"><header className="pn-head"><h1>Pagos</h1></header><FormNotice>{cfg.error.message}</FormNotice></div>;

  const { mode, envs } = cfg.data;
  const other = mode === 'production' ? 'sandbox' : 'production';

  return (
    <div className="pn-stack">
      <header className="pn-head">
        <h1>Pagos</h1>
        <p className="muted">Escoge si la tienda cobra con Wompi en modo de prueba o en producción. El cambio aplica de inmediato a los pagos nuevos.</p>
      </header>

      <section className="panel">
        <span className="kicker">Modo activo</span>
        <h2 className="panel-title"><span className={`pill pill-${ENVS[mode].tone}`}>{ENVS[mode].name}</span></h2>
        <p>{ENVS[mode].hint}</p>
        {!envs[other].ready && (
          <FormNotice tone="mute">
            Para activar el modo {ENVS[other].short} primero configura sus llaves (abajo) en los secretos de Supabase.
          </FormNotice>
        )}
        <div className="form-actions">
          <button type="button" className={`btn ${other === 'production' ? 'btn-green' : 'btn-outline'}`} disabled={!envs[other].ready} onClick={() => open(other)}>
            Cambiar a {ENVS[other].short}
          </button>
        </div>
      </section>

      {['sandbox', 'production'].map((m) => {
        const e = envs[m];
        return (
          <section key={m} className="panel">
            <h2 className="panel-title">
              {ENVS[m].name}{' '}
              <span className={`pill pill-${e.ready ? 'ok' : 'err'}`}>{e.ready ? 'Llaves completas' : 'Incompleto'}</span>
              {m === mode && <> <span className="pill pill-cielo">Activo</span></>}
            </h2>
            <dl className="totals">
              <dt>Llave pública</dt><dd className="sku">{e.public_key || '—'}</dd>
            </dl>
            {e.problems.length > 0 && (
              <ul className="small">
                {e.problems.map((p) => <li key={p.name}><code>{p.name}</code> {PROBLEM[p.problem]}</li>)}
              </ul>
            )}
          </section>
        );
      })}

      <Modal open={!!target} onClose={() => setTarget(null)} title={target ? `Cambiar a ${ENVS[target].short}` : ''}>
        {target && (
          <div className="form">
            <p>{ENVS[target].hint}</p>
            {target === 'production'
              ? <p>Desde este momento los clientes pagarán con dinero real. Antes, confirma que hiciste un pago de prueba completo y que la URL de eventos está puesta en el modo producción de Wompi.</p>
              : <p>Mientras esté en prueba, <b>nadie podrá pagar de verdad</b> en la tienda. Úsalo solo para hacer pruebas.</p>}
            <Field id="pay-confirm" label={`Escribe ${confirmWord} para confirmar`}>
              <input id="pay-confirm" value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} autoComplete="off" />
            </Field>
            <FormNotice>{err}</FormNotice>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setTarget(null)}>Cancelar</button>
              <button type="button" className="btn btn-green" disabled={busy || typed !== confirmWord} onClick={apply}>
                {busy ? 'Cambiando…' : `Sí, cambiar a ${ENVS[target].short}`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
