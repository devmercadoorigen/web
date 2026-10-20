import { useLayoutEffect, useRef } from 'react';
import { productById } from '../data/catalog.js';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../lib/format.js';
import { gsap, magnet, reduced, unmagnet } from '../lib/motion.js';
import { Icon, ProductArt } from './ui.jsx';

const FLOATING = ['susana', 'miel', 'achiras'];
const TITLE = ['Del', 'Nevado', 'a', 'la', 'Tatacoa,'];
const ACCENT = ['un', 'solo', 'origen.'];

export function Hero() {
  const { add } = useCart();
  const root = useRef(null);

  useLayoutEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.from('.hero-bg img', { scale: 1.25, duration: 2.4, ease: 'power2.out' }, 0)
        .from('.hero-word > span', { yPercent: 110, rotate: 4, duration: 1.1, stagger: 0.06 }, 0.25)
        .from('.hero-pill', { y: 20, opacity: 0, duration: 0.8 }, 0.2)
        .from('.hero-lead, .hero-ctas, .hero-trust', { y: 30, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.8)
        .from('.float-card', { y: 120, opacity: 0, rotate: (i) => [-14, 10, -6][i], duration: 1.3, stagger: 0.14, ease: 'back.out(1.4)' }, 0.6)
        .from('.hero-stats > div', { y: 40, opacity: 0, duration: 0.8, stagger: 0.08 }, 1.1);

      // Parallax al hacer scroll
      gsap.to('.hero-bg img', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-cards', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-copy', { yPercent: 10, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: root.current, start: '30% top', end: 'bottom top', scrub: true } });

      // Las tarjetas flotan y siguen el cursor
      gsap.utils.toArray('.float-card').forEach((c, i) => gsap.to(c, { y: '+=14', duration: 2.6 + i * 0.4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.8 }));
      const move = (e) => {
        const x = e.clientX / innerWidth - 0.5;
        const y = e.clientY / innerHeight - 0.5;
        gsap.to('.hero-cards', { x: x * 30, rotateY: x * 8, rotateX: -y * 6, duration: 1.2, ease: 'power3.out' });
        gsap.to('.hero-bg', { x: x * -16, y: y * -10, duration: 1.6, ease: 'power3.out' });
      };
      root.current.addEventListener('mousemove', move);
      return () => root.current?.removeEventListener('mousemove', move);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" id="inicio" ref={root}>
      <div className="hero-frame">
        <div className="hero-bg"><img src="/img/tatacoa.jpg" alt="" width="1920" height="1280" /></div>
        <div className="hero-shade" />

        <div className="hero-grid wrap">
          <div className="hero-copy">
            <span className="hero-pill"><i />Vitrina digital del Huila · 37 municipios</span>
            <h1 aria-label="Del Nevado a la Tatacoa, un solo origen.">
              {TITLE.map((w, i) => <span className="hero-word" key={i}><span>{w}</span></span>)}
              {ACCENT.map((w, i) => <span className="hero-word accent" key={`a${i}`}><span>{w}</span></span>)}
            </h1>
            <p className="hero-lead">
              Café, cacao, miel y artesanías de los productores del Huila. Juntas varios municipios en un solo carrito, pagas una vez y lo recibes todo en un mismo envío.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-ocre btn-lg" href="#tienda" onMouseMove={magnet} onMouseLeave={unmagnet}>
                Comprar productos del Huila <Icon name="arrow" size={18} stroke={2.4} />
              </a>
              <a className="btn btn-glass btn-lg" href="#territorio">Recorrer el territorio</a>
            </div>
            <div className="hero-trust">
              <span><Icon name="lock" size={16} />Pago seguro PSE, Nequi o tarjeta</span>
              <span><Icon name="award" size={16} />Productos ganadores de FICCA</span>
            </div>
          </div>

          <div className="hero-cards" aria-label="Productos destacados">
            {FLOATING.map((id, i) => {
              const p = productById(id);
              return (
                <article key={id} className={`float-card fc-${i}`}>
                  <div className="fc-art"><ProductArt {...p} alt={p.name} /></div>
                  <div className="fc-info">
                    {p.badge && <span className="fc-badge">{p.badge}</span>}
                    <b>{p.maker}</b>
                    <span>{p.town} · {money(p.price)}</span>
                  </div>
                  <button type="button" className="fc-add" aria-label={`Añadir ${p.name}`} onClick={() => add(p.id)}>+</button>
                </article>
              );
            })}
          </div>
        </div>

        <div className="hero-stats wrap">
          <div><b data-count="37">37</b><span>municipios</span></div>
          <div><b data-count="17">17</b><span>embajadores</span></div>
          <div><b data-count="4">4</b><span>subregiones</span></div>
          <div><b>1</b><span>solo envío a tu casa</span></div>
        </div>
      </div>
    </section>
  );
}

// Doble cinta cruzada con lo que se produce en el Huila.
export function Marquee() {
  const words = ['Café de especialidad', 'Cacao de origen', 'Miel de abejas', 'Achiras', 'Artesanías', 'Chocolate de mesa', 'Cerveza artesanal', 'Té natural'];
  const towns = ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Palermo', 'Altamira', 'San Agustín', 'Íquira', 'Rivera', 'Villavieja', 'Gigante', 'Timaná'];
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
