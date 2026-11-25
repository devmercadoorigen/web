import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';
import { ImageManager } from './ImageManager.jsx';
import { newName, pathFromPublicUrl, uploadPublic } from './images.js';
import { PRODUCT_STATUS, ProductStatus } from './usePanel.jsx';

const EMPTY = {
  name: '', category_id: '', short_description: '', description: '', price: '', compare_at_price: '',
  stock: '', weight_grams: '', is_age_restricted: false,
};

const toInt = (v) => (v === '' || v === null || v === undefined ? null : Math.round(Number(String(v).replace(/[^\d]/g, ''))));

/** Validación del formulario (mensajes en español, mismas reglas que la base). */
export function validateProduct(f, images, variants, hasMockup = false) {
  const e = {};
  if (f.name.trim().length < 3) e.name = 'Escribe un nombre de al menos 3 letras.';
  else if (f.name.trim().length > 160) e.name = 'Máximo 160 caracteres.';
  if (!f.category_id) e.category_id = 'Elige la categoría.';
  if (f.short_description.length > 280) e.short_description = 'Máximo 280 caracteres.';
  const price = toInt(f.price);
  if (!price || price < 500) e.price = 'Escribe el precio en pesos (mínimo $500).';
  const compare = toInt(f.compare_at_price);
  if (compare !== null && compare <= (price || 0)) e.compare_at_price = 'El precio antes debe ser mayor al precio actual.';
  const stock = toInt(f.stock);
  if (stock === null || stock < 0) e.stock = 'Escribe cuántas unidades tienes (puede ser 0).';
  if (f.weight_grams !== '' && !(toInt(f.weight_grams) > 0)) e.weight_grams = 'Escribe el peso en gramos.';
  // Los productos del catálogo inicial usan la ilustración del empaque mientras llega la foto real.
  if (!images.length && !hasMockup) e.images = 'Sube al menos una foto del producto.';
  const suffixes = new Set();
  variants.forEach((v, i) => {
    if (!v.name.trim()) e[`v${i}`] = 'Escribe el nombre de la variante.';
    else if (!/^[A-Za-z0-9]{1,12}$/.test(v.sku_suffix)) e[`v${i}`] = 'El código debe tener solo letras y números (máx. 12).';
    else if (suffixes.has(v.sku_suffix.toUpperCase())) e[`v${i}`] = 'Ese código de variante está repetido.';
    else if (v.price_override !== '' && !(toInt(v.price_override) >= 500)) e[`v${i}`] = 'Revisa el precio de la variante.';
    suffixes.add(v.sku_suffix.toUpperCase());
  });
  return e;
}

const NOTICE = {
  borrador: ['mute', 'Borrador: solo tú lo ves. Envíalo a revisión cuando esté listo.'],
  pendiente: ['ocre', 'En revisión por Mercado Origen. Te avisamos cuando quede publicado.'],
  aprobado: ['verde', 'Publicado. Si cambias el nombre, el precio, la descripción, la categoría o las fotos, vuelve a revisión antes de mostrarse.'],
  inactivo: ['mute', 'Pausado: no aparece en la tienda. Si cambias su contenido, al reactivarlo pasará por revisión.'],
};

/** Ruta del panel del embajador. */
export default function ProductEditor() {
  const { id } = useParams();
  const { amb } = useOutletContext();
  return <ProductForm amb={amb} id={id} backTo="/panel/productos" />;
}

const parseBadges = (s) => s.split(',').map((b) => b.trim()).filter(Boolean).slice(0, 4);

/**
 * Formulario de producto. Lo usan el embajador (sus productos) y el admin
 * (cualquier producto, con estado, insignias, destacado y SKU).
 */
