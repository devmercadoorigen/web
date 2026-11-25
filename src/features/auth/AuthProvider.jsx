import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';

const AuthContext = createContext(null);

const origin = () => window.location.origin;

/**
 * Sesión de Supabase + perfil (rol). El rol real lo hace cumplir la RLS en la
 * base; aquí solo decide qué se muestra.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, avatar_url, role, marketing_opt_in, is_active, data_policy_accepted_at')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  /** Registro con consentimiento de datos (Ley 1581): el trigger guarda la fecha. */
  const signUp = useCallback(async ({ email, password, fullName, phone, marketing }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${origin()}/cuenta?bienvenida=1`,
        data: { full_name: fullName.trim(), phone: phone?.trim() || null, marketing_opt_in: !!marketing, data_policy_accepted: true },
      },
    });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }, []);

  const resendConfirmation = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${origin()}/cuenta?bienvenida=1` } });
    if (error) throw error;
  }, []);

  const sendReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin()}/recuperar/nueva` });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async (next = '/cuenta') => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin()}${next}` } });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['profile'] });
    queryClient.removeQueries({ queryKey: ['wishlist'] });
    queryClient.removeQueries({ queryKey: ['orders'] });
    queryClient.removeQueries({ queryKey: ['addresses'] });
  }, [queryClient]);

  const profile = profileQuery.data ?? null;
  const value = useMemo(
    () => ({
      ready,
      session,
      user,
      profile,
      profileLoading: !!user && profileQuery.isLoading,
      role: profile?.role ?? (user ? 'cliente' : null),
      signIn,
      signUp,
      resendConfirmation,
      sendReset,
      updatePassword,
      signInWithGoogle,
      signOut,
      refreshProfile: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
    }),
    [ready, session, user, profile, profileQuery.isLoading, signIn, signUp, resendConfirmation, sendReset, updatePassword, signInWithGoogle, signOut, queryClient]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Nombre corto para saludos: "María" de "María Victoria Alarcón". */
export const firstName = (profile, user) =>
  (profile?.full_name || user?.user_metadata?.full_name || user?.email || '').split(/[\s@]/)[0];
