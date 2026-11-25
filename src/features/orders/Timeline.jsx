import { dateTime, ORDER_STEPS } from '../../lib/format.js';
import { Icon } from '../../components/ui.jsx';

const STEP_LABEL = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pagado',
  preparando: 'Preparando',
  consolidado: 'Consolidado en el Huila',
  enviado: 'Enviado',
  entregado: 'Entregado',
};

/** Línea de tiempo del pedido: cada paso con su fecha y nota si ya ocurrió. */
export function Timeline({ status, history }) {
  const reached = new Map(history.map((h) => [h.status, h]));
  const current = ORDER_STEPS.indexOf(status);
  return (
    <ol className="timeline">
      {ORDER_STEPS.map((step, i) => {
        const h = reached.get(step);
        const state = i < current || (i === current && step === 'entregado') ? 'done' : i === current ? 'now' : 'next';
        return (
          <li key={step} className={`tl-${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="tl-dot">{state === 'done' && <Icon name="check" size={14} stroke={3} />}</span>
            <div>
              <b>{STEP_LABEL[step]}</b>
              {h && <span>{dateTime(h.created_at)}</span>}
              {h?.note && <em>{h.note}</em>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