export function ProductForm({ amb, id, backTo, admin = false }) {
  const isNew = !id;
  useTitle(isNew ? 'Subir producto' : 'Editar producto');
  const { notify } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adminF, setAdminF] = useState({ status: 'aprobado', rejection_reason: '', badges: '', is_featured: false });

  const [f, setF] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [original, setOriginal] = useState({ images: [], variants: [] });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);

  const categories = useQuery({
    queryKey: ['categories-all'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('id, name, code').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const product = useQuery({
    queryKey: ['my-product', id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, images:product_images (id, url, thumb_url, alt, width, height, sort_order), variants:product_variants (id, sku, sku_suffix, name, price_override, stock, sort_order)')
        .eq('id', id)
        .eq('ambassador_id', amb.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const p = product.data;
    if (!p) return;
    setF({
      name: p.name, category_id: p.category_id, short_description: p.short_description || '', description: p.description || '',
      price: String(p.price), compare_at_price: p.compare_at_price ? String(p.compare_at_price) : '', stock: String(p.stock),
      weight_grams: p.weight_grams ? String(p.weight_grams) : '', is_age_restricted: p.is_age_restricted,
    });
    const imgs = [...p.images].sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ ...i, key: i.id }));
    const vars = [...p.variants].sort((a, b) => a.sort_order - b.sort_order).map((v) => ({ ...v, key: v.id, price_override: v.price_override ? String(v.price_override) : '', stock: String(v.stock) }));
    setImages(imgs);
    setVariants(vars);
    setOriginal({ images: imgs, variants: vars });
    setAdminF({ status: p.status, rejection_reason: p.rejection_reason || '', badges: (p.badges || []).join(', '), is_featured: p.is_featured });
  }, [product.data]);

  if (!isNew && product.isLoading) return <div className="skeleton" style={{ height: 480 }} />;
  if (!isNew && !product.data) {
    return (
      <div className="empty">
        <Icon name="bag" size={40} stroke={1.6} />
        <b>No encontramos este producto</b>
        <Link to={backTo} className="btn btn-green">Volver a los productos</Link>
      </div>
    );
  }

  const regenerateSku = async () => {
    if (!window.confirm('¿Regenerar el SKU? El anterior deja de servir para buscar este producto (queda en la auditoría).')) return;
    const { data, error } = await supabase.rpc('admin_regenerate_sku', { p_product_id: id });
    if (error) return notify(friendlyError(error), 'error');
    qc.invalidateQueries({ queryKey: ['my-product', id] });
    notify(`Nuevo SKU: ${data}`);
  };

  const status = product.data?.status ?? 'borrador';
  // Al corregir un campo, su error desaparece de inmediato.
  const clearError = (k) => setErrors((er) => {
    if (!er[k]) return er;
    const { [k]: _gone, ...rest } = er;
    return rest;
  });
  const set = (k) => (e) => {
    setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    clearError(k);
  };
  const errProps = (k) => ({ 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? `pe-${k}-err` : undefined });

  /** mode: 'draft' (guardar borrador) | 'submit' (enviar a revisión) | 'save' (guardar cambios) */
  const save = async (mode) => {
    setGeneral('');
    const e = validateProduct(f, images, variants, !!product.data?.mockup);
    // Un borrador puede guardarse incompleto, salvo lo mínimo para crearlo.
    if (admin && adminF.status === 'rechazado' && !adminF.rejection_reason.trim()) e.rejection_reason = 'Escribe el motivo para que el embajador sepa qué corregir.';
    const blocking = mode === 'draft' ? Object.fromEntries(Object.entries(e).filter(([k]) => ['name', 'category_id', 'price', 'stock'].includes(k))) : e;
    setErrors(blocking);
    if (Object.keys(blocking).length) {
      document.getElementById(`pe-${Object.keys(blocking)[0]}`)?.focus();
      return setGeneral('Revisa los campos marcados.');
    }
    setBusy(true);
    try {
      const row = {
        name: f.name.trim(), category_id: f.category_id, short_description: f.short_description.trim() || null,
        description: f.description.trim() || null, price: toInt(f.price), compare_at_price: toInt(f.compare_at_price),
        stock: toInt(f.stock), weight_grams: toInt(f.weight_grams), is_age_restricted: f.is_age_restricted,
      };
      if (admin) {
        Object.assign(row, {
          badges: parseBadges(adminF.badges),
          is_featured: adminF.is_featured,
          status: adminF.status,
          rejection_reason: adminF.status === 'rechazado' ? adminF.rejection_reason.trim() : null,
        });
      }
      let productId = id;
      if (isNew) {
        const { data, error } = await supabase.from('products')
          .insert({ status: mode === 'submit' ? 'pendiente' : 'borrador', ...row, ambassador_id: amb.id })
          .select('id').single();
        if (error) throw error;
        productId = data.id;
      } else {
        const next = !admin && mode === 'submit' && ['borrador', 'rechazado'].includes(status) ? { status: 'pendiente' } : {};
        const { error } = await supabase.from('products').update({ ...row, ...next }).eq('id', id);
        if (error) throw error;
      }

      // Fotos: borrar las quitadas, subir las nuevas, guardar el orden
      const keep = new Set(images.filter((i) => i.id).map((i) => i.id));
      const removed = original.images.filter((i) => !keep.has(i.id));
      if (removed.length) {
        await supabase.from('product_images').delete().in('id', removed.map((i) => i.id));
        const paths = removed.flatMap((i) => [pathFromPublicUrl(i.url, 'product-images'), pathFromPublicUrl(i.thumb_url, 'product-images')]).filter(Boolean);
        if (paths.length) await supabase.storage.from('product-images').remove(paths);
      }
      for (const [i, img] of images.entries()) {
        if (img.blob) {
          const base = `${amb.id}/${productId}`;
          const url = await uploadPublic('product-images', `${base}/${newName(img.blob)}`, img.blob);
          const thumb = await uploadPublic('product-images', `${base}/${newName(img.thumbBlob, '-thumb')}`, img.thumbBlob);
          const { error } = await supabase.from('product_images').insert({ product_id: productId, url, thumb_url: thumb, alt: f.name.trim(), width: img.width, height: img.height, sort_order: i });
          if (error) throw error;
        } else if (original.images.findIndex((o) => o.id === img.id) !== i) {
          await supabase.from('product_images').update({ sort_order: i }).eq('id', img.id);
        }
      }

      // Variantes
      const keepV = new Set(variants.filter((v) => v.id).map((v) => v.id));
      const removedV = original.variants.filter((v) => !keepV.has(v.id));
      if (removedV.length) await supabase.from('product_variants').delete().in('id', removedV.map((v) => v.id));
      for (const [i, v] of variants.entries()) {
        const vr = { name: v.name.trim(), sku_suffix: v.sku_suffix.toUpperCase(), price_override: toInt(v.price_override), stock: toInt(v.stock) ?? 0, sort_order: i };
        const { error } = v.id
          ? await supabase.from('product_variants').update(vr).eq('id', v.id)
          : await supabase.from('product_variants').insert({ ...vr, product_id: productId });
        if (error) throw error;
      }

      const { data: after } = await supabase.from('products').select('status').eq('id', productId).single();
      qc.invalidateQueries({ queryKey: ['my-products'] });
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['my-product', productId] });
      qc.invalidateQueries({ queryKey: ['amb-dashboard'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      notify(
        after?.status === 'pendiente' ? 'Listo: quedó en revisión por Mercado Origen'
        : after?.status === 'borrador' ? 'Borrador guardado'
        : 'Cambios guardados'
      );
      navigate(backTo);
    } catch (err) {
      setGeneral(err.message && !err.code ? err.message : friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const notice = NOTICE[status];
  const price = toInt(f.price);
  const compare = toInt(f.compare_at_price);

  return (
    <div className="pn-stack">
      <Link to={backTo} className="back-link"><Icon name="arrow" size={16} stroke={2.4} /> {admin ? 'Productos' : 'Mis productos'}</Link>
      <header className="pn-head pn-head-row">
        <div>
          <h1>{isNew ? 'Subir producto' : f.name || 'Editar producto'}</h1>
          {!isNew && <p className="prod-meta"><span className="sku">{product.data.sku}</span><ProductStatus status={status} /></p>}
        </div>
      </header>

      {status === 'rechazado' ? (
        <div className="notice notice-error"><Icon name="close" size={18} stroke={2.4} /><div><b>Mercado Origen pidió cambios:</b> {product.data.rejection_reason} <br />Corrige y vuelve a enviarlo a revisión.</div></div>
      ) : notice && !isNew ? (
        <div className={`notice notice-${notice[0] === 'verde' ? 'ok' : 'mute'}`}><Icon name="leaf" size={18} /><div>{notice[1]}</div></div>
      ) : null}

      <form className="pe-grid" noValidate onSubmit={(e) => { e.preventDefault(); save(!admin && (isNew || ['borrador', 'rechazado'].includes(status)) ? 'submit' : 'save'); }}>
        <div className="pe-main">
          <section className="panel form">
            <h2 className="panel-title">Fotos</h2>
            <ImageManager images={images} onChange={(v) => { setImages(v); clearError('images'); }} onError={(m) => notify(m, 'error')} />
            {errors.images && <span className="field-error" role="alert">{errors.images}</span>}
          </section>

          <section className="panel form">
            <h2 className="panel-title">Información</h2>
            <Field id="pe-name" label="Nombre del producto" hint="Qué es, presentación y lo que lo hace único. Ej.: Chocolate de mesa 100% cacao · 500 g" error={errors.name}>
              <input id="pe-name" value={f.name} onChange={set('name')} maxLength={160} {...errProps('name')} />
            </Field>
            <Field id="pe-category_id" label="Categoría" error={errors.category_id}>
              <select id="pe-category_id" value={f.category_id} onChange={set('category_id')} {...errProps('category_id')}>
                <option value="">Elige…</option>
                {(categories.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field id="pe-short_description" label="Resumen" optional hint={`Aparece en la tarjeta del producto · ${f.short_description.length}/280`} error={errors.short_description}>
              <input id="pe-short_description" value={f.short_description} onChange={set('short_description')} maxLength={280} {...errProps('short_description')} />
            </Field>
            <Field id="pe-description" label="Descripción" optional hint="Ingredientes, proceso, cómo se usa, de qué finca o taller viene.">
              <textarea id="pe-description" rows={6} value={f.description} onChange={set('description')} />
            </Field>
          </section>

          <section className="panel form">
            <h2 className="panel-title">Variantes <span className="field-opt">(opcional)</span></h2>
            <p className="muted small">Úsalas si el mismo producto viene en varias presentaciones (250 g, 500 g, 1 kg). Cada una lleva su propio SKU.</p>
            {variants.map((v, i) => (
              <div key={v.key} className="variant-row">
                <Field id={`pv-name-${i}`} label="Presentación"><input id={`pv-name-${i}`} value={v.name} placeholder="1 kg en bolitas" onChange={(e) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></Field>
                <Field id={`pv-suf-${i}`} label="Código"><input id={`pv-suf-${i}`} value={v.sku_suffix} placeholder="1KG" maxLength={12} onChange={(e) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, sku_suffix: e.target.value.toUpperCase() } : x)))} /></Field>
                <Field id={`pv-price-${i}`} label="Precio"><input id={`pv-price-${i}`} inputMode="numeric" value={v.price_override} placeholder="Igual" onChange={(e) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, price_override: e.target.value } : x)))} /></Field>
                <Field id={`pv-stock-${i}`} label="Stock"><input id={`pv-stock-${i}`} inputMode="numeric" value={v.stock} onChange={(e) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, stock: e.target.value } : x)))} /></Field>
                <button type="button" className="icon-btn" aria-label="Quitar variante" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}><Icon name="close" size={18} /></button>
                {errors[`v${i}`] && <span className="field-error variant-err" role="alert">{errors[`v${i}`]}</span>}
                {v.sku && <span className="sku variant-sku">{v.sku}</span>}
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setVariants((vs) => [...vs, { key: crypto.randomUUID(), name: '', sku_suffix: '', price_override: '', stock: '0' }])}>
              Agregar variante
            </button>
          </section>
        </div>

        <aside className="pe-side">
          <section className="panel form">
            <h2 className="panel-title">Precio y stock</h2>
            <Field id="pe-price" label="Precio de venta (COP)" error={errors.price}>
              <input id="pe-price" inputMode="numeric" value={f.price} onChange={set('price')} placeholder="25000" {...errProps('price')} />
            </Field>
            <Field id="pe-compare_at_price" label="Precio antes" optional hint="Si está en oferta, se muestra tachado." error={errors.compare_at_price}>
              <input id="pe-compare_at_price" inputMode="numeric" value={f.compare_at_price} onChange={set('compare_at_price')} {...errProps('compare_at_price')} />
            </Field>
            {price > 0 && <p className="price-preview">{compare > price && <s>{money(compare)}</s>} <b>{money(price)}</b></p>}
            <div className="form-2">
              <Field id="pe-stock" label="Unidades" error={errors.stock}>
                <input id="pe-stock" inputMode="numeric" value={f.stock} onChange={set('stock')} {...errProps('stock')} />
              </Field>
              <Field id="pe-weight_grams" label="Peso (g)" optional error={errors.weight_grams}>
                <input id="pe-weight_grams" inputMode="numeric" value={f.weight_grams} onChange={set('weight_grams')} {...errProps('weight_grams')} />
              </Field>
            </div>
            <label className="check">
              <input type="checkbox" checked={f.is_age_restricted} onChange={set('is_age_restricted')} disabled={!admin && product.data?.is_age_restricted} />
              <span>Es una bebida alcohólica (solo para mayores de 18)</span>
            </label>
            {product.data?.badges?.length > 0 && (
              <p className="small muted">Insignias de Mercado Origen: {product.data.badges.join(' · ')}</p>
            )}
          </section>

          {admin && (
            <section className="panel form admin-box">
              <h2 className="panel-title">Control de Mercado Origen</h2>
              <Field id="pe-status" label="Estado">
                <select id="pe-status" value={adminF.status} onChange={(e) => setAdminF((a) => ({ ...a, status: e.target.value }))}>
                  {Object.entries(PRODUCT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                </select>
              </Field>
              {adminF.status === 'rechazado' && (
                <Field id="pe-rejection_reason" label="Motivo del rechazo" hint="El embajador lo verá en su panel." error={errors.rejection_reason}>
                  <textarea id="pe-rejection_reason" rows={3} value={adminF.rejection_reason} onChange={(e) => setAdminF((a) => ({ ...a, rejection_reason: e.target.value }))} />
                </Field>
              )}
              <Field id="pe-badges" label="Insignias" optional hint="Separadas por coma (máx. 4): Ganador FICCA 2024, Más vendido">
                <input id="pe-badges" value={adminF.badges} onChange={(e) => setAdminF((a) => ({ ...a, badges: e.target.value }))} />
              </Field>
              <label className="check">
                <input type="checkbox" checked={adminF.is_featured} onChange={(e) => setAdminF((a) => ({ ...a, is_featured: e.target.checked }))} />
                <span>Destacar en el inicio (tarjetas del hero)</span>
              </label>
              {!isNew && <button type="button" className="btn btn-outline btn-sm" onClick={regenerateSku}>Regenerar SKU</button>}
            </section>
          )}

          <div className="pe-actions">
            <FormNotice>{general}</FormNotice>
            {!admin && (isNew || ['borrador', 'rechazado'].includes(status)) ? (
              <>
                <button type="submit" className="btn btn-green btn-block" disabled={busy}>{busy ? 'Guardando…' : status === 'rechazado' ? 'Reenviar a revisión' : 'Enviar a revisión'}</button>
                <button type="button" className="btn btn-outline btn-block" disabled={busy} onClick={() => save('draft')}>Guardar borrador</button>
              </>
            ) : (
              <button type="submit" className="btn btn-green btn-block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
            )}
            <p className="muted small center">Mercado Origen revisa cada producto antes de publicarlo, normalmente en menos de 48 horas.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
