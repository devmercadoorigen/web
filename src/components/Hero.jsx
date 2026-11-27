import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useCart } from '../features/cart/CartProvider.jsx';
import { useCatalog } from '../features/catalog/CatalogProvider.jsx';
import { useSite } from '../features/site/SiteProvider.jsx';
import { useRecommendations } from '../features/recommendations/useRecommendations.js';
import { money } from '../lib/format.js';
import { gsap, magnet, reduced, unmagnet } from '../lib/motion.js';
import { Icon, ProductArt } from './ui.jsx';
import { Img } from './Img.jsx';
import { XMAS } from '../features/xmas/Christmas.jsx';
import { removeBoot } from '../lib/boot.js';

// Textos por defecto; el admin los edita en Contenido > Textos.
const DEFAULT = {
  pill: 'Vitrina digital del Huila · 37 municipios',
  title: 'Del Nevado a la Tatacoa,',
  accent: 'un solo origen.',
  lead: 'Café, cacao, miel y artesanías de los productores del Huila. Juntas varios municipios en un solo carrito, pagas una vez y lo recibes todo en un mismo envío.',
};
const splitWords = (s) => String(s).trim().split(/\s+/).filter(Boolean);
const AUTOPLAY_MS = 7000;

// Las razones del recomendador son frases largas; en las tarjetas del hero va una etiqueta corta.
function shortReason(r = '') {
  const m = /^Porque te gusta:\s*(.+)$/i.exec(r);
  if (m) { const c = m[1].split(/\s+y\s+/)[0]; return c.charAt(0).toUpperCase() + c.slice(1); }
  return 'Para ti';
}

/**
 * "Para ti": recomendaciones del visitante en grupos de 3 tarjetas flotantes.
 * Un invitado nuevo (sin señales) ve los destacados, como antes.
 */
function useForYou(featured) {
  const recs = useRecommendations({}, { limit: 9 });
  const personal = recs.personalized && recs.items.length >= 3;
  const pool = useMemo(() => {
    const base = personal ? recs.items : featured;
    // Si hay pocos destacados se completa con el arranque en frío (FICCA, más vendidos, nuevos).
    const seen = new Set(base.map((p) => p.id));
    const fill = personal ? [] : recs.items.filter((p) => !seen.has(p.id));
    return [...base, ...fill].slice(0, 9);
  }, [personal, recs.items, featured]);
  const pages = [];
  for (let i = 0; i + 3 <= pool.length; i += 3) pages.push(pool.slice(i, i + 3));
  if (!pages.length && pool.length) pages.push(pool);
  return { personal, pool, pages };
}

function CardAction({ p, className, onAdd }) {
  return p.hasVariants ? (
    <Link to={`/producto/${p.slug}`} className={className} aria-label={`Elegir presentación de ${p.name}`}><Icon name="arrow" size={18} stroke={2.6} /></Link>
  ) : (
    <button type="button" className={className} aria-label={`Añadir ${p.name}`} onClick={() => onAdd(p.cartKey)}>+</button>
  );
}

/**
 * loading: mientras llegan los datos solo se pinta la foto. Es el mismo nodo <img>
 * que queda después, así la foto (el elemento más grande) se ve desde el primer render.
 */
