import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { ProductCard } from '../catalog/Catalog.jsx';
import { useCatalog } from '../catalog/CatalogProvider.jsx';
import { useSite } from '../site/SiteProvider.jsx';
import { Stars } from './ProductPage.jsx';

/** Tarjeta de embajador (mismo estilo que la cinta del inicio). */
export function AmbassadorCard({ a }) {
  const z = a.zone;
  return (
    <article className="amb amb-static">
      <div className="amb-top">
        {a.avatar_url ? <img className="amb-ava" src={a.avatar_url} alt="" width="54" height="54" loading="lazy" />
          : <span className="amb-ava" style={{ background: z?.fill_color, color: z?.label_color }}>{a.initials}</span>}
        <div>
          <b>{a.brand_name}</b>
          <span><Icon name="pin" size={13} stroke={2.4} />{a.municipality?.name} · {z?.name}</span>
        </div>
      </div>
      <p>{a.short_description}</p>
      <div className="amb-foot">
        {a.award ? <span className="amb-award"><Icon name="award" size={14} stroke={2.2} />{a.award}</span> : <span />}
        <Link to={`/embajador/${a.slug}`}>Ver productos <Icon name="arrow" size={15} stroke={2.4} /></Link>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ /embajadores */
export function AmbassadorsPage() {
  useTitle('Embajadores del Huila');
  const { ambassadors, zones } = useSite();
  const [zone, setZone] = useState('');
  const [q, setQ] = useState('');
  const list = ambassadors.filter((a) => (!zone || a.zone?.slug === zone) && (!q.trim() || `${a.brand_name} ${a.municipality?.name}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <section className="store">
      <div className="wrap">
        <nav className="crumbs" aria-label="Ruta"><Link to="/">Inicio</Link><span>/</span><span aria-current="page">Embajadores</span></nav>
        <header className="store-head">
          <div>
            <span className="kicker">Las manos detrás de cada producto</span>
            <h1>Embajadores del Huila</h1>
            <p className="muted">{ambassadors.length} familias, fincas y talleres con historia propia. Cada compra llega directo a ellos.</p>
          </div>
          <Link to="/quiero-ser-embajador" className="btn btn-outline">Quiero ser embajador</Link>
        </header>
        <div className="store-bar">
          <label className="pn-search"><Icon name="search" size={18} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca una marca o un municipio" aria-label="Buscar embajador" /></label>
          <div className="chips">
            <button type="button" className={!zone ? 'on' : ''} onClick={() => setZone('')}>Todo el Huila</button>
            {zones.map((z) => <button key={z.slug} type="button" className={zone === z.slug ? 'on' : ''} onClick={() => setZone(z.slug)}>{z.name}</button>)}
          </div>
        </div>
        {list.length ? (
          <div className="amb-grid">{list.map((a) => <AmbassadorCard key={a.id} a={a} />)}</div>
        ) : (
          <div className="empty">
            <Icon name="leaf" size={40} stroke={1.6} />
            <b>{zone ? `La Zona ${zones.find((z) => z.slug === zone)?.name} espera a sus primeros embajadores` : 'Sin resultados'}</b>
            <p>¿Produces café, cacao, artesanías o alimentos en el Huila?</p>
            <Link to="/quiero-ser-embajador" className="btn btn-green">Quiero ser embajador</Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ /embajador/:slug */
export function AmbassadorPage() {
  const { slug } = useParams();
  const site = useSite();
  const { products } = useCatalog();
  const [cat, setCat] = useState('');

  const q = useQuery({
    queryKey: ['ambassador-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('ambassadors')
        .select('id, slug, code, brand_name, initials, avatar_url, banner_url, short_description, story_origin, story_present, story_future, instagram, facebook, website, whatsapp, rating_avg, rating_count, sales_count, joined_at, municipality_id, badges:ambassador_badges (label, type, year, sort_order)')
        .eq('slug', slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const a = q.data;
  useTitle(a?.brand_name || 'Embajador', { description: a?.short_description || a?.story_present, image: a?.banner_url || a?.avatar_url, type: 'profile' });

  const reviews = useQuery({
    queryKey: ['amb-reviews', a?.id],
    enabled: !!a,
    queryFn: async () => {
      const { data, error } = await supabase.from('reviews').select('id, rating, comment, author_name, created_at, product:products (name, slug)').eq('ambassador_id', a.id).eq('is_visible', true).order('created_at', { ascending: false }).limit(6);
      if (error) throw error;
      return data;
    },
  });

  const mine = useMemo(() => (a ? products.filter((p) => p.ambassadorId === a.id) : []), [products, a]);
  const cats = useMemo(() => [...new Map(mine.map((p) => [p.cat, p.categoryName])).entries()], [mine]);
  const shown = cat ? mine.filter((p) => p.cat === cat) : mine;

  if (q.isLoading || !site.ready) return <section className="store"><div className="wrap"><div className="skeleton" style={{ height: 320 }} /></div></section>;
  if (!a) {
    return (
      <section className="page-state"><div className="wrap"><div className="empty">
        <Icon name="award" size={40} stroke={1.6} /><b>Este embajador no está disponible</b>
        <Link to="/embajadores" className="btn btn-green">Ver todos los embajadores</Link>
      </div></div></section>
    );
  }

  const me = site.ambassadors.find((x) => x.id === a.id);
  const zone = me?.zone;
  const town = me?.municipality?.name;
  const neighbours = site.ambassadors.filter((x) => x.zone?.slug === zone?.slug && x.id !== a.id).slice(0, 3);
  const badges = [...a.badges].sort((x, y) => x.sort_order - y.sort_order);
  const story = [['Cómo empezó', a.story_origin], ['Hoy', a.story_present], ['Lo que sueña', a.story_future]].filter(([, t]) => t?.trim());
  const wa = a.whatsapp?.replace(/\D/g, '');
  const banner = a.banner_url || zone?.image_url;
  const since = a.joined_at ? new Date(`${a.joined_at}T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) : '';
  const quote = pullQuote(story[0]?.[1]);
  const photo = mine.find((p) => p.image);

  return (
    <div className="amb-page">
      <header className="amb-hero" style={banner ? { '--amb-bg': `url(${banner})` } : undefined}>
        <div className="wrap amb-hero-in">
          <nav className="crumbs" aria-label="Ruta"><Link to="/">Inicio</Link><span>/</span><Link to="/embajadores">Embajadores</Link><span>/</span><span aria-current="page">{a.brand_name}</span></nav>
          <div className="amb-id">
            {a.avatar_url ? <img className="amb-photo" src={a.avatar_url} alt={`Foto de ${a.brand_name}`} width="140" height="140" />
              : <span className="amb-photo" style={{ background: zone?.fill_color, color: zone?.label_color }} aria-hidden="true">{a.initials}</span>}
            <div className="amb-id-copy">
              <span className="amb-tag">Embajador · Zona {zone?.name}</span>
              <h1>{a.brand_name}</h1>
              <p className="amb-where">
                <Icon name="pin" size={16} stroke={2.4} />{town}
                <span aria-hidden="true">·</span>
                <Link to={`/zona/${zone?.slug}`}>Ver la Zona {zone?.name}</Link>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="amb-intro">
          <div className="amb-intro-copy">
            {badges.length > 0 && <div className="pdp-badges">{badges.map((b) => <span key={b.label} className="amb-award"><Icon name="award" size={14} stroke={2.2} />{b.label}</span>)}</div>}
            {a.short_description && <p className="amb-lead">{a.short_description}</p>}
            <div className="amb-links">
              {wa && <a className="btn btn-green btn-sm" href={`https://wa.me/${wa.length === 10 ? `57${wa}` : wa}?text=${encodeURIComponent(`Hola ${a.brand_name}, te encontré en Mercado Origen`)}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} />WhatsApp</a>}
              {a.instagram && <a className="btn btn-outline btn-sm" href={a.instagram} target="_blank" rel="noreferrer"><Icon name="instagram" size={16} />Instagram</a>}
              {a.facebook && <a className="btn btn-outline btn-sm" href={a.facebook} target="_blank" rel="noreferrer"><Icon name="facebook" size={16} />Facebook</a>}
              {a.website && <a className="btn btn-outline btn-sm" href={a.website} target="_blank" rel="noreferrer"><Icon name="leaf" size={16} />Página web</a>}
            </div>
          </div>
          <dl className="amb-stats">
            <div><dt>Productos</dt><dd>{mine.length}</dd></div>
            <div>
              <dt>Calificación</dt>
              <dd>{a.rating_count > 0 ? <Stars value={a.rating_avg} count={a.rating_count} size="sm" /> : <span className="amb-new">Nuevo</span>}</dd>
            </div>
            {a.sales_count > 0 && <div><dt>Ventas</dt><dd>{a.sales_count}</dd></div>}
            {since && <div><dt>Con nosotros desde</dt><dd className="amb-since">{since}</dd></div>}
          </dl>
        </div>

        <section className="pdp-section" aria-labelledby="amb-prods">
          <div className="pdp-section-head">
            <h2 id="amb-prods">Productos de {a.brand_name}</h2>
            {cats.length > 1 && (
              <div className="chips">
                <button type="button" className={!cat ? 'on' : ''} onClick={() => setCat('')}>Todos</button>
                {cats.map(([slug, name]) => <button key={slug} type="button" className={cat === slug ? 'on' : ''} onClick={() => setCat(slug)}>{name}</button>)}
              </div>
            )}
          </div>
          {shown.length ? <div className="grid">{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div> : (
            <p className="muted">Muy pronto, sus productos en la tienda.</p>
          )}
        </section>

      </div>

      {story.length > 0 && (
        <section className="amb-story" aria-labelledby="amb-story-h">
          <div className="wrap amb-story-in">
            <aside className="amb-story-side">
              <span className="kicker light">Su historia</span>
              <h2 id="amb-story-h">Así nació {a.brand_name}</h2>
              {quote && <blockquote className="amb-quote"><p>{quote}</p></blockquote>}
              {photo && (
                <figure className="amb-story-photo">
                  <img src={photo.image} alt={photo.name} loading="lazy" />
                  <figcaption><Icon name="pin" size={14} stroke={2.4} />Hecho en {town}, Huila</figcaption>
                </figure>
              )}
            </aside>
            <ol className="amb-chapters">
              {story.map(([t, text], i) => <Chapter key={t} n={i + 1} title={t} text={text} />)}
            </ol>
          </div>
        </section>
      )}

      <div className="wrap amb-after">
        {reviews.data?.length > 0 && (
          <section className="pdp-section">
            <h2>Lo que dicen sus clientes</h2>
            <ul className="reviews">
              {reviews.data.map((r) => (
                <li key={r.id}>
                  <div><Stars value={r.rating} size="sm" /> <b>{r.author_name || 'Cliente'}</b> <span className="muted small">sobre <Link className="link" to={`/producto/${r.product?.slug}`}>{r.product?.name}</Link></span></div>
                  {r.comment && <p>{r.comment}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {neighbours.length > 0 && (
          <section className="pdp-section">
            <h2>Otros embajadores de la Zona {zone?.name}</h2>
            <div className="amb-grid">{neighbours.map((x) => <AmbassadorCard key={x.id} a={x} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}

/** Primera frase del relato, para la cita destacada (máx. ~180 caracteres, cortada en palabra). */
function pullQuote(text) {
  const t = text?.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const first = t.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? t;
  if (first.length <= 180) return first;
  return `${first.slice(0, 180).replace(/\s+\S*$/, '').replace(/[,;:]$/, '')}…`;
}

const LONG = 520;

/** Capítulo de la línea de tiempo; los relatos largos se pliegan con "Seguir leyendo". */
function Chapter({ n, title, text }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG;
  const id = `amb-ch-${n}`;
  return (
    <li className="amb-chapter">
      <span className="amb-chapter-n" aria-hidden="true">{String(n).padStart(2, '0')}</span>
      <div className="amb-chapter-body">
        <h3>{title}</h3>
        {/* Plegado, los párrafos se unen para que el corte no deje un "…" suelto en una línea vacía. */}
        <p id={id} className={long && !open ? 'clamped' : undefined}>{long && !open ? text.trim().replace(/\s*\n\s*/g, ' ') : text.trim()}</p>
        {long && (
          <button type="button" className="amb-more" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
            {open ? 'Mostrar menos' : 'Seguir leyendo'}
            <Icon name="arrow" size={15} stroke={2.4} />
          </button>
        )}
      </div>
    </li>
  );
}
