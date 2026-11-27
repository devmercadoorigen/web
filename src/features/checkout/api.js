import { supabase } from '../../lib/supabase.js';
import { getSessionId } from '../recommendations/track.js';

/**
 * Resumen calculado en el servidor (precios, kits, stock, cupón y envío).
 * Pasa por la Edge Function shipping-quote, que cotiza el envío con Hoko;
 * si la función no responde, cae a la RPC (envío con las tarifas propias).
 */
export async function quoteCheckout(payload) {
  const { data, error } = await supabase.functions.invoke('shipping-quote', { body: { action: 'quote', ...payload } });
  if (!error) return data;
  let message = null;
  try { message = (await error.context.json())?.error; } catch { /* sin cuerpo */ }
  if (message && error.context?.status === 422) throw new Error(message);
  const rpc = await supabase.rpc('checkout_quote', { p: payload });
  if (rpc.error) throw rpc.error;
  return rpc.data;
}

/** Ciudades de Hoko de un departamento (sugerencias del campo Ciudad). */
export async function cityOptions(department) {
  if (!department) return [];
  const { data, error } = await supabase.rpc('hoko_city_options', { p_department: department });
  if (error) return [];
  return data || [];
}

async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = 'No pudimos conectar con la pasarela de pago. Revisa tu conexión e inténtalo de nuevo.';
    let problems;
    try {
      const j = await error.context.json();
      if (j?.error) message = j.error;
      problems = j?.problems;
    } catch { /* respuesta sin cuerpo */ }
    const e = new Error(message);
    e.problems = problems;
    e.status = error.context?.status;
    throw e;
  }
  return data;
}

// session_id: id aleatorio del navegador, liga la compra a sus recomendaciones.
export const createOrder = (payload) => invoke('create-order', { action: 'create', ...payload, session_id: getSessionId() });
export const retryPayment = (order_number, access_token) => invoke('create-order', { action: 'retry', order_number, access_token });
export const paymentStatus = (body) => invoke('payment-status', body);

// Pedido en curso de este navegador: permite reintentar sin crear otro pedido.
const KEY = 'mo-pending-order';
export const readPending = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
};
export const savePending = (v) => {
  try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch {}
};
export const clearPending = () => {
  try { sessionStorage.removeItem(KEY); } catch {}
};

/** Huella del carrito: si cambia, el pedido pendiente ya no sirve y se crea otro. */
export const cartSignature = (items, coupon) =>
  JSON.stringify([...items].map((i) => `${i.variant_id || i.product_id || i.kit_id}:${i.quantity}`).sort()) + '|' + (coupon || '').toUpperCase();

export const PAYMENT_LABEL = {
  CARD: 'tarjeta', PSE: 'PSE', NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', BANCOLOMBIA_TRANSFER: 'Botón Bancolombia',
  BANCOLOMBIA_QR: 'QR Bancolombia', PCOL: 'Puntos Colombia',
};
