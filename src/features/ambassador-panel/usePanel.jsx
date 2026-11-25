import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../auth/AuthProvider.jsx';

/** El embajador vinculado a la sesión, con municipio, insignias y su comisión. */
export function useMyAmbassador() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-ambassador', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ambassadors')
        .select(`*, municipality:municipalities (name, subregion:subregions (name)),
                 badges:ambassador_badges (label, type, year, sort_order),
                 private:ambassador_private (commission_rate)`)
        .eq('profile_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['amb-dashboard', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ambassador_dashboard');
      if (error) throw error;
      return data;
    },
  });
}

export const PRODUCT_STATUS = {
  borrador: { label: 'Borrador', tone: 'mute' },
  pendiente: { label: 'En revisión', tone: 'ocre' },
  aprobado: { label: 'Publicado', tone: 'verde' },
  rechazado: { label: 'Rechazado', tone: 'err' },
  inactivo: { label: 'Pausado', tone: 'mute' },
};

export const ProductStatus = ({ status }) => {
  const s = PRODUCT_STATUS[status] || { label: status, tone: 'mute' };
  return <span className={`pill pill-${s.tone}`}>{s.label}</span>;
};
