import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { ProductCard } from '../catalog/Catalog.jsx';
import { toCardProduct } from '../catalog/CatalogProvider.jsx';
import { useSite } from '../site/SiteProvider.jsx';

const PAGE = 12;
const SORTS = [
  ['mas_vendidos', 'Más vendidos'], ['relevancia', 'Más relevantes'], ['nuevos', 'Más nuevos'],
  ['precio_asc', 'Precio: menor a mayor'], ['precio_desc', 'Precio: mayor a menor'], ['calificacion', 'Mejor calificados'],
];
const PRICES = [['', '', 'Cualquier precio'], ['', '30000', 'Hasta $30.000'], ['30000', '80000', '$30.000 a $80.000'], ['80000', '', 'Más de $80.000']];

/** /tienda, /categoria/:slug y /zona/:slug: filtros en la URL, catálogo paginado en el servidor. */
export default function ShopPage({ preset }) {
  const params = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const site = useSite();
  const [sheet, setSheet] = useState(false);

  const f = {
    q: sp.get('q') || '',
    category: preset === 'category' ? params.slug : sp.get('categoria') || '',
    zone: preset === 'zone' ? params.slug : sp.get('zona') || '',
    municipality: sp.get('municipio') || '',
    ambassador: sp.get('embajador') || '',
    min_price: sp.get('min') || '',
    max_price: sp.get('max') || '',
    min_rating: sp.get('estrellas') || '',
    sort: sp.get('orden') || '',
  };

  // Cambiar un filtro: las rutas /categoria y /zona pasan a /tienda?… para combinar filtros.
  const setF = (patch) => {
    const next = { ...f, ...patch };
    const qs = new URLSearchParams();
    const map = { q: 'q', category: 'categoria', zone: 'zona', municipality: 'municipio', ambassador: 'embajador', min_price: 'min', max_price: 'max', min_rating: 'estrellas', sort: 'orden' };
    for (const [k, v] of Object.entries(next)) if (v) qs.set(map[k], v);
    if (preset) navigate(`/tienda${qs.toString() ? `?${qs}` : ''}`, { replace: false });
    else setSp(qs, { replace: true });
  };
  const clear = () => (preset ? navigate('/tienda') : setSp({}, { replace: true }));

  const cat = site.categoryBySlug(f.category);
  const zone = site.zoneBySlug[f.zone];
  const muni = site.municipalities.find((m) => m.slug === f.municipality);
  const amb = site.ambassadorBySlug(f.ambassador);
  const title = f.q ? `Resultados para “${f.q}”` : cat ? cat.name : zone ? `Zona ${zone.name}` : muni ? `Productos de ${muni.name}` : amb ? amb.brand_name : 'Tienda';
  useTitle(f.q ? `Buscar “${f.q}”` : title === 'Tienda' ? 'Tienda: todo el Huila' : title, {
    description: cat?.tagline ? `${cat.name} del Huila: ${cat.tagline}. Compra directo a los productores.` : undefined,
    noindex: !!f.q,
  });

  const q = useInfiniteQuery({
    queryKey: ['shop', f],
    initialPageParam: 0,
    staleTime: 60_000,
    queryFn: async ({ pageParam }) => {
      const body = Object.fromEntries(Object.entries({ ...f, limit: PAGE, offset: pageParam }).filter(([, v]) => v !== ''));
      const { data, error } = await supabase.rpc('shop_products', { p: body });
      if (error) throw error;
      return { total: data.total, items: data.items.map(toCardProduct), offset: pageParam };
    },
    getNextPageParam: (last) => (last.offset + PAGE < last.total ? last.offset + PAGE : undefined),
  });
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total ?? 0;

  // Carga infinita: al acercarse al final se pide la siguiente página.
  const sentinel = useRef(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !q.hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !q.isFetchingNextPage) q.fetchNextPage();
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage]);

  const chips = [
    f.q && ['q', `“${f.q}”`],
    cat && ['category', cat.name],
    zone && ['zone', `Zona ${zone.name}`],
    muni && ['municipality', muni.name],
    amb && ['ambassador', amb.brand_name],
    (f.min_price || f.max_price) && ['price', f.min_price && f.max_price ? `${money(+f.min_price)} a ${money(+f.max_price)}` : f.max_price ? `Hasta ${money(+f.max_price)}` : `Desde ${money(+f.min_price)}`],
    f.min_rating && ['min_rating', `${f.min_rating}★ o más`],
  ].filter(Boolean);
  const removeChip = (k) => setF(k === 'price' ? { min_price: '', max_price: '' } : k === 'zone' ? { zone: '', municipality: '' } : { [k]: '' });

  const filters = (
    <div className="filters">
      <fieldset>
        <legend>Categoría</legend>
        <div className="filter-list">
          <button type="button" className={!f.category ? 'on' : ''} onClick={() => setF({ category: '' })}>Todas</button>
          {site.categories.map((c) => (
            <button key={c.id} type="button" className={f.category === c.slug ? 'on' : ''} onClick={() => setF({ category: c.slug })}>{c.name}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Zona del Huila</legend>
        <div className="chips">
          <button type="button" className={!f.zone ? 'on' : ''} onClick={() => setF({ zone: '', municipality: '' })}>Todas</button>
          {site.zones.map((z) => <button key={z.slug} type="button" className={f.zone === z.slug ? 'on' : ''} onClick={() => setF({ zone: z.slug, municipality: '' })}>{z.name}</button>)}
        </div>
      </fieldset>
      <label className="field">
        <span className="field-label">Municipio</span>
        <select value={f.municipality} onChange={(e) => setF({ municipality: e.target.value })}>
          <option value="">Todos</option>
          {site.municipalities.filter((m) => !f.zone || m.zone.slug === f.zone).filter((m) => site.hasAmbassador(m.id)).map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Embajador</span>
        <select value={f.ambassador} onChange={(e) => setF({ ambassador: e.target.value })}>
          <option value="">Todos</option>
          {site.ambassadors.filter((a) => (!f.zone || a.zone?.slug === f.zone) && (!f.municipality || a.municipality?.slug === f.municipality)).map((a) => <option key={a.slug} value={a.slug}>{a.brand_name}</option>)}
        </select>
      </label>
      <fieldset>
        <legend>Precio</legend>
        <div className="filter-list">
          {PRICES.map(([min, max, label]) => (
            <button key={label} type="button" className={f.min_price === min && f.max_price === max ? 'on' : ''} onClick={() => setF({ min_price: min, max_price: max })}>{label}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Calificación</legend>
        <div className="chips">
          {[['', 'Todas'], ['4', '4★ o más'], ['3', '3★ o más']].map(([v, l]) => <button key={l} type="button" className={f.min_rating === v ? 'on' : ''} onClick={() => setF({ min_rating: v })}>{l}</button>)}
        </div>
      </fieldset>
    </div>
  );

  return (
    <section className="store">
      <div className="wrap">
        <nav className="crumbs" aria-label="Ruta"><Link to="/">Inicio</Link><span>/</span>{title === 'Tienda' ? <span aria-current="page">Tienda</span> : <><Link to="/tienda">Tienda</Link><span>/</span><span aria-current="page">{title}</span></>}</nav>
        <header className="store-head">
          <div>
            <span className="kicker">{zone ? zone.landmark : cat ? 'Categoría' : 'Productos 100% del Huila'}</span>
            <h1>{title}</h1>
            {cat?.tagline && <p className="muted">{cat.tagline}</p>}
            {zone?.description && <p className="muted">{zone.description}</p>}
          </div>
        </header>

        <div className="store-bar">
          <span className="muted">{q.isLoading ? 'Buscando…' : `${total} ${total === 1 ? 'producto' : 'productos'}`}</span>
          <button type="button" className="btn btn-outline btn-sm filter-btn" onClick={() => setSheet(true)}>
            <Icon name="search" size={16} />Filtros{chips.length ? ` (${chips.length})` : ''}
          </button>
          <label className="sort">
            <span className="sr-only">Ordenar por</span>
            <select value={f.sort || (f.q ? 'relevancia' : 'mas_vendidos')} onChange={(e) => setF({ sort: e.target.value })}>
              {SORTS.filter(([v]) => v !== 'relevancia' || f.q).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>

        {chips.length > 0 && (
          <div className="active-chips">
            {chips.map(([k, label]) => <button key={k} type="button" onClick={() => removeChip(k)}>{label}<Icon name="close" size={14} stroke={2.6} /></button>)}
            <button type="button" className="link-btn" onClick={clear}>Limpiar todo</button>
          </div>
        )}

        <div className="store-layout">
          <aside className="store-filters" aria-label="Filtros">{filters}</aside>
          <div>
            {q.isLoading ? (
              <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton card-skel" />)}</div>
            ) : q.error ? (
              <p className="notice notice-error">No pudimos cargar los productos. <button type="button" className="link-btn" onClick={() => q.refetch()}>Reintentar</button></p>
            ) : !items.length ? (
              <div className="empty">
                <Icon name="leaf" size={40} stroke={1.6} />
                <b>{f.q ? `No encontramos productos para “${f.q}”` : 'Muy pronto habrá productos aquí'}</b>
                <p>{f.q ? 'Prueba con otra palabra o quita algún filtro.' : 'Estamos sumando nuevos embajadores en todo el departamento.'}</p>
                {chips.length ? <button type="button" className="btn btn-green" onClick={clear}>Ver todo el catálogo</button> : <Link to="/quiero-ser-embajador" className="btn btn-green">Quiero ser embajador</Link>}
              </div>
            ) : (
              <>
                <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
                <div ref={sentinel} className="store-more">
                  {q.hasNextPage && (
                    <button type="button" className="btn btn-outline" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                      {q.isFetchingNextPage ? 'Cargando…' : `Cargar más (${total - items.length} restantes)`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filtros en el celular: hoja que sube desde abajo */}
      <div className={`sheet-scrim${sheet ? ' on' : ''}`} onClick={() => setSheet(false)} aria-hidden="true" />
      <div className={`sheet${sheet ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label="Filtros" aria-hidden={!sheet}>
        <div className="sheet-head">
          <b>Filtros</b>
          <button type="button" className="icon-btn" aria-label="Cerrar filtros" onClick={() => setSheet(false)}><Icon name="close" size={22} /></button>
        </div>
        <div className="sheet-body">{filters}</div>
        <div className="sheet-foot">
          <button type="button" className="btn btn-outline" onClick={clear}>Limpiar</button>
          <button type="button" className="btn btn-green" onClick={() => setSheet(false)}>Ver {total} {total === 1 ? 'producto' : 'productos'}</button>
        </div>
      </div>
    </section>
  );
}

export const CategoryShop = () => <ShopPage preset="category" />;
export const ZoneShop = () => <ShopPage preset="zone" />;
