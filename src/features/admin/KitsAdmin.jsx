import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';
import { compressImage, newName, uploadPublic } from '../ambassador-panel/images.js';
import { clean } from './kit.jsx';

const ARTS = [['ball', 'Bolsa de chocolate'], ['bar', 'Barra'], ['jar', 'Frasco'], ['achira', 'Paquete'], ['tea', 'Caja de té'], ['swim', 'Prenda']];

export function KitsList() {
  useTitle('Kits');
  const q = useQuery({
    queryKey: ['admin', 'kits'],
    queryFn: async () => {
      const [k, s] = await Promise.all([
        supabase.from('kits').select('id, sku, name, tagline, price, is_active, show_on_home, sort_order, bg_color, fg_color, mockup, badge, items:kit_items (quantity, product:products (name))').order('sort_order'),
        supabase.from('kit_summaries').select('*'),
      ]);
      if (k.error) throw k.error;
      const sum = new Map((s.data || []).map((x) => [x.kit_id, x]));
      return k.data.map((kit) => ({ ...kit, summary: sum.get(kit.id) }));
    },
  });
  return (
    <div className="pn-stack">
      <header className="pn-head pn-head-row">
        <div><h1>Kits y regalos</h1><p className="muted">Combinaciones de varios embajadores. El precio por separado y el ahorro se calculan solos.</p></div>
        <Link to="/admin/kits/nuevo" className="btn btn-green"><Icon name="gift" size={18} />Nuevo kit</Link>
      </header>
      {q.isLoading ? <div className="skeleton" style={{ height: 200 }} /> : (
        <ul className="kit-admin-list">
          {q.data.map((k) => (
            <li key={k.id} className="panel">
              <Link to={`/admin/kits/${k.id}`} className="kit-admin">
                <span className="kit-swatch" style={{ background: k.bg_color, color: k.fg_color }}>{k.name}</span>
                <div>
                  <b>{k.name}</b> <span className="sku">{k.sku}</span>
                  <span className="muted small">{k.items.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.product?.name}`).join(' · ')}</span>
                </div>
                <div className="kit-admin-price">
                  <s className="muted">{money(k.summary?.separate_price || 0)}</s> <b>{money(k.price)}</b>
                  <span className="small">Ahorro {money(k.summary?.savings || 0)}</span>
                </div>
                <div className="kit-admin-flags">
                  <span className={`pill pill-${k.is_active ? 'verde' : 'mute'}`}>{k.is_active ? 'Activo' : 'Inactivo'}</span>
                  {k.show_on_home && <span className="pill pill-ocre">En el inicio</span>}
                  {k.summary && !k.summary.is_available && k.is_active && <span className="pill pill-err">Sin stock</span>}
                </div>
              </Link>
            </li>
          ))}
          {!q.data.length && <p className="dt-empty">Aún no hay kits.</p>}
        </ul>
      )}
    </div>
  );
}

const EMPTY = { name: '', tagline: '', description: '', price: '', badge: '', bg_color: '#0B7A3B', fg_color: '#FFFFFF', art: 'ball', image_url: '', is_active: true, show_on_home: true, sort_order: 0 };

export function KitEditor() {
  const { id } = useParams();
  const isNew = !id;
  useTitle(isNew ? 'Nuevo kit' : 'Editar kit');
  const navigate = useNavigate();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState(EMPTY);
  const [items, setItems] = useState([]); // { product, quantity }
  const [search, setSearch] = useState('');
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);

  const kit = useQuery({
    queryKey: ['admin', 'kit', id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from('kits')
        .select('*, items:kit_items (quantity, sort_order, product:products (id, sku, name, price, stock, status, mockup, ambassador:ambassadors (brand_name, municipality_id), images:product_images (thumb_url, sort_order)))')
        .eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const k = kit.data;
    if (!k) return;
    setF({ name: k.name, tagline: k.tagline || '', description: k.description || '', price: String(k.price), badge: k.badge || '', bg_color: k.bg_color, fg_color: k.fg_color, art: k.mockup?.art || 'ball', image_url: k.image_url || '', is_active: k.is_active, show_on_home: k.show_on_home, sort_order: k.sort_order });
    setItems([...k.items].sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ product: i.product, quantity: i.quantity })));
  }, [kit.data]);

  const term = clean(search);
  const found = useQuery({
    queryKey: ['admin', 'kit-search', term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.from('products')
        .select('id, sku, name, price, stock, status, mockup, ambassador:ambassadors (brand_name, municipality_id), images:product_images (thumb_url, sort_order)')
        .eq('status', 'aprobado').or(`name.ilike.%${term}%,sku.ilike.%${term}%`).limit(8);
      if (error) throw error;
      return data;
    },
  });

  const separate = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const price = Number(f.price) || 0;
  const savings = Math.max(0, separate - price);
  const makers = new Set(items.map((i) => i.product.ambassador?.brand_name)).size;
  const towns = new Set(items.map((i) => i.product.ambassador?.municipality_id)).size;
  const outOfStock = items.filter((i) => i.product.stock < i.quantity || i.product.status !== 'aprobado');
  const suggested = useMemo(() => `${makers} ${makers === 1 ? 'embajador' : 'embajadores'} · ${towns} ${towns === 1 ? 'municipio' : 'municipios'}`, [makers, towns]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const add = (p) => {
    if (items.some((i) => i.product.id === p.id)) return;
    setItems((xs) => [...xs, { product: p, quantity: 1 }]);
    setSearch('');
  };

  const uploadImage = async (file) => {
    if (!file) return;
    try {
      const { blob } = await compressImage(file, { max: 1600 });
      const url = await uploadPublic('brand-assets', `kits/${newName(blob)}`, blob);
      setF((s) => ({ ...s, image_url: url }));
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setGeneral('');
    if (f.name.trim().length < 3) return setGeneral('Escribe el nombre del kit.');
    if (items.length < 2) return setGeneral('Un kit necesita al menos 2 productos.');
    if (!(price > 0)) return setGeneral('Escribe el precio del kit.');
    if (price >= separate) return setGeneral(`El precio del kit debe ser menor a la suma por separado (${money(separate)}).`);
    setBusy(true);
    try {
      const row = {
        name: f.name.trim(), tagline: f.tagline.trim() || suggested, description: f.description.trim() || null, price,
        badge: f.badge.trim() || null, bg_color: f.bg_color, fg_color: f.fg_color, mockup: { art: f.art }, image_url: f.image_url || null,
        is_active: f.is_active, show_on_home: f.show_on_home, sort_order: Number(f.sort_order) || 0,
      };
      let kitId = id;
      if (isNew) {
        const { data, error } = await supabase.from('kits').insert(row).select('id').single();
        if (error) throw error;
        kitId = data.id;
      } else {
        const { error } = await supabase.from('kits').update(row).eq('id', id);
        if (error) throw error;
        await supabase.from('kit_items').delete().eq('kit_id', id);
      }
      const { error: ie } = await supabase.from('kit_items').insert(items.map((i, n) => ({ kit_id: kitId, product_id: i.product.id, quantity: i.quantity, sort_order: n })));
      if (ie) throw ie;
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      notify(isNew ? 'Kit creado' : 'Kit guardado');
      navigate('/admin/kits');
    } catch (err) {
      setGeneral(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('¿Eliminar este kit? Los pedidos que ya lo incluyen no cambian.')) return;
    const { error } = await supabase.from('kits').delete().eq('id', id);
    if (error) return notify(friendlyError(error), 'error');
    qc.invalidateQueries({ queryKey: ['admin'] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
    navigate('/admin/kits');
  };

  if (!isNew && kit.isLoading) return <div className="skeleton" style={{ height: 400 }} />;
  const thumb = (p) => [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.thumb_url;

  return (
    <div className="pn-stack">
      <Link to="/admin/kits" className="back-link"><Icon name="arrow" size={16} stroke={2.4} /> Kits</Link>
      <header className="pn-head"><h1>{isNew ? 'Nuevo kit' : f.name}</h1>{kit.data && <span className="sku">{kit.data.sku}</span>}</header>
      <form className="pe-grid" onSubmit={save} noValidate>
        <div className="pe-main">
          <section className="panel form">
            <h2 className="panel-title">Productos del kit</h2>
            <label className="pn-search"><Icon name="search" size={18} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Busca un producto publicado por nombre o SKU" aria-label="Buscar producto" /></label>
            {term.length >= 2 && (
              <ul className="picker">
                {(found.data || []).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => add(p)} disabled={items.some((i) => i.product.id === p.id)}>
                      {thumb(p) ? <img src={thumb(p)} alt="" width="40" height="40" /> : <span className="dt-noimg"><Icon name="bag" size={16} /></span>}
                      <span><b>{p.name}</b><span className="muted small">{p.ambassador?.brand_name} · {money(p.price)} · {p.stock} en stock</span></span>
                      <Icon name="arrow" size={16} />
                    </button>
                  </li>
                ))}
                {found.data && !found.data.length && <li className="muted small">Sin resultados.</li>}
              </ul>
            )}
            <ul className="kit-items">
              {items.map((i, n) => (
                <li key={i.product.id}>
                  <div><b>{i.product.name}</b><span className="muted small">{i.product.ambassador?.brand_name} · {money(i.product.price)}{i.product.stock < i.quantity ? ' · sin stock suficiente' : ''}</span></div>
                  <span className="qty">
                    <button type="button" aria-label="Quitar uno" onClick={() => setItems((xs) => xs.map((x, j) => (j === n ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}>−</button>
                    <span>{i.quantity}</span>
                    <button type="button" aria-label="Agregar uno" onClick={() => setItems((xs) => xs.map((x, j) => (j === n ? { ...x, quantity: x.quantity + 1 } : x)))}>+</button>
                  </span>
                  <button type="button" className="icon-btn" aria-label="Quitar del kit" onClick={() => setItems((xs) => xs.filter((_, j) => j !== n))}><Icon name="close" size={18} /></button>
                </li>
              ))}
              {!items.length && <li className="muted small">Agrega al menos 2 productos.</li>}
            </ul>
          </section>
          <section className="panel form">
            <h2 className="panel-title">Presentación</h2>
            <div className="form-2">
              <Field id="kt-name" label="Nombre"><input id="kt-name" value={f.name} onChange={set('name')} placeholder="Ruta del Cacao" /></Field>
              <Field id="kt-tag" label="Subtítulo" optional hint={`Vacío = “${suggested}”`}><input id="kt-tag" value={f.tagline} onChange={set('tagline')} /></Field>
              <Field id="kt-badge" label="Cinta" optional hint="Ej.: El más regalado"><input id="kt-badge" value={f.badge} onChange={set('badge')} /></Field>
              <Field id="kt-art" label="Ilustración"><select id="kt-art" value={f.art} onChange={set('art')}>{ARTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field id="kt-bg" label="Color de fondo"><input id="kt-bg" type="color" value={f.bg_color} onChange={set('bg_color')} /></Field>
              <Field id="kt-fg" label="Color del texto"><input id="kt-fg" type="color" value={f.fg_color} onChange={set('fg_color')} /></Field>
            </div>
            <Field id="kt-desc" label="Descripción" optional><textarea id="kt-desc" rows={3} value={f.description} onChange={set('description')} /></Field>
            <div className="field"><span className="field-label">Foto del kit (opcional)</span>
              <label className="upload-btn">{f.image_url ? <img src={f.image_url} alt="" width="72" height="48" /> : <Icon name="gift" size={22} />}<span>{f.image_url ? 'Cambiar foto' : 'Subir foto'}</span><input type="file" accept="image/*" hidden onChange={(e) => uploadImage(e.target.files[0])} /></label>
            </div>
          </section>
        </div>
        <aside className="pe-side">
          <section className="panel form">
            <div className="kit-preview" style={{ background: f.bg_color, color: f.fg_color }}>
              {f.badge && <span className="kit-ribbon">{f.badge}</span>}
              <b>{f.name || 'Nombre del kit'}</b>
              <div className="kit-preview-art">{items.slice(0, 3).map((i) => <span key={i.product.id}><ProductArt art={i.product.mockup?.art} artLabel={i.product.mockup?.label} colors={i.product.mockup?.colors || ['#F5F3EE', '#0B7A3B']} maker={i.product.ambassador?.brand_name} /></span>)}</div>
            </div>
            <Field id="kt-price" label="Precio del kit (COP)"><input id="kt-price" inputMode="numeric" value={f.price} onChange={set('price')} /></Field>
            <dl className="totals">
              <dt>Por separado</dt><dd>{money(separate)}</dd>
              <dt>Precio del kit</dt><dd>{money(price)}</dd>
              <dt className="total">Ahorro del cliente</dt><dd className="total ok">{money(savings)}{separate ? ` (${Math.round((savings / separate) * 100)}%)` : ''}</dd>
            </dl>
            {outOfStock.length > 0 && <p className="notice notice-error">Sin stock suficiente: {outOfStock.map((i) => i.product.name).join(', ')}. El kit no se podrá comprar.</p>}
            <label className="check"><input type="checkbox" checked={f.is_active} onChange={set('is_active')} /><span>Activo (se puede comprar)</span></label>
            <label className="check"><input type="checkbox" checked={f.show_on_home} onChange={set('show_on_home')} /><span>Mostrar en el inicio</span></label>
            <Field id="kt-order" label="Orden en el inicio"><input id="kt-order" inputMode="numeric" value={f.sort_order} onChange={set('sort_order')} /></Field>
          </section>
          <div className="pe-actions">
            <FormNotice>{general}</FormNotice>
            <button type="submit" className="btn btn-green btn-block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar kit'}</button>
            {!isNew && <button type="button" className="link-btn danger" onClick={remove}>Eliminar kit</button>}
          </div>
        </aside>
      </form>
    </div>
  );
}
