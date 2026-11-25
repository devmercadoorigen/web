import { useLayoutEffect, useRef, useState } from 'react';
import { useCart } from '../cart/CartProvider.jsx';
import { Link } from 'react-router';
import { useCatalog } from '../catalog/CatalogProvider.jsx';
import { useSite } from '../site/SiteProvider.jsx';
import { money } from '../../lib/format.js';
import { gsap, reduced, ScrollTrigger, scrollToTarget } from '../../lib/motion.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { Img } from '../../components/Img.jsx';

// Silueta del Huila trazada sobre el mapa de subregiones. Los bordes compartidos usan los mismos puntos.
const pts = (s) => 'M' + s.trim().split(/\s+/).join(' L') + 'Z';
export const PATHS = {
  norte: pts(`320,415 305,388 280,372 252,354 232,338 224,318 240,312 270,325 300,306 330,291 360,276 385,260 398,232 405,205 412,186
    445,180 470,170 490,160 512,166 538,158 562,158 556,182 566,210 586,211 610,200 626,186 642,165 662,128 690,90 716,62 740,42 752,22 772,24
    778,48 760,70 742,96 716,122 694,152 676,186 660,214 644,240 628,262 614,296 596,326 566,352 540,382 524,418 532,440 514,468 494,498 470,520
    445,530 432,492 410,471 385,462 366,450 356,432`),
  occidente: pts(`320,415 356,432 366,450 385,462 365,490 330,505 290,510 265,545 255,575 245,605 210,605 180,600 150,575 120,545 128,516
    165,505 205,481 240,470 265,480 286,484 291,460 302,438`),
  oriente: pts(`385,462 410,471 432,492 445,530 440,548 430,576 421,600 396,626 380,660 346,690 320,714 300,728 290,720 270,695 280,660
    290,632 270,620 245,605 255,575 265,545 290,510 330,505 365,490`),
  sur: pts(`120,545 150,575 180,600 210,605 245,605 270,620 290,632 280,660 270,695 290,720 300,728 282,745 256,752 230,766 205,790 166,792
    140,776 125,748 96,738 66,722 41,690 22,656 35,628 35,600 60,595 85,580 105,562`),
};
export const LABELS = { norte: [530, 300], occidente: [192, 552], oriente: [350, 562], sur: [150, 655] };
export const RIVER = 'M118 712 C160 700 190 690 222 668 C262 642 300 610 338 586 C380 560 410 528 432 486 C452 448 462 410 474 372 C486 336 500 300 520 266 C552 226 600 196 640 164 C680 132 720 90 762 34';

