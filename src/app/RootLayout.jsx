import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Announce, Header } from '../components/Header.jsx';
import { Footer } from '../components/Footer.jsx';
import { CartDrawer, MobileBar } from '../components/CartDrawer.jsx';
import { Toast } from '../components/Toast.jsx';
import { RecommendationsSync } from '../features/recommendations/useRecommendations.js';
import { usePendingIntent } from '../features/wishlist/useWishlist.js';
import { getLenis, useSmoothScroll } from '../lib/motion.js';
import { removeBoot } from '../lib/boot.js';
import { ChristmasLayer } from '../features/xmas/Christmas.jsx';

// Al cambiar de ruta (sin #ancla) la página empieza arriba, como una navegación normal.
function useScrollReset() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
}

export default function RootLayout() {
  // Filtro de "Lo más pedido" del home (zona o categoría); vive aquí para sobrevivir a la navegación.
  const [filter, setFilter] = useState({ zone: 'todas', cat: null });
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  useSmoothScroll();
  useScrollReset();
  usePendingIntent();
  // Si se navega fuera del home antes de que cargue, el esqueleto sobra.
  useEffect(() => { if (!isHome) removeBoot(); }, [isHome]);

  return (
    <>
      <a className="skip" href={isHome ? '#tienda' : '#contenido'}>{isHome ? 'Ir a la tienda' : 'Ir al contenido'}</a>
      <Announce />
      <Header />
      <main id="contenido">
        <Outlet context={{ filter, setFilter }} />
      </main>
      <Footer />
      <CartDrawer />
      <MobileBar />
      <Toast />
      <RecommendationsSync />
      <ChristmasLayer />
    </>
  );
}
