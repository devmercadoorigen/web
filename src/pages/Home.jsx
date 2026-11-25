import { useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router';
import { Hero, Marquee } from '../components/Hero.jsx';
import { Catalog, Categories } from '../features/catalog/Catalog.jsx';
import { Territory } from '../features/territory/Territory.jsx';
import { Kits, Steps } from '../components/Kits.jsx';
import { Ambassadors, Culture } from '../components/Story.jsx';
import { Faq, Newsletter } from '../components/Conversion.jsx';
import { Icon } from '../components/ui.jsx';
import { useCatalog } from '../features/catalog/CatalogProvider.jsx';
import { useSite } from '../features/site/SiteProvider.jsx';
import { scrollToTarget, useGlobalAnimations } from '../lib/motion.js';
import { removeBoot } from '../lib/boot.js';
import { XmasBanner } from '../features/xmas/Christmas.jsx';

// Si se llega desde otra ruta con /#seccion, espera a que el home pinte y hace el scroll.
// Solo anclas simples (#tienda): los enlaces de Supabase traen #access_token=… que no es una sección.
function useScrollToHash(ready) {
  const { hash, key } = useLocation();
  useEffect(() => {
    if (!ready || !/^#[A-Za-z][\w-]*$/.test(hash)) return;
    const t = setTimeout(() => scrollToTarget(hash), 80);
    return () => clearTimeout(t);
  }, [hash, key, ready]);
}

function HomeSections({ ready }) {
  const { filter, setFilter } = useOutletContext();
  useGlobalAnimations([ready]);
  useScrollToHash(ready);

  return (
    <>
      <Hero loading={!ready} />
      {ready && <Sections filter={filter} setFilter={setFilter} />}
    </>
  );
}

function Sections({ filter, setFilter }) {
  return (
    <>
      <Marquee />
      <XmasBanner />
      <Categories />
      <Catalog filter={filter} setFilter={setFilter} />
      <Territory />
      <Kits />
      <Steps />
      <Ambassadors />
      <Culture />
      <Faq />
      <Newsletter />
    </>
  );
}

// Las animaciones de entrada (GSAP) necesitan las tarjetas en el DOM al montar,
// así que las secciones se pintan cuando el catálogo ya llegó. La foto del hero
// se muestra desde el primer momento.
export default function Home() {
  const catalog = useCatalog();
  const site = useSite();
  const ready = catalog.ready && site.ready;
  const error = catalog.error || site.error;
  const retry = () => { catalog.retry(); site.retry(); };
  if (error) {
    removeBoot();
    return (
      <section className="page-state">
        <div className="wrap">
          <div className="empty">
            <Icon name="leaf" size={40} stroke={1.6} />
            <b>No pudimos cargar la tienda</b>
            <p>Revisa tu conexión a internet e inténtalo de nuevo.</p>
            <button type="button" className="btn btn-green" onClick={() => retry()}>Reintentar</button>
          </div>
        </div>
      </section>
    );
  }
  return <HomeSections ready={ready} />;
}
