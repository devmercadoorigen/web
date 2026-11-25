import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { longDate, money, rating } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { ProductCard } from '../catalog/Catalog.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useCart } from '../cart/CartProvider.jsx';
import { toCardProduct, useCatalog } from '../catalog/CatalogProvider.jsx';
import { useWishlist } from '../wishlist/useWishlist.js';
import { productQuery } from './productQuery.js';
import { KitCard } from '../../components/Kits.jsx';
import { track } from '../recommendations/track.js';
import { useRecommendations } from '../recommendations/useRecommendations.js';
import { UpsellRow, useCompleteBox } from '../recommendations/CompleteBox.jsx';

export function Stars({ value, count, size = 'md' }) {
  const v = Math.round(Number(value) * 2) / 2;
  return (
    <span className={`stars stars-${size}`} aria-label={count ? `${rating(Number(value))} de 5, ${count} reseñas` : 'Sin reseñas todavía'}>
      <span aria-hidden="true">{[1, 2, 3, 4, 5].map((i) => (i <= v ? '★' : i - 0.5 === v ? '⯪' : '☆')).join('')}</span>
      {count ? <em>{rating(Number(value))} · {count} {count === 1 ? 'reseña' : 'reseñas'}</em> : <em>Sin reseñas todavía</em>}
    </span>
  );
}

