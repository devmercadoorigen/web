import { ORDER_STATUS } from '../../lib/format.js';

export function StatusPill({ status }) {
  const s = ORDER_STATUS[status] || { label: status, tone: 'mute' };
  return <span className={`pill pill-${s.tone}`}>{s.label}</span>;
}
