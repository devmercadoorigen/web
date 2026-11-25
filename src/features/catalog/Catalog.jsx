import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { productQuery } from '../store/productQuery.js';
import { useCart } from '../cart/CartProvider.jsx';
import { useCatalog } from './CatalogProvider.jsx';
import { useSite } from '../site/SiteProvider.jsx';
import { useWishlist } from '../wishlist/useWishlist.js';
import { money } from '../../lib/format.js';
import { gsap, reduced, tilt, untilt } from '../../lib/motion.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { Img } from '../../components/Img.jsx';

export function AddButton({ id, label = 'Añadir al carrito', className = 'add' }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`${className}${done ? ' done' : ''}`}
      onClick={() => {
        add(id);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      <Icon name={done ? 'check' : 'bag'} size={17} stroke={2.2} />
      {done ? 'Añadido' : label}
    </button>
  );
}

const countLabel = (n) => (n ? `${n} ${n === 1 ? 'producto' : 'productos'}` : 'Muy pronto');

// Mosaico de categorías: las de foto (grande, cuadradas, ancha) y las compactas con su producto.
// Cada una lleva a la tienda filtrada por esa categoría.
export function Categories() {
  const { products } = useCatalog();
  const { categories } = useSite();
  const countOf = (slug) => products.filter((p) => p.cat === slug).length;
  const tiles = categories.filter((c) => c.tile !== 'mini');
  // Las compactas sin productos (p. ej. Hogar) no se muestran hasta que tengan alguno.
  const minis = categories.filter((c) => c.tile === 'mini' && countOf(c.slug) > 0);
  return (
    <section className="cats" aria-labelledby="cats-title">
      <div className="wrap">
        <div className="sec-head split-head cats-head">
          <div>
            <span className="kicker" data-anim="up">Compra por antojo</span>
            <h2 id="cats-title" data-anim="up">Todo lo que se hace en el Huila, en un solo lugar</h2>
          </div>
          <div className="cats-aside" data-anim="up">
            <p>{tiles.length + minis.length} categorías de productos hechos en el departamento. Elige una y arma tu caja con productos de varios municipios.</p>
            <Link to="/tienda" className="text-cta">Ver todo el catálogo <Icon name="arrow" size={18} stroke={2.4} /></Link>
          </div>
        </div>

        <div className="bento">
          {tiles.map((t) => {
            const n = countOf(t.slug);
            return (
              <Link key={t.id} to={`/categoria/${t.slug}`} className={`bento-tile ${t.tile}`} data-anim="scale">
                {t.image_url && <Img src={t.image_url} sizes={t.tile === 'big' || t.tile === 'wide' ? '(max-width: 560px) 90vw, 45vw' : '(max-width: 560px) 45vw, 22vw'} alt="" loading="lazy" />}
                <span className="bento-shade" />
                <span className={`bento-count${n ? '' : ' soon'}`}>{countLabel(n)}</span>
                <span className="bento-copy">
                  <b>{t.name}</b>
                  <span>{t.tagline}</span>
                </span>
                <span className="bento-go"><Icon name="arrowUp" size={20} stroke={2.4} /></span>
              </Link>
            );
          })}
        </div>

        <div className="cat-strip" style={{ '--n': minis.length }}>
          {minis.map((c) => {
            const p = products.find((x) => x.cat === c.slug);
            const n = countOf(c.slug);
            return (
              <Link key={c.id} to={`/categoria/${c.slug}`} className="cat-mini" style={{ background: c.tint || 'var(--bg-2)' }} data-anim="up">
                <span className="cat-mini-copy">
                  <b>{c.name}</b>
                  <span>{c.tagline}</span>
                  <em>{countLabel(n)}</em>
                </span>
                <span className="cat-mini-art">
                  {p ? <ProductArt {...p} alt="" /> : <Icon name="leaf" size={34} stroke={1.8} />}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Tarjeta de producto. `notice` y `soldOut` los usa la lista de deseos. */
export function ProductCard({ p, notice = null, soldOut = false }) {
  const { has, toggle } = useWishlist();
  const qc = useQueryClient();
  // Precarga la página del producto apenas hay intención (mouse, foco o toque).
  const prefetch = () => qc.prefetchQuery(productQuery(p.slug));
  const fav = has(p.id);
  const out = soldOut || (p.stock <= 0 && !p.hasVariants);
  const href = `/producto/${p.slug}`;
  return (
    <article className={`card${out ? ' sold-out' : ''}`} onMouseMove={(e) => tilt(e, 6)} onMouseLeave={untilt} onMouseEnter={prefetch} onFocusCapture={prefetch} onTouchStart={prefetch}>
      <div className="card-art" style={{ '--tone': p.colors[0] }}>
        <Link to={href} className="card-link" tabIndex={-1} aria-hidden="true"><ProductArt {...p} alt={p.name} /></Link>
        {p.badge && <span className="card-badge">{p.badge}</span>}
        {p.ageRestricted && <span className="card-age" title="Solo para mayores de 18 años">+18</span>}
        <button type="button" className={`fav${fav ? ' on' : ''}`} aria-pressed={fav} aria-label={fav ? 'Quitar de la lista de deseos' : 'Guardar en la lista de deseos'} onClick={() => toggle(p.id)}>
          <Icon name="heart" size={18} stroke={2.2} />
        </button>
        <span className="card-shine" />
      </div>
      <div className="card-body">
        <span className="card-origin"><Icon name="pin" size={14} stroke={2.2} />{p.town} · {p.zoneName}</span>
        <h3><Link to={href} className="card-title">{p.name}</Link></h3>
        <span className="card-maker">{p.maker}</span>
        {notice}
        <div className="card-foot">
          <span className="price">{p.hasVariants && p.variants.some((v) => v.price !== p.price) ? <small>Desde </small> : null}{money(Math.min(p.price, ...p.variants.map((v) => v.price)))}</span>
          {out ? <span className="add add-off">Agotado</span>
            : p.hasVariants ? <Link to={href} className="add"><Icon name="bag" size={17} stroke={2.2} />Elegir</Link>
            : <AddButton id={p.cartKey} label="Añadir" />}
        </div>
      </div>
    </article>
  );
}

export function Catalog({ filter, setFilter }) {
  const { zone, cat } = filter;
  const { products } = useCatalog();
  const { zones, categoryBySlug, zoneBySlug } = useSite();
  const grid = useRef(null);
  const tabs = useRef(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const zoneFilters = [['todas', 'Todo el Huila'], ...zones.map((z) => [z.slug, z.name])];

  const list = useMemo(
    () => products.filter((p) => (zone === 'todas' || p.zone === zone) && (!cat || p.cat === cat)).slice(0, 12),
    [products, zone, cat]
  );

  // Indicador que se desliza bajo la pestaña activa
  useLayoutEffect(() => {
    const el = tabs.current?.querySelector('[aria-selected="true"]');
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [zone, cat]);

  // Las tarjetas entran escalonadas cada vez que cambia el filtro
  useLayoutEffect(() => {
    if (reduced() || !grid.current) return;
    const cards = grid.current.querySelectorAll('.card');
    gsap.fromTo(cards, { y: 40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' });
  }, [list]);

  const reset = () => setFilter({ zone: 'todas', cat: null });
  const catName = cat && categoryBySlug(cat)?.name;
  const more = cat ? `/categoria/${cat}` : zone !== 'todas' ? `/zona/${zone}` : '/tienda';

  return (
    <section id="tienda" className="shop">
      <div className="wrap">
        <div className="sec-head split-head">
          <div>
            <span className="kicker" data-anim="up">Selección curada</span>
            <h2 data-anim="up">Lo más pedido del Huila</h2>
          </div>
          <div className="tabs" role="tablist" aria-label="Filtrar por zona" ref={tabs} data-anim="up">
            <span className="tabs-pill" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} />
            {zoneFilters.map(([v, l]) => (
              <button key={v} type="button" role="tab" aria-selected={zone === v && !cat} onClick={() => setFilter({ zone: v, cat: null })}>{l}</button>
            ))}
          </div>
        </div>

        {catName && (
          <div className="active-filter">
            Categoría: <b>{catName}</b>
            <button type="button" onClick={reset}>Quitar filtro <Icon name="close" size={14} stroke={2.6} /></button>
          </div>
        )}

        <div className="grid" ref={grid}>
          {list.length ? (
            list.map((p) => <ProductCard key={p.id} p={p} />)
          ) : (
            <div className="empty">
              <Icon name="leaf" size={40} stroke={1.6} />
              <b>Muy pronto habrá productos {catName ? `de ${catName.toLowerCase()}` : zone !== 'todas' ? `de la Zona ${zoneBySlug[zone]?.name}` : 'que coincidan'}</b>
              <p>Estamos sumando nuevos embajadores en todo el departamento.</p>
              <Link className="btn btn-green" to="/quiero-ser-embajador">Quiero ser embajador</Link>
            </div>
          )}
        </div>
        {list.length > 0 && (
          <div className="shop-more">
            <Link to={more} className="text-cta">Ver todos los productos{catName ? ` de ${catName.toLowerCase()}` : zone !== 'todas' ? ` de la Zona ${zoneBySlug[zone]?.name}` : ''} <Icon name="arrow" size={18} stroke={2.4} /></Link>
          </div>
        )}
      </div>
    </section>
  );
}
