import { useState } from 'react';
import { Announce, Header } from './components/Header.jsx';
import { Hero, Marquee } from './components/Hero.jsx';
import { Catalog, Categories } from './components/Catalog.jsx';
import { Territory } from './components/Territory.jsx';
import { Kits, Steps } from './components/Kits.jsx';
import { Ambassadors, Culture } from './components/Story.jsx';
import { Faq, Newsletter } from './components/Conversion.jsx';
import { Footer } from './components/Footer.jsx';
import { CartDrawer, MobileBar, Toast } from './components/CartDrawer.jsx';
import { useGlobalAnimations, useSmoothScroll } from './lib/motion.js';

export default function App() {
  // El filtro del catálogo vive aquí porque lo controlan buscador, categorías, mapa y embajadores.
  const [filter, setFilter] = useState({ zone: 'todas', cat: null, query: '' });
  const shopZone = (zone) => setFilter({ zone, cat: null, query: '' });
  useSmoothScroll();
  useGlobalAnimations();

  return (
    <>
      <a className="skip" href="#tienda">Ir a la tienda</a>
      <Announce />
      <Header query={filter.query} onQuery={(query) => setFilter((f) => ({ ...f, query }))} />
      <main>
        <Hero />
        <Marquee />
        <Categories onPick={(cat) => setFilter({ zone: 'todas', cat, query: '' })} />
        <Catalog filter={filter} setFilter={setFilter} />
        <Territory onShopZone={shopZone} />
        <Kits />
        <Steps />
        <Ambassadors onShopZone={shopZone} />
        <Culture />
        <Faq />
        <Newsletter />
      </main>
      <Footer />
      <CartDrawer />
      <MobileBar />
      <Toast />
    </>
  );
}
