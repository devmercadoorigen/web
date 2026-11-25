import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { PRODUCT_STATUS, ProductStatus } from './usePanel.jsx';

const FILTERS = [['todos', 'Todos'], ['aprobado', 'Publicados'], ['pendiente', 'En revisión'], ['rechazado', 'Rechazados'], ['borrador', 'Borradores'], ['inactivo', 'Pausados']];

export function useMyProducts(ambassadorId) {
  return useQuery({
    queryKey: ['my-products', ambassadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, name, price, stock, status, rejection_reason, sales_count, updated_at, mockup, category:categories (name), images:product_images (thumb_url, url, sort_order)')
        .eq('ambassador_id', ambassadorId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

const thumbOf = (p) => [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];

export default function ProductsPage() {
  useTitle('Mis productos');
  const { amb } = useOutletContext();
  const { notify } = useToast();
  const qc = useQueryClient();
  const q = useMyProducts(amb.id);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['my-products'] });
    qc.invalidateQueries({ queryKey: ['amb-dashboard'] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
  };

  const pause = useMutation({
    mutationFn: async ({ id, paused }) => {
      const { data, error } = await supabase.rpc('ambassador_set_paused', { p_product_id: id, p_paused: paused });
      if (error) throw error;
      return data;
    },
    onSuccess: (status) => {
      refresh();
      notify(status === 'inactivo' ? 'Producto pausado: ya no aparece en la tienda' : status === 'aprobado' ? 'Producto publicado de nuevo' : 'Cambiaste el producto mientras estaba pausado: quedó en revisión');
    },
    onError: (e) => notify(friendlyError(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error, count } = await supabase.from('products').delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      if (!count) throw new Error('Solo puedes borrar borradores o productos rechazados sin ventas.');
    },
    onSuccess: () => { refresh(); notify('Producto eliminado'); },
    onError: (e) => notify(e.message || friendlyError(e), 'error'),
  });

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data || []).filter((p) => (filter === 'todos' || p.status === filter) && (!s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)));
  }, [q.data, filter, search]);
  const counts = useMemo(() => (q.data || []).reduce((m, p) => ({ ...m, [p.status]: (m[p.status] || 0) + 1 }), {}), [q.data]);

  return (
    <div className="pn-stack">
      <header className="pn-head pn-head-row">
        <div>
          <h1>Mis productos</h1>
          <p className="muted">Cada producto nuevo o cambio importante lo revisa Mercado Origen antes de publicarse.</p>
        </div>
        <Link to="/panel/productos/nuevo" className="btn btn-green"><Icon name="bag" size={18} />Subir producto</Link>
      </header>

      <div className="pn-toolbar">
        <label className="pn-search">
          <Icon name="search" size={18} />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o SKU" aria-label="Buscar por nombre o SKU" />
        </label>
        <div className="chips" role="tablist" aria-label="Filtrar por estado">
          {FILTERS.map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={filter === v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>
              {l}{v !== 'todos' && counts[v] ? <em>{counts[v]}</em> : null}
            </button>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <div className="skeleton-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 88 }} />)}</div>
      ) : !q.data?.length ? (
        <div className="empty">
          <Icon name="bag" size={40} stroke={1.6} />
          <b>Aún no tienes productos</b>
          <p>Sube el primero con buenas fotos: es lo que más vende en la tienda.</p>
          <Link className="btn btn-green" to="/panel/productos/nuevo">Subir mi primer producto</Link>
        </div>
      ) : !list.length ? (
        <p className="muted">No hay productos con ese filtro.</p>
      ) : (
        <ul className="prod-list">
          {list.map((p) => {
            const t = thumbOf(p);
            return (
              <li key={p.id} className="prod-row">
                <Link to={`/panel/productos/${p.id}`} className="prod-thumb" aria-label={`Editar ${p.name}`}>
                  {t ? <img src={t.thumb_url || t.url} alt="" width="72" height="72" loading="lazy" /> : <ProductArt art={p.mockup?.art} artLabel={p.mockup?.label} colors={p.mockup?.colors || ['#F5F3EE', '#0B7A3B']} maker={amb.brand_name} />}
                </Link>
                <div className="prod-info">
                  <Link to={`/panel/productos/${p.id}`} className="prod-name">{p.name}</Link>
                  <span className="prod-meta"><span className="sku">{p.sku}</span>{p.category?.name}</span>
                  {p.status === 'rechazado' && p.rejection_reason && <span className="prod-reason"><b>Motivo:</b> {p.rejection_reason}</span>}
                </div>
                <div className="prod-nums">
                  <b>{money(p.price)}</b>
                  <span className={p.stock <= 3 ? 'low' : ''}>{p.stock} en stock</span>
                </div>
                <ProductStatus status={p.status} />
                <div className="prod-actions">
                  <Link to={`/panel/productos/${p.id}`} className="link-btn">{p.status === 'rechazado' ? 'Corregir' : 'Editar'}</Link>
                  {p.status === 'aprobado' && <button type="button" className="link-btn" onClick={() => pause.mutate({ id: p.id, paused: true })}>Pausar</button>}
                  {p.status === 'inactivo' && <button type="button" className="link-btn" onClick={() => pause.mutate({ id: p.id, paused: false })}>Reactivar</button>}
                  {['borrador', 'rechazado'].includes(p.status) && !p.sales_count && (
                    <button type="button" className="link-btn danger" onClick={() => window.confirm(`¿Eliminar "${p.name}"? No se puede deshacer.`) && remove.mutate(p.id)}>Eliminar</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted small">Estados: {Object.values(PRODUCT_STATUS).map((s) => s.label).join(' · ')}.</p>
    </div>
  );
}