function HuilaMap({ zone, onPick }) {
  const { zones, zoneBySlug, municipalities, hasAmbassador } = useSite();
  const z = zoneBySlug[zone];
  // Un punto por municipio con embajadores y coordenadas en el mapa (se editan en el admin).
  const dots = municipalities.filter((m) => m.map_x != null && m.map_y != null && hasAmbassador(m.id));
  return (
    <div className="map-card">
      <div className="map-head">
        <span className="kicker">Mapa del Huila</span>
        <b>Zona {z?.name}</b>
        <span>{z?.landmark}</span>
      </div>
      <svg viewBox="10 10 785 795" role="group" aria-label="Mapa del Huila por subregiones">
        <defs>
          <filter id="zone-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#0B7A3B" floodOpacity=".28" />
          </filter>
        </defs>
        {zones.filter((k) => PATHS[k.slug]).map((k) => (
          <path
            key={k.slug}
            d={PATHS[k.slug]}
            className={`zone-path${k.slug === zone ? ' active' : ''}`}
            style={{ fill: k.fill_color }}
            filter={k.slug === zone ? 'url(#zone-glow)' : undefined}
            tabIndex={0}
            role="button"
            aria-label={`Ir a la Zona ${k.name}`}
            aria-pressed={k.slug === zone}
            onClick={() => onPick(k.slug)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(k.slug))}
          />
        ))}
        <path d={RIVER} className="river" />
        <path d={RIVER} className="river-flow" />
        {zones.filter((k) => LABELS[k.slug]).map((k) => (
          <text key={k.slug} x={LABELS[k.slug][0]} y={LABELS[k.slug][1]} textAnchor="middle" className={`zone-label${k.slug === zone ? ' on' : ''}`} style={{ fill: k.slug === zone ? k.label_color : '#2F3A33' }}>
            {k.name}
          </text>
        ))}
        {dots.map((m) => (
          <g key={m.id} className="dot">
            <circle cx={m.map_x} cy={m.map_y} r="16" className="dot-pulse" />
            <circle cx={m.map_x} cy={m.map_y} r="8" />
            <text x={m.map_x + (m.label_anchor === 'end' ? -15 : 15)} y={m.map_y + 6} textAnchor={m.label_anchor}>{m.name}</text>
          </g>
        ))}
      </svg>
      <div className="map-legend">
        {zones.map((k) => (
          <button key={k.slug} type="button" className={k.slug === zone ? 'on' : ''} onClick={() => onPick(k.slug)}>
            <i style={{ background: k.fill_color }} />{k.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chapter({ z }) {
  const { add } = useCart();
  const { products: all } = useCatalog();
  const { hasAmbassador } = useSite();
  const k = z.slug;
  const products = all.filter((p) => p.zone === k);
  const munis = z.municipalities;
  const empty = !munis.some((m) => hasAmbassador(m.id));

  return (
    <article className="chapter" id={`zona-${k}`} data-zone={k}>
      <div className="chapter-photo">
        {z.image_url && <Img src={z.image_url} sizes="(max-width: 960px) 100vw, 50vw" alt={z.landmark} loading="lazy" className="chapter-img" />}
        <span className="chapter-tag"><Icon name="mountain" size={16} />{z.landmark}</span>
      </div>
      <div className="chapter-body">
        <h3>Zona {z.name}</h3>
        <div className="facts">
          {(z.facts || []).map((f) => <span key={f}>{f}</span>)}
        </div>
        <p>{z.description}</p>
        <div className="munis">
          {munis.map((m) => <span key={m.id} className={hasAmbassador(m.id) ? 'has' : ''}>{m.name}</span>)}
        </div>
        {products.length ? (
          <>
            <div className="mini-row">
              {products.slice(0, 3).map((p) => (
                <div className="mini" key={p.id}>
                  <Link to={`/producto/${p.slug}`} className="mini-art" aria-label={p.name}><ProductArt {...p} alt={p.name} /></Link>
                  <div className="mini-info"><b>{p.maker}</b><span>{money(p.price)}</span></div>
                  {p.hasVariants
                    ? <Link to={`/producto/${p.slug}`} className="mini-add" aria-label={`Elegir presentación de ${p.name}`}>+</Link>
                    : <button type="button" onClick={() => add(p.cartKey)} aria-label={`Añadir ${p.name}`}>+</button>}
                </div>
              ))}
            </div>
            <Link to={`/zona/${k}`} className="btn btn-green">
              Ver {products.length === 1 ? 'el producto' : `los ${products.length} productos`} de esta zona <Icon name="arrow" size={18} stroke={2.4} />
            </Link>
          </>
        ) : (
          <div className="invite">
            <Icon name="leaf" size={28} stroke={1.8} />
            <div>
              <b>{empty ? 'Esta zona espera a sus primeros embajadores.' : 'Muy pronto, productos de esta zona.'}</b>
              <span>¿Produces café, tejidos o alimentos en {munis.slice(0, 2).map((m) => m.name).join(', ')} o {munis.at(-1)?.name}?</span>
            </div>
            <Link className="btn btn-outline" to="/quiero-ser-embajador">Quiero ser embajador</Link>
          </div>
        )}
      </div>
    </article>
  );
}

export function Territory() {
  const { zones, counts } = useSite();
  const [zone, setZone] = useState(zones[0]?.slug || 'norte');
  const root = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.chapter').forEach((el) => {
        ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setZone(el.dataset.zone) });
        if (reduced()) return;
        const img = el.querySelector('.chapter-img');
        if (img) gsap.fromTo(img, { yPercent: -8, scale: 1.15 }, { yPercent: 8, scale: 1.05, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        gsap.from(el.querySelectorAll('.chapter-body > *'), { y: 40, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 70%', once: true } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="territory" id="territorio" ref={root}>
      <div className="wrap">
        <div className="sec-head center">
          <span className="kicker" data-anim="up">Tesoros del territorio</span>
          <h2 data-anim="up">Recorre el Huila, del Nevado a la Tatacoa</h2>
          <p data-anim="up">Cuatro paisajes, {counts.municipalities} municipios y lo que cada uno pone sobre tu mesa. Baja para recorrer el mapa o toca una zona.</p>
        </div>
        <div className="terr-layout">
          <div className="terr-map">
            <HuilaMap zone={zone} onPick={(k) => scrollToTarget(`#zona-${k}`, -120)} />
          </div>
          <div className="terr-chapters">
            {zones.map((z) => <Chapter key={z.slug} z={z} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
