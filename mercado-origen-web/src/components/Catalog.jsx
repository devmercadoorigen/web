import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, PRODUCTS, ZONES } from '../data/catalog.js';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../lib/format.js';
import { gsap, reduced, scrollToTarget, tilt, untilt } from '../lib/motion.js';
import { Icon, ProductArt } from './ui.jsx';

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

// Mosaico de categorías: cuatro con foto del territorio y cuatro compactas con su producto.
const TILES = [
  { cat: 'cacao', title: 'Chocolate y cacao', note: 'De mesa, en barra y en bolitas', img: '/img/found/mazorca-cacao.jpg', size: 'big' },
  { cat: 'cafe', title: 'Café de especialidad', note: 'Fincas de altura', img: '/img/found/finca-cafetera-pitalito.jpg', size: 'sq' },
  { cat: 'snacks', title: 'Sabores típicos', note: 'Achiras y antojos', img: '/img/found/surabastos-neiva.jpg', size: 'sq' },
  { cat: 'artesanias', title: 'Artesanías y souvenirs', note: 'Piezas hechas a mano que cuentan el Huila', img: '/img/san-agustin.jpg', size: 'wide' },
];
const MINI = [
  { cat: 'miel', note: 'Miel natural de Pitalito', tint: 'var(--ocre-50)' },
  { cat: 'bebidas', note: 'Infusiones y cerveza artesanal', tint: 'var(--verde-50)' },
  { cat: 'moda', note: 'Resortwear y joyas', tint: '#E9F3F6' },
  { cat: 'cuidado', note: 'Botánicos del Huila', tint: 'var(--naranja-50)' },
];

const countOf = (cat) => PRODUCTS.filter((p) => p.cat === cat).length;
const countLabel = (n) => (n ? `${n} ${n === 1 ? 'producto' : 'productos'}` : 'Muy pronto');

export function Categories({ onPick }) {
  const go = (cat) => { onPick(cat); scrollToTarget('#tienda'); };
  return (
    <section className="cats" aria-labelledby="cats-title">
      <div className="wrap">
        <div className="sec-head split-head cats-head">
          <div>
            <span className="kicker" data-anim="up">Compra por antojo</span>
            <h2 id="cats-title" data-anim="up">Todo lo que se hace en el Huila, en un solo lugar</h2>
          </div>
          <div className="cats-aside" data-anim="up">
            <p>Ocho categorías de productos hechos en el departamento. Elige una y arma tu caja con productos de varios municipios.</p>
            <button type="button" className="text-cta" onClick={() => go(null)}>Ver todo el catálogo <Icon name="arrow" size={18} stroke={2.4} /></button>
          </div>
        </div>

        <div className="bento">
          {TILES.map((t) => {
            const n = countOf(t.cat);
            return (
              <button key={t.cat} type="button" className={`bento-tile ${t.size}`} data-anim="scale" onClick={() => go(t.cat)}>
                <img src={t.img} alt="" loading="lazy" />
                <span className="bento-shade" />
                <span className={`bento-count${n ? '' : ' soon'}`}>{countLabel(n)}</span>
                <span className="bento-copy">
                  <b>{t.title}</b>
                  <span>{t.note}</span>
                </span>
                <span className="bento-go"><Icon name="arrowUp" size={20} stroke={2.4} /></span>
              </button>
            );
          })}
        </div>

        <div className="cat-strip">
          {MINI.map((m) => {
            const c = CATEGORIES.find((x) => x.id === m.cat);
            const p = PRODUCTS.find((x) => x.cat === m.cat);
            const n = countOf(m.cat);
            return (
              <button key={m.cat} type="button" className="cat-mini" style={{ background: m.tint }} data-anim="up" onClick={() => go(m.cat)}>
                <span className="cat-mini-copy">
                  <b>{c.name}</b>
                  <span>{m.note}</span>
                  <em className={n ? '' : 'soon'}>{countLabel(n)}</em>
                </span>
                <span className="cat-mini-art">
                  {p ? <ProductArt {...p} alt="" /> : <Icon name="leaf" size={34} stroke={1.8} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ p }) {
  const [fav, setFav] = useState(false);
  return (
    <article className="card" onMouseMove={(e) => tilt(e, 6)} onMouseLeave={untilt}>
      <div className="card-art" style={{ '--tone': p.colors[0] }}>
        <ProductArt {...p} alt={p.name} />
        {p.badge && <span className="card-badge">{p.badge}</span>}
        <button type="button" className={`fav${fav ? ' on' : ''}`} aria-pressed={fav} aria-label="Guardar en favoritos" onClick={() => setFav(!fav)}>
          <Icon name="heart" size={18} stroke={2.2} />
        </button>
        <span className="card-shine" />
      </div>
      <div className="card-body">
        <span className="card-origin"><Icon name="pin" size={14} stroke={2.2} />{p.town} · {ZONES[p.zone].name.replace('Zona ', '')}</span>
        <h3>{p.name}</h3>
        <span className="card-maker">{p.maker}</span>
        <div className="card-foot">
          <span className="price">{money(p.price)}</span>
          <AddButton id={p.id} label="Añadir" />
        </div>
      </div>
    </article>
  );
}

const ZONE_FILTERS = [['todas', 'Todo el Huila'], ['norte', 'Norte'], ['oriente', 'Oriente'], ['sur', 'Sur'], ['occidente', 'Occidente']];

export function Catalog({ filter, setFilter }) {
  const { zone, cat, query } = filter;
  const grid = useRef(null);
  const tabs = useRef(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => (zone === 'todas' || p.zone === zone) && (!cat || p.cat === cat) && (!q || `${p.name} ${p.maker} ${p.town}`.toLowerCase().includes(q)));
  }, [zone, cat, query]);

  // Indicador que se desliza bajo la pestaña activa
  useLayoutEffect(() => {
    const el = tabs.current?.querySelector('[aria-selected="true"]');
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [zone, cat, query]);

  // Las tarjetas entran escalonadas cada vez que cambia el filtro
  useLayoutEffect(() => {
    if (reduced() || !grid.current) return;
    const cards = grid.current.querySelectorAll('.card');
    gsap.fromTo(cards, { y: 40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' });
  }, [list]);

  const reset = () => setFilter({ zone: 'todas', cat: null, query: '' });
  const catName = cat && CATEGORIES.find((c) => c.id === cat)?.name;

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
            {ZONE_FILTERS.map(([v, l]) => (
              <button key={v} type="button" role="tab" aria-selected={zone === v && !cat && !query} onClick={() => setFilter({ zone: v, cat: null, query: '' })}>{l}</button>
            ))}
          </div>
        </div>

        {(catName || query) && (
          <div className="active-filter">
            {catName ? <>Categoría: <b>{catName}</b></> : <>Resultados para <b>“{query}”</b></>}
            <button type="button" onClick={reset}>Quitar filtro <Icon name="close" size={14} stroke={2.6} /></button>
          </div>
        )}

        <div className="grid" ref={grid}>
          {list.length ? (
            list.map((p) => <ProductCard key={p.id} p={p} />)
          ) : (
            <div className="empty">
              <Icon name="leaf" size={40} stroke={1.6} />
              <b>Muy pronto habrá productos {catName ? `de ${catName.toLowerCase()}` : zone !== 'todas' ? `de la ${ZONES[zone].name}` : 'que coincidan'}</b>
              <p>Estamos sumando nuevos embajadores en todo el departamento.</p>
              <button type="button" className="btn btn-green" onClick={reset}>Ver todo el catálogo</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
