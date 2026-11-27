import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Protección: solo las variables VITE_ llegan al navegador. Si alguna de ellas
// contiene algo con forma de secreto (llaves privadas de Wompi, service_role,
// secretos de Google/Resend), el build y el servidor de desarrollo se detienen.
const SECRET_SHAPES = [
  /^prv_(test|prod)_/, /^(test|prod)_(integrity|events)_/, /^sb_secret_/, /^GOCSPX-/, /^sbp_/, /^re_[A-Za-z0-9]{8,}/,
  /"role"\s*:\s*"service_role"/,
];
function guardPublicEnv(mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const leaks = Object.entries(env).filter(([k, v]) => {
    if (SECRET_SHAPES.some((re) => re.test(v))) return true;
    if (/PRIVATE|SECRET|SERVICE_ROLE|PASSWORD/i.test(k)) return true;
    // JWT de service_role (llaves "legacy" eyJ...)
    if (/^eyJ/.test(v)) {
      try { return JSON.parse(Buffer.from(v.split('.')[1], 'base64url').toString()).role === 'service_role'; } catch { return false; }
    }
    return false;
  });
  if (leaks.length) {
    throw new Error(`Secretos con prefijo VITE_ (llegarían al navegador): ${leaks.map(([k]) => k).join(', ')}. Quítales el prefijo VITE_.`);
  }
}

// Librerías en archivos aparte: cambian poco, así el navegador las guarda entre
// despliegues y solo vuelve a bajar el código de la tienda.
const VENDORS = {
  react: ['react', 'react-dom', 'react-router', 'scheduler'],
  supabase: ['@supabase'],
  query: ['@tanstack'],
  motion: ['gsap', 'lenis'],
};

export default defineConfig(({ mode }) => {
  guardPublicEnv(mode);
  return config;
});

const config = {
  plugins: [react()],
  server: { port: 5173, open: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replace(/\\/g, '/');
          if (!path.includes('/node_modules/')) return undefined;
          for (const [name, pkgs] of Object.entries(VENDORS)) {
            if (pkgs.some((p) => path.includes(`/node_modules/${p}/`))) return `vendor-${name}`;
          }
          return undefined;
        },
      },
    },
  },
};
