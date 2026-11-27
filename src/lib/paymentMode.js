import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase.js';

// Modo de pagos activo ('sandbox' | 'production'). El admin y el panel del embajador
// muestran solo los pedidos, pagos y liquidaciones de este modo.
export const PAYMENT_MODE_KEY = ['payments-mode'];

const paymentModeQuery = {
  queryKey: PAYMENT_MODE_KEY,
  staleTime: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'payments').maybeSingle();
    if (error) throw error;
    return data?.value?.wompi_mode === 'production' ? 'production' : 'sandbox';
  },
};

export const usePaymentMode = () => useQuery({ ...paymentModeQuery, refetchInterval: 60_000 }).data;

/** Para usar dentro de un queryFn: espera el modo antes de filtrar (nunca mezcla ambientes). */
export const getPaymentMode = (qc) => qc.ensureQueryData(paymentModeQuery);
