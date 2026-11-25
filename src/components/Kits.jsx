import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useCatalog } from '../features/catalog/CatalogProvider.jsx';
import { money } from '../lib/format.js';
import { gsap, reduced } from '../lib/motion.js';
import { AddButton } from '../features/catalog/Catalog.jsx';
import { XMAS } from '../features/xmas/Christmas.jsx';
import { Icon, ProductArt } from './ui.jsx';

/** Tarjeta de kit: sus productos se abren en abanico al pasar el cursor. */
export function KitCard({ k }) {
  const { productById } = useCatalog();
  const items = k.items.map(productById).filter(Boolean);
  return (
    <article className={`kit${k.popular ? ' popular' : ''}`} data-anim="up">
      {k.popular && <span className="kit-ribbon">{k.badge}</span>}
      <Link to={`/kit/${k.slug}`} className="kit-stage" style={{ background: k.bg }} aria-label={`Ver el kit ${k.name}`}>
        <span className="kit-name" style={{ color: k.fg }}>{k.name}</span>
        <div className="fan">
          {items.map((p, j) => <div key={p.id} className={`fan-item f${j}`}><ProductArt {...p} alt={p.name} /></div>)}
        </div>
      </Link>
      <div className="kit-body">
        <span className="kit-note"><Icon name="gift" size={16} />{k.note}</span>
        <ul>
          {items.map((p) => <li key={p.id}><span>{p.maker}</span><span>{money(p.price)}</span></li>)}
        </ul>
        <div className="kit-price">
          <div>
            <span className="was">{money(k.was)}</span>
            <span className="now">{money(k.price)}</span>
          </div>
          <span className="save">Ahorras {money(k.was - k.price)}</span>
        </div>
        {k.available ? (
          <AddButton id={k.cartKey} label="Añadir kit al carrito" className="add add-wide" />
        ) : (
          <span className="add add-wide add-off">Agotado por ahora</span>
        )}
      </div>
    </article>
  );
}

// Kits de varios embajadores elegidos para el inicio desde el admin.
export function Kits() {
  const { homeKits, kits } = useCatalog();
  return (
    <section className="kits" id="kits">
      <div className="kits-deco" aria-hidden="true"><span /><span /><span /></div>
      <div className="wrap">
        <div className="sec-head center">
          <span className="kicker" data-anim="up">{XMAS ? 'Regalos de Navidad' : 'Kits y regalos'}</span>
          <h2 data-anim="up">El Huila en una caja</h2>
          <p data-anim="up">Combinaciones de varios embajadores con empaque de regalo. Cuestan menos que por separado y son el detalle más fácil del año.</p>
        </div>
        <div className="kit-grid">
          {!homeKits.length && (
            <div className="empty">
              <Icon name="gift" size={40} stroke={1.6} />
              <b>Muy pronto, nuevos kits</b>
              <p>Estamos armando combinaciones de varios embajadores para regalar.</p>
            </div>
          )}
          {homeKits.map((k) => <KitCard key={k.id} k={k} />)}
        </div>
        {kits.length > homeKits.length && (
          <div className="shop-more center"><Link to="/kits" className="text-cta">Ver todos los kits <Icon name="arrow" size={18} stroke={2.4} /></Link></div>
        )}
      </div>
    </section>
  );
}

const STEPS = [
  ['bag', 'Elige de varios municipios', 'Mezcla chocolate de Altamira, miel de Pitalito y achiras de Neiva en el mismo carrito.'],
  ['card', 'Paga una sola vez', 'PSE, Nequi o tarjeta. Mercado Origen reparte el pago a cada embajador.'],
  ['box', 'Recibe una sola caja', 'Consolidamos tu pedido en el Huila y lo despachamos a cualquier ciudad de Colombia.'],
];

// Tres pasos unidos por una línea que se dibuja con el scroll.
export function Steps() {
  const root = useRef(null);
  useLayoutEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      const path = root.current.querySelector('.steps-line path');
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 75%', end: 'center 45%', scrub: 1 } });
      gsap.from('.step-ico', { scale: 0, rotate: -30, duration: 0.8, ease: 'back.out(2)', stagger: 0.2, scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="steps-sec" ref={root}>
      <div className="wrap">
        <div className="sec-head center">
          <span className="kicker" data-anim="up">Cómo funciona</span>
          <h2 data-anim="up">Un carrito, un pago, un envío</h2>
        </div>
        <div className="steps">
          <svg className="steps-line" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M80 60 C 260 -10, 340 130, 500 60 S 760 -10, 920 60" />
          </svg>
          {STEPS.map(([icon, t, d], i) => (
            <div className="step" key={t} data-anim="up">
              <div className="step-ico"><Icon name={icon} size={30} stroke={1.9} /><span>{i + 1}</span></div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
        <div className="proof" data-anim="up">
          <div><Icon name="award" size={26} stroke={1.8} /><span><b>Ganadores FICCA</b> 2022 y 2024</span></div>
          <div><Icon name="leaf" size={26} stroke={1.8} /><span><b>Emprendimientos</b> apoyados por el Fondo Emprender del SENA</span></div>
          <div className="gov-proof"><img src="/img/gobernacion-320.webp" alt="Gobernación del Huila" width="320" height="116" loading="lazy" /><span>Con el apoyo de la <b>Gobernación del Huila</b></span></div>
        </div>
      </div>
    </section>
  );
}
