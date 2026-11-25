import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Librerías en archivos aparte: cambian poco, así el navegador las guarda entre
// despliegues y solo vuelve a bajar el código de la tienda.
const VENDORS = {
  react: ['react', 'react-dom', 'react-router', 'scheduler'],
  supabase: ['@supabase'],
  query: ['@tanstack'],
  motion: ['gsap', 'lenis'],
};

export default defineConfig({
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
});
