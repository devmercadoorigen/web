import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase.js';
import { track } from '../recommendations/track.js';
import { friendlyError } from '../../lib/errors.js';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';

const INTENT_KEY = 'mo-intent';

export const savePendingIntent = (intent) => {
  try { sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent)); } catch {}
};
const takePendingIntent = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(INTENT_KEY) || 'null');
    sessionStorage.removeItem(INTENT_KEY);
    return v;
  } catch {
    return null;
  }
};

/** Lista de deseos del usuario con actualización optimista. */
export function useWishlist() {
  const { user } = useAuth();
  const { notify } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const key = ['wishlist', user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('wishlists').select('product_id, price_at_add, created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const ids = useMemo(() => new Set((query.data || []).map((r) => r.product_id)), [query.data]);

  const mutation = useMutation({
    mutationFn: async ({ productId, on }) => {
      const { error } = on
        ? await supabase.from('wishlists').insert({ user_id: user.id, product_id: productId })
        : await supabase.from('wishlists').delete().eq('product_id', productId);
      if (error && error.code !== '23505') throw error;   // ya estaba: no es error
    },
    onMutate: async ({ productId, on }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (rows = []) =>
        on ? [{ product_id: productId, price_at_add: null, created_at: new Date().toISOString() }, ...rows] : rows.filter((r) => r.product_id !== productId)
      );
      return { prev };
    },
    onError: (err, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      notify(friendlyError(err), 'error');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const toggle = useCallback(
    (productId) => {
      if (!user) {
        // Invitado: guardamos la intención y la cumplimos al volver del login.
        savePendingIntent({ type: 'wishlist', productId });
        notify('Inicia sesión para guardar tus favoritos');
        navigate(`/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
        return;
      }
      const on = !ids.has(productId);
      mutation.mutate({ productId, on });
      if (on) {
        notify('Guardado en tu lista de deseos');
        track('wishlist', productId);
      }
    },
    [user, ids, mutation, notify, navigate, location]
  );

  return { items: query.data || [], isLoading: query.isLoading, has: (id) => ids.has(id), toggle };
}

/** Cumple la intención guardada (p. ej. el corazón tocado antes de iniciar sesión). */
export function usePendingIntent() {
  const { user } = useAuth();
  const { notify } = useToast();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const intent = takePendingIntent();
    if (intent?.type !== 'wishlist' || !intent.productId) return;
    supabase
      .from('wishlists')
      .insert({ user_id: user.id, product_id: intent.productId })
      .then(({ error }) => {
        if (error && error.code !== '23505') return notify(friendlyError(error), 'error');
        qc.invalidateQueries({ queryKey: ['wishlist', user.id] });
        notify('Listo: lo guardamos en tu lista de deseos');
      });
  }, [user, notify, qc]);
}
