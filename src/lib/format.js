export const money = (n) => '$' + Math.round(n).toLocaleString('es-CO');
export const rating = (n) => n.toFixed(1).replace('.', ',');

const TZ = 'America/Bogota';
/** 23 de noviembre de 2026 */
export const longDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }) : '');
/** 23 nov. 2026 · 3:15 p. m. */
export const dateTime = (d) =>
  d ? new Date(d).toLocaleString('es-CO', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
/** Fecha sin hora (columna date de Postgres): evita el corrimiento de zona horaria. */
export const plainDate = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-CO', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
};

/** Estados de pedido como se muestran al cliente. */
export const ORDER_STATUS = {
  pendiente_pago: { label: 'Pendiente de pago', tone: 'ocre' },
  pagado: { label: 'Pagado', tone: 'verde' },
  preparando: { label: 'Preparando', tone: 'verde' },
  consolidado: { label: 'Consolidado en el Huila', tone: 'verde' },
  enviado: { label: 'Enviado', tone: 'cielo' },
  entregado: { label: 'Entregado', tone: 'ok' },
  cancelado: { label: 'Cancelado', tone: 'mute' },
  reembolsado: { label: 'Reembolsado', tone: 'mute' },
};

export const ORDER_STEPS = ['pendiente_pago', 'pagado', 'preparando', 'consolidado', 'enviado', 'entregado'];

export const whatsappLink = (text) =>
  `https://wa.me/${import.meta.env.VITE_WHATSAPP || '573142398821'}?text=${encodeURIComponent(text)}`;
