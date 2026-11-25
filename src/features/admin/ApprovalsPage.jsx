import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { dateTime, money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Field } from '../auth/AuthShell.jsx';
import { Modal } from './kit.jsx';

export default function ApprovalsPage() {
  useTitle('Aprobaciones');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [reject, setReject] = useState(null); // { ids: [], reason }
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ['admin', 'approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`id, sku, name, short_description, description, price, compare_at_price, stock, weight_grams, is_age_restricted, mockup, updated_at, approved_at,
                 category:categories (name), ambassador:ambassadors (brand_name, code, municipality:municipalities (name)),
                 images:product_images (url, thumb_url, sort_order), variants:product_variants (sku, name, price_override, stock)`)
        .eq('status', 'pendiente')
        .order('updated_at');
      if (error) throw error;
      return data;
    },
  });

  const done = (msg) => {
    qc.invalidateQueries({ queryKey: ['admin'] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
    setSelected(new Set());
    notify(msg);
  };

  const approve = async (ids) => {
    setBusy(true);
    const { error } = await supabase.from('products').update({ status: 'aprobado' }).in('id', ids);
    setBusy(false);
    if (error) return notify(friendlyError(error), 'error');
    done(ids.length === 1 ? 'Producto aprobado: ya está en la tienda' : `${ids.length} productos aprobados`);
  };

  const confirmReject = async () => {
    if (!reject.reason.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('products').update({ status: 'rechazado', rejection_reason: reject.reason.trim() }).in('id', reject.ids);
    setBusy(false);
    if (error) return notify(friendlyError(error), 'error');
    setReject(null);
    done(reject.ids.length === 1 ? 'Producto rechazado: el embajador verá el motivo' : `${reject.ids.length} productos rechazados`);
  };

  const list = q.data || [];
  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="pn-stack">
      <header className="pn-head pn-head-row">
        <div><h1>Aprobaciones</h1><p className="muted">Productos nuevos o con cambios en nombre, precio, descripción, categoría o fotos.</p></div>
      </header>

      {list.length > 0 && (
        <div className="bulk-bar">
          <label className="check"><input type="checkbox" checked={selected.size === list.length} onChange={(e) => setSelected(e.target.checked ? new Set(list.map((p) => p.id)) : new Set())} /><span>Seleccionar todos ({list.length})</span></label>
          {selected.size > 0 && (
            <div className="form-actions">
              <button type="button" className="btn btn-green btn-sm" disabled={busy} onClick={() => approve([...selected])}>Aprobar {selected.size}</button>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setReject({ ids: [...selected], reason: '' })}>Rechazar {selected.size}</button>
            </div>
          )}
        </div>
      )}

      {q.isLoading ? (
        <div className="skeleton-list">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}</div>
      ) : !list.length ? (
        <div className="empty"><Icon name="check" size={40} stroke={1.6} /><b>No hay productos por revisar</b><p>Cuando un embajador suba o cambie un producto, aparecerá aquí.</p></div>
      ) : (
        <ul className="appr-list">
          {list.map((p) => {
            const imgs = [...p.images].sort((a, b) => a.sort_order - b.sort_order);
            return (
              <li key={p.id} className={`panel appr${selected.has(p.id) ? ' is-selected' : ''}`}>
                <label className="appr-check"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Seleccionar ${p.name}`} /></label>
                <div className="appr-gallery">
                  {imgs.length ? imgs.slice(0, 4).map((im, i) => (
                    <a key={im.url} href={im.url} target="_blank" rel="noreferrer" className={i === 0 ? 'cover' : ''}><img src={im.thumb_url || im.url} alt={`Foto ${i + 1} de ${p.name}`} loading="lazy" /></a>
                  )) : p.mockup ? <div className="cover"><ProductArt art={p.mockup.art} artLabel={p.mockup.label} colors={p.mockup.colors || ['#F5F3EE', '#0B7A3B']} maker={p.ambassador?.brand_name} /></div>
                    : <div className="cover appr-nophoto"><Icon name="gift" size={28} stroke={1.6} /><span>Sin fotos</span></div>}
                </div>
                <div className="appr-body">
                  <span className="muted small">{p.ambassador?.brand_name} · {p.ambassador?.municipality?.name} · {p.category?.name}</span>
                  <h2>{p.name}</h2>
                  <p className="prod-meta"><span className="sku">{p.sku}</span>{p.approved_at ? <span className="tag">Cambios en un producto ya publicado</span> : <span className="tag">Producto nuevo</span>}{p.is_age_restricted && <span className="tag">+18</span>}</p>
                  {p.short_description && <p>{p.short_description}</p>}
                  {p.description && <details><summary className="link-btn">Ver descripción</summary><p className="appr-desc">{p.description}</p></details>}
                  <dl className="appr-facts">
                    <div><dt>Precio</dt><dd>{p.compare_at_price && <s>{money(p.compare_at_price)}</s>} {money(p.price)}</dd></div>
                    <div><dt>Stock</dt><dd>{p.stock}</dd></div>
                    {p.weight_grams && <div><dt>Peso</dt><dd>{p.weight_grams} g</dd></div>}
                    {p.variants.length > 0 && <div><dt>Variantes</dt><dd>{p.variants.map((v) => `${v.name}${v.price_override ? ` (${money(v.price_override)})` : ''}`).join(' · ')}</dd></div>}
                    <div><dt>Enviado</dt><dd>{dateTime(p.updated_at)}</dd></div>
                  </dl>
                </div>
                <div className="appr-actions">
                  <button type="button" className="btn btn-green" disabled={busy} onClick={() => approve([p.id])}><Icon name="check" size={18} stroke={2.6} />Aprobar</button>
                  <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setReject({ ids: [p.id], reason: '' })}>Rechazar</button>
                  <Link to={`/admin/productos/${p.id}`} className="link-btn">Editar antes de aprobar</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!reject} onClose={() => setReject(null)} title={reject?.ids.length > 1 ? `Rechazar ${reject.ids.length} productos` : 'Rechazar producto'}>
        {reject && (
          <form className="form" onSubmit={(e) => { e.preventDefault(); confirmReject(); }}>
            <Field id="rej-reason" label="¿Qué debe corregir el embajador?" hint="Lo verá en su panel. Sé concreto: la foto, el nombre, el precio…">
              <textarea id="rej-reason" rows={4} value={reject.reason} onChange={(e) => setReject({ ...reject, reason: e.target.value })} required autoFocus />
            </Field>
            <div className="form-actions">
              <button type="submit" className="btn btn-green" disabled={busy || !reject.reason.trim()}>Rechazar con este motivo</button>
              <button type="button" className="btn btn-outline" onClick={() => setReject(null)}>Cancelar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
