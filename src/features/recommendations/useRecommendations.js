import { useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { toCardProduct, useCatalog } from '../catalog/CatalogProvider.jsx';
import { flush, getSessionId, onStrongSignal } from './track.js';

const STALE = 5 * 60_000;

/**
 * Recomendaciones de get_recommendations (cacheadas 5 min con React Query).
 * context: { product_id, exclude: [uuid], target: pesos para el envío gratis }
 * Devuelve { items (tarjetas con .reason), kits (del catálogo, con .reason), personalized }.
 */
export function useRecommendations(context = {}, { limit = 12, enabled = true } = {}) {
  const { user, ready } = useAuth();
  const { kitById } = useCatalog();
  const sid = getSessionId();
  const ctx = {
    product_id: context.product_id || undefined,
    exclude: context.exclude?.length ? [...context.exclude].sort() : undefined,
    // El faltante se agrupa en tramos de $5.000 para no consultar en cada clic.
    target: context.target > 0 ? Math.ceil(context.target / 5000) * 5000 : undefined,
  };
  const q = useQuery({
    queryKey: ['recs', user?.id ?? 'anon', ctx, limit],
    enabled: enabled && ready,
    staleTime: STALE,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recommendations', {
        p_user_id: user?.id ?? null, p_session_id: sid, p_limit: limit, p_context: ctx,
      });
      if (error) throw error;
      return data;
    },
  });
  const d = q.data;
  const items = useMemo(() => (d?.items || []).map((x) => ({ ...toCardProduct(x), reason: x.reason })), [d]);
  const kits = useMemo(() => (d?.kits || []).map((k) => kitById(k.id) && { ...kitById(k.id), reason: k.reason }).filter(Boolean), [d, kitById]);
  return { isLoading: q.isLoading, personalized: !!d?.personalized, items, kits };
}

/**
 * Montado una vez en el layout: al iniciar sesión une los eventos del invitado
 * a la cuenta y refresca las recomendaciones tras señales fuertes.
 */
export function RecommendationsSync() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const merged = useRef(null);

  useEffect(() => onStrongSignal(() => qc.invalidateQueries({ queryKey: ['recs'] })), [qc]);
  useEffect(() => {
    if (!user || merged.current === user.id) return;
    merged.current = user.id;
    flush();
    supabase.rpc('merge_session_events', { p_session_id: getSessionId() })
      .then(() => qc.invalidateQueries({ queryKey: ['recs'] }));
  }, [user, qc]);
  return null;
}
