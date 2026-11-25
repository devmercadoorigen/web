import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './app/router.jsx';
import { ToastProvider, toast } from './components/Toast.jsx';
import { friendlyError } from './lib/errors.js';
import { AuthProvider } from './features/auth/AuthProvider.jsx';
import { CatalogProvider } from './features/catalog/CatalogProvider.jsx';
import { SiteProvider } from './features/site/SiteProvider.jsx';
import { CartProvider } from './features/cart/CartProvider.jsx';
import './styles.css';
import './app.css';
import './checkout.css';
import './store.css';
import { removeBoot } from './lib/boot.js';

// Red de seguridad: el esqueleto del home nunca se queda más de 6 s.
setTimeout(removeBoot, 6000);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } },
  // Errores sin manejo propio: aviso amigable en español (los formularios muestran el suyo).
  mutationCache: new MutationCache({
    onError: (err, _vars, _ctx, mutation) => { if (!mutation.options.onError) toast(friendlyError(err), 'error'); },
  }),
  // Si falla una actualización en segundo plano, la página sigue con lo que ya tenía.
  queryCache: new QueryCache({
    onError: (err, query) => { if (query.state.data !== undefined) toast('No pudimos actualizar los datos. Revisa tu conexión.', 'error'); },
  }),
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <SiteProvider>
            <CatalogProvider>
              <CartProvider>
                <RouterProvider router={router} />
              </CartProvider>
            </CatalogProvider>
          </SiteProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
