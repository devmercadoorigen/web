import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../auth/AuthProvider.jsx';

/**
 * Ruleta de bienvenida. La elegibilidad y el premio los decide la base
 * (wheel_status / spin_welcome_wheel); aquí solo se consultan.
 */
export function useWheel() {
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const key = ['wheel', user?.id ?? 'anon'];

  const status = useQuery({
    queryKey: key,
    enabled: ready !== false,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('wheel_status');
      if (error) throw error;
      return data;
    },
  });

  const prizes = useQuery({
    queryKey: ['wheel-prizes'],
    enabled: !!status.data?.enabled,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('wheel_prizes')
        .select('slug, label, legend, terms, weight, color, sort_order')
        .eq('is_active', true).order('sort_order').order('slug');
      if (error) throw error;
      return data;
    },
  });

  const spin = useCallback(async () => {
    const { data, error } = await supabase.rpc('spin_welcome_wheel');
    if (error) throw error;
    return data;
  }, []);

  /** Guarda el premio en caché cuando termina la animación (y recalcula el checkout). */
  const commit = useCallback((won) => {
    qc.setQueryData(key, (s) => ({ ...(s || {}), eligible: false, spin: won }));
    qc.invalidateQueries({ queryKey: ['quote'] });
  }, [qc, key[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status: status.data, prizes: prizes.data || [], spin, commit, user };
}