export function Hero({ loading = false }) {
  const { add } = useCart();
  const { featured } = useCatalog();
  const { settings, counts } = useSite();
  const hero = { ...DEFAULT, ...(settings.hero || {}) };
  const TITLE = splitWords(hero.title);
  const ACCENT = splitWords(hero.accent);
  const root = useRef(null);
  const bgImg = useRef(null);
  // Si la foto ya estaba en caché, onLoad pudo dispararse antes: se retira igual.
  useEffect(() => { if (bgImg.current?.complete) removeBoot(); }, []);
  const { personal, pool, pages } = useForYou(featured);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = pages[Math.min(page, pages.length - 1)] || [];

  useEffect(() => { setPage(0); }, [pages.length, personal]);
  useEffect(() => {
    if (pages.length < 2 || paused || reduced()) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') setPage((n) => (n + 1) % pages.length); }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [pages.length, paused]);

  useLayoutEffect(() => {
    if (loading || reduced()) return;
    const ctx = gsap.context(() => {
      // La máscara de cada palabra solo existe durante la entrada: después recortaría
      // las colas (g, coma) y la inclinación de la cursiva.
      const title = root.current?.querySelector('h1');
      title?.classList.add('is-revealing');
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.from('.hero-bg img', { scale: 1.25, duration: 2.4, ease: 'power2.out' }, 0)
        .from('.hero-word > span', { yPercent: 110, rotate: 4, duration: 1.1, stagger: 0.06, onComplete: () => title?.classList.remove('is-revealing') }, 0.25)
        .from('.hero-pill', { y: 20, opacity: 0, duration: 0.8 }, 0.2)
        .from('.hero-lead, .hero-ctas, .hero-trust', { y: 30, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.8)
        .from('.float-card', { y: 120, opacity: 0, rotate: (i) => [-14, 10, -6][i], duration: 1.3, stagger: 0.14, ease: 'back.out(1.4)' }, 0.6)
        .from('.hero-stats > div', { y: 40, opacity: 0, duration: 0.8, stagger: 0.08 }, 1.1);

      // Parallax al hacer scroll
      gsap.to('.hero-bg img', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-cards', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-copy', { yPercent: 10, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: root.current, start: '30% top', end: 'bottom top', scrub: true } });

      // Las tarjetas flotan y siguen el cursor
      const floats = gsap.utils.toArray('.float-card').map((c, i) => gsap.to(c, { y: '+=14', duration: 2.6 + i * 0.4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.8 }));
      // Con el cursor encima las tarjetas se quedan quietas: si se mueven bajo el
      // puntero, el hover del botón se activa y desactiva (parpadeo) y el clic falla.
      const cards = root.current.querySelector('.hero-cards');
      let over = false;
      const enter = () => { over = true; floats.forEach((t) => t.pause()); };
      const leave = () => { over = false; floats.forEach((t) => t.resume()); };
      cards?.addEventListener('pointerenter', enter);
      cards?.addEventListener('pointerleave', leave);
      const move = (e) => {
        if (over) return;
        const x = e.clientX / innerWidth - 0.5;
        const y = e.clientY / innerHeight - 0.5;
        gsap.to('.hero-cards', { x: x * 30, rotateY: x * 8, rotateX: -y * 6, duration: 1.2, ease: 'power3.out' });
        gsap.to('.hero-bg', { x: x * -16, y: y * -10, duration: 1.6, ease: 'power3.out' });
      };
      root.current.addEventListener('mousemove', move);
      return () => {
        root.current?.removeEventListener('mousemove', move);
        cards?.removeEventListener('pointerenter', enter);
        cards?.removeEventListener('pointerleave', leave);
      };
    }, root);
    return () => { ctx.revert(); root.current?.querySelector('h1')?.classList.remove('is-revealing'); };
  }, [loading]);

  return (
    <section className="hero" id="inicio" ref={root} aria-busy={loading || undefined}>
      <div className={`hero-frame${loading ? ' hero-skeleton' : ''}`}>
        <div className="hero-bg"><Img src="/img/tatacoa.jpg" sizes="100vw" alt="" fetchpriority="high" ref={bgImg} onLoad={removeBoot} /></div>
        <div className="hero-shade" />
        {loading && <span className="sr-only">Cargando la tienda…</span>}
        {!loading && (<>

        <div className="hero-grid wrap">
          <div className="hero-copy">
            <span className="hero-pill"><i />{hero.pill}</span>
            {XMAS && <span className="xm-tag"><Icon name="gift" size={16} stroke={2.4} />Navidad con sabor a Huila</span>}
            <h1 aria-label={`${hero.title} ${hero.accent}`}>
              {TITLE.map((w, i) => <span className="hero-word" key={i}><span>{w}</span></span>)}
              {ACCENT.map((w, i) => <span className="hero-word accent" key={`a${i}`}><span>{w}</span></span>)}
            </h1>
            <p className="hero-lead">{hero.lead}</p>
            <div className="hero-ctas">
              <a className="btn btn-ocre btn-lg" href="#tienda" onMouseMove={magnet} onMouseLeave={unmagnet}>
                Comprar productos del Huila <Icon name="arrow" size={18} stroke={2.4} />
              </a>
              <a className="btn btn-glass btn-lg" href="#territorio">Recorrer el territorio</a>
            </div>
            {pool.length > 0 && (
              <div className="fy-strip" aria-label={personal ? 'Para ti' : 'Destacados'}>
                <span className="fy-title">{personal ? 'Para ti' : 'Destacados'}</span>
                <ul>
                  {pool.map((p) => (
                    <li key={p.id} className="fy-card">
                      <Link to={`/producto/${p.slug}`} className="fc-art" tabIndex={-1} aria-hidden="true"><ProductArt {...p} alt="" /></Link>
                      <div className="fc-info">
                        <span className="fc-badge">{personal ? shortReason(p.reason) : p.badge || p.zoneName}</span>
                        <Link to={`/producto/${p.slug}`}><b>{p.name}</b></Link>
                        <span>{p.maker} · {money(p.price)}</span>
                      </div>
                      <CardAction p={p} className="fc-add" onAdd={add} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="hero-trust">
              <span><Icon name="lock" size={16} />Pago seguro PSE, Nequi o tarjeta</span>
              <span><Icon name="award" size={16} />Productos ganadores de FICCA</span>
            </div>
          </div>

          <div
            className="hero-cards"
            role="region"
            aria-label={personal ? 'Para ti: productos recomendados' : 'Productos destacados'}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            {[0, 1, 2].map((i) => {
              const p = current[i];
              if (!p) return null;
              // La tarjeta (y su animación flotante) se conserva; solo cambia el contenido.
              const k = `${page}-${p.id}`;
              const tag = personal ? shortReason(p.reason) : p.badge;
              return (
                <article key={i} className={`float-card fc-${i}`}>
                  <Link key={`a${k}`} to={`/producto/${p.slug}`} className="fc-art fc-swap" tabIndex={-1} aria-hidden="true"><ProductArt {...p} alt="" /></Link>
                  <div key={`i${k}`} className="fc-info fc-swap">
                    {tag && <span className="fc-badge">{tag}</span>}
                    <Link to={`/producto/${p.slug}`} className="fc-link"><b>{p.maker}</b></Link>
                    <span className="fc-meta"><span className="fc-town">{p.town}</span> · <span className="fc-price">{money(p.price)}</span></span>
                  </div>
                  <CardAction p={p} className="fc-add" onAdd={add} />
                </article>
              );
            })}
          </div>
        </div>

        <div className="hero-stats wrap">
          <div><b data-count={counts.municipalities}>{counts.municipalities}</b><span>municipios</span></div>
          <div><b data-count={counts.ambassadors}>{counts.ambassadors}</b><span>embajadores</span></div>
          <div><b data-count={counts.zones}>{counts.zones}</b><span>subregiones</span></div>
          <div><b>1</b><span>solo envío a tu casa</span></div>
        </div>
        </>)}
      </div>
    </section>
  );
}

// Doble cinta cruzada con lo que se produce en el Huila.
export function Marquee() {
  const { settings } = useSite();
  const fallbackWords = ['Café de especialidad', 'Cacao de origen', 'Miel de abejas', 'Achiras', 'Artesanías', 'Chocolate de mesa', 'Cerveza artesanal', 'Té natural'];
  const fallbackTowns = ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Palermo', 'Altamira', 'San Agustín', 'Íquira', 'Rivera', 'Villavieja', 'Gigante', 'Timaná'];
  const mq = settings.marquee || {};
  const words = mq.words?.length ? mq.words : fallbackWords;
  const towns = mq.towns?.length ? mq.towns : fallbackTowns;
  const line = (items, cls) => (
    <div className={`mq ${cls}`} aria-hidden="true">
      <div className="mq-track">
        {[0, 1].map((k) => (
          <div className="mq-row" key={k}>
            {items.map((w) => <span key={w}>{w}<i>✦</i></span>)}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="marquee">
      {line(words, 'mq-green')}
      {line(towns, 'mq-ocre')}
    </div>
  );
}
