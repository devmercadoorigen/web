import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Solo la URL y la llave pública (anon) viven en el frontend.
  console.error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Copia .env.example como .env.local.');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // enlaces de confirmación y recuperación
    // Una sesión por proyecto: así un token de la base local nunca se envía a la nube (y viceversa).
    storageKey: `mo-auth-${url ? new URL(url).host : 'none'}`,
  },
});