function ReviewForm({ productId, items, onDone }) {
  const { notify } = useToast();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!stars) return notify('Elige de 1 a 5 estrellas', 'error');
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    // Producto y embajador los completa la base desde el item comprado.
    const { error } = await supabase.from('reviews').insert({ order_item_id: items[0].order_item_id, user_id: user.id, rating: stars, comment: comment.trim() || null });
    setBusy(false);
    if (error) return notify(friendlyError(error), 'error');
    notify('¡Gracias! Tu reseña ayuda a otros clientes y al embajador');
    onDone();
  };
  return (
    <form className="review-form panel" onSubmit={submit} id="resena">
      <b>¿Qué tal te pareció? Recibiste este producto en el pedido {items[0].order_number}.</b>
      <div className="star-pick" role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={stars === i} aria-label={`${i} ${i === 1 ? 'estrella' : 'estrellas'}`} className={i <= stars ? 'on' : ''} onClick={() => setStars(i)}>★</button>
        ))}
      </div>
      <label className="field"><span className="field-label">Cuéntanos más <span className="field-opt">(opcional)</span></span>
        <textarea rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Sabor, empaque, cómo llegó…" />
      </label>
      <button type="submit" className="btn btn-green" disabled={busy}>{busy ? 'Enviando…' : 'Publicar reseña'}</button>
    </form>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { add, lines } = useCart();
  const { has, toggle } = useWishlist();
  const { products: catalog, kits: allKits } = useCatalog();
  const [img, setImg] = useState(0);
  const [variantId, setVariantId] = useState(null);
  const [added, setAdded] = useState(false);

  const q = useQuery(productQuery(slug));
  const raw = q.data;
  const p = useMemo(() => (raw ? toCardProduct(raw) : null), [raw]);
  useTitle(p?.name || 'Producto', raw && { description: raw.short_description || raw.description, image: [...(raw.images || [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url, type: 'product' });

  const reviews = useQuery({
    queryKey: ['reviews', raw?.id],
    enabled: !!raw,
    queryFn: async () => {
      const { data, error } = await supabase.from('reviews').select('id, rating, comment, author_name, created_at').eq('product_id', raw.id).eq('is_visible', true).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });
  const reviewable = useQuery({
    queryKey: ['reviewable', raw?.id, user?.id],
    enabled: !!raw && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_reviewable_items', { p_product_id: raw.id });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setImg(0);
    setVariantId(null);
  }, [slug]);
  useEffect(() => {
    if (location.hash === '#resena' && reviewable.data?.length) document.getElementById('resena')?.scrollIntoView({ behavior: 'smooth' });
  }, [reviewable.data]);

  useEffect(() => {
    if (raw?.id) track('view', raw.id);
  }, [raw?.id]);

  // Relacionados: co-compra + mismo tipo/embajador/zona + gustos del visitante.
  const recs = useRecommendations({ product_id: raw?.id }, { limit: 4, enabled: !!raw });
  const box = useCompleteBox({ limit: 3, enabled: lines.length > 0 });
  const inKits = useMemo(() => (p ? allKits.filter((k) => k.available && k.items.includes(p.id)) : []), [allKits, p]);

  const localRelated = useMemo(() => {
    if (!p) return [];
    const same = (x) => x.id !== p.id;
    const byCat = catalog.filter((x) => same(x) && x.cat === p.cat);
    const byAmb = catalog.filter((x) => same(x) && x.ambassadorId === p.ambassadorId && x.cat !== p.cat);
    return [...byCat, ...byAmb].slice(0, 4);
  }, [catalog, p]);
  const related = recs.items.length ? recs.items : localRelated;

  if (q.isLoading) {
    // Mismas medidas que la página real (ruta + galería cuadrada) para que nada salte al cargar.
    return <section className="store" aria-busy="true"><div className="wrap"><div className="crumbs"><span className="skeleton" style={{ display: 'block', width: 220, height: 18 }} /></div><div className="pdp"><div className="skeleton pdp-main" /><div className="skeleton" style={{ height: 420 }} /></div></div></section>;
  }
  if (!p) {
    return (
      <section className="page-state"><div className="wrap"><div className="empty">
        <Icon name="bag" size={40} stroke={1.6} />
        <b>Este producto no está disponible</b>
        <p>Puede que el embajador lo haya pausado o que se haya agotado. Mira lo que tenemos hoy en la tienda.</p>
        <Link to="/tienda" className="btn btn-green">Ir a la tienda</Link>
      </div></div></section>
    );
  }

  const imgs = [...(raw.images || [])].sort((a, b) => a.sort_order - b.sort_order);
  const variant = p.variants.find((v) => v.id === variantId);
  const needsVariant = p.variants.length > 0;
  const price = variant ? variant.price : p.price;
  const stock = variant ? variant.stock : needsVariant ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock;
  const amb = raw.ambassador;
  const fav = has(p.id);

  const addToCart = () => {
    if (needsVariant && !variant) return;
    add(variant ? variant.cartKey : p.cartKey);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <section className="store">
      <div className="wrap">
        <nav className="crumbs" aria-label="Ruta">
          <Link to="/">Inicio</Link><span>/</span><Link to={`/categoria/${raw.category.slug}`}>{raw.category.name}</Link><span>/</span><span aria-current="page">{p.name}</span>
        </nav>

        <div className="pdp">
          <div className="pdp-gallery">
            <div className="pdp-main" style={{ '--tone': p.colors[0] }}>
              {imgs.length ? <img src={imgs[img].url} srcSet={imgs[img].thumb_url ? `${imgs[img].thumb_url} 400w, ${imgs[img].url} ${imgs[img].width || 1200}w` : undefined} sizes="(max-width: 860px) 100vw, 50vw" alt={imgs[img].alt || p.name} width={imgs[img].width || 1200} height={imgs[img].height || 1200} fetchpriority="high" /> : <ProductArt {...p} alt={p.name} />}
              {p.badge && <span className="card-badge">{p.badge}</span>}
            </div>
            {imgs.length > 1 && (
              <div className="pdp-thumbs" role="tablist" aria-label="Fotos del producto">
                {imgs.map((im, i) => (
                  <button key={im.url} type="button" role="tab" aria-selected={i === img} className={i === img ? 'on' : ''} onClick={() => setImg(i)}>
                    <img src={im.thumb_url || im.url} alt={`Foto ${i + 1}`} width="80" height="80" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pdp-info">
            <span className="card-origin"><Icon name="pin" size={14} stroke={2.2} />{p.town} · Zona {p.zoneName}</span>
            <h1>{p.name}</h1>
            <div className="pdp-meta">
              <Stars value={raw.rating_avg} count={raw.rating_count} />
              <span className="sku">SKU {variant?.sku || p.sku}</span>
            </div>
            {p.badges.length > 0 && <div className="pdp-badges">{p.badges.map((b) => <span key={b} className="tag">{b}</span>)}</div>}
            {raw.short_description && <p className="pdp-lead">{raw.short_description}</p>}

            <div className="pdp-price">
              {raw.compare_at_price && !variant && <s>{money(raw.compare_at_price)}</s>}
              <b>{money(price)}</b>
              {raw.compare_at_price && !variant && <span className="save">Ahorras {money(raw.compare_at_price - price)}</span>}
            </div>

            {needsVariant && (
              <fieldset className="pdp-variants">
                <legend>Presentación</legend>
                <div className="chips">
                  {p.variants.map((v) => (
                    <button key={v.id} type="button" className={v.id === variantId ? 'on' : ''} aria-pressed={v.id === variantId} disabled={v.stock <= 0} onClick={() => { setVariantId(v.id); const k = imgs.findIndex((im) => im.url === v.attributes?.image); if (k >= 0) setImg(k); }}>
                      {v.name}{v.price !== p.price ? ` · ${money(v.price)}` : ''}{v.stock <= 0 ? ' · agotado' : ''}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <p className={`pdp-stock${stock <= 0 ? ' out' : stock <= 5 ? ' low' : ''}`}>
              {stock <= 0 ? 'Agotado por ahora' : stock <= 5 ? `¡Quedan ${stock}!` : 'Disponible'}
            </p>

            <div className="pdp-actions">
              <button type="button" className={`btn btn-green btn-lg${added ? ' is-done' : ''}`} disabled={stock <= 0 || (needsVariant && !variant)} onClick={addToCart}>
                <Icon name={added ? 'check' : 'bag'} size={20} stroke={2.2} />
                {added ? 'Añadido a tu caja' : needsVariant && !variant ? 'Elige una presentación' : 'Añadir al carrito'}
              </button>
              <button type="button" className={`icon-btn pdp-fav${fav ? ' on' : ''}`} aria-pressed={fav} aria-label={fav ? 'Quitar de la lista de deseos' : 'Guardar en la lista de deseos'} onClick={() => toggle(p.id)}>
                <Icon name="heart" size={22} stroke={2.2} />
              </button>
            </div>
            <ul className="pdp-promise">
              <li><Icon name="truck" size={18} />Envío gratis desde $150.000 · una sola caja desde el Huila</li>
              <li><Icon name="lock" size={18} />Pago seguro con PSE, Nequi, Daviplata o tarjeta</li>
            </ul>
            {p.ageRestricted && <p className="legal-note">Producto para mayores de 18 años. El exceso de alcohol es perjudicial para la salud. Prohíbese el expendio de bebidas embriagantes a menores de edad.</p>}

            <Link to={`/embajador/${amb.slug}`} className="pdp-amb">
              {amb.avatar_url ? <img src={amb.avatar_url} alt="" width="56" height="56" /> : <span className="amb-ava">{amb.initials}</span>}
              <span>
                <span className="muted small">Lo hace</span>
                <b>{amb.brand_name}</b>
                <span className="small"><Icon name="pin" size={13} stroke={2.4} />{amb.municipality.name} · <Stars value={amb.rating_avg} count={amb.rating_count} size="sm" /></span>
              </span>
              <span className="link small">Ver su tienda <Icon name="arrow" size={14} stroke={2.4} /></span>
            </Link>
          </div>
        </div>

        {raw.description && (
          <section className="pdp-section">
            <h2>Sobre este producto</h2>
            <div className="pdp-desc">{raw.description}</div>
            <dl className="kv pdp-specs">
              <dt>Categoría</dt><dd><Link className="link" to={`/categoria/${raw.category.slug}`}>{raw.category.name}</Link></dd>
              {raw.weight_grams && (<><dt>Peso</dt><dd>{raw.weight_grams >= 1000 ? `${raw.weight_grams / 1000} kg` : `${raw.weight_grams} g`}</dd></>)}
              <dt>Origen</dt><dd>{amb.municipality.name}, Huila</dd>
            </dl>
          </section>
        )}

        <section className="pdp-section" aria-labelledby="rv-title">
          <div className="pdp-section-head">
            <h2 id="rv-title">Reseñas</h2>
            <Stars value={raw.rating_avg} count={raw.rating_count} />
          </div>
          {reviewable.data?.length > 0 && (
            <ReviewForm productId={raw.id} items={reviewable.data} onDone={() => { qc.invalidateQueries({ queryKey: ['reviews', raw.id] }); qc.invalidateQueries({ queryKey: ['reviewable'] }); qc.invalidateQueries({ queryKey: ['product', slug] }); }} />
          )}
          {!reviews.data?.length ? (
            <p className="muted">Aún no hay reseñas. Solo pueden calificar quienes recibieron el producto.</p>
          ) : (
            <ul className="reviews">
              {reviews.data.map((r) => (
                <li key={r.id}>
                  <div><Stars value={r.rating} size="sm" /> <b>{r.author_name || 'Cliente'}</b> <span className="muted small">{longDate(r.created_at)}</span></div>
                  {r.comment && <p>{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {lines.length > 0 && box.missing > 0 && box.items.length > 0 && (
          <section className="pdp-section">
            <div className="panel upsell-panel pdp-complete">
              <h2 className="panel-title">{box.title}</h2>
              <p className="muted small">Te faltan {money(box.missing)} para el envío gratis.</p>
              <div className="upsell-list">{box.items.map((x) => <UpsellRow key={x.id} p={x} missing={box.missing} />)}</div>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="pdp-section">
            <h2>Relacionados</h2>
            <div className="grid">{related.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </section>
        )}

        {inKits.length > 0 && (
          <section className="pdp-section">
            <h2>También viene en {inKits.length === 1 ? 'este kit' : 'estos kits'}</h2>
            <div className="kit-grid">{inKits.map((k) => <KitCard key={k.id} k={k} />)}</div>
          </section>
        )}
      </div>
    </section>
  );
}
