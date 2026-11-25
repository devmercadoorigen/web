import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { PRODUCT_STATUS, ProductStatus } from '../ambassador-panel/usePanel.jsx';
import { ProductForm } from '../ambassador-panel/ProductEditor.jsx';
import { DataTable, useServerTable } from './kit.jsx';

export function useLookups() {
  return useQuery({
    queryKey: ['admin', 'lookups'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [c, a, m] = await Promise.all([
        supabase.from('categories').select('id, name, code').order('sort_order'),
        supabase.from('ambassadors').select('id, brand_name, code, status').order('brand_name'),
        supabase.from('municipalities').select('id, name, subregion:subregions (name, sort_order)').order('sort_order'),
      ]);
      return {
        categories: c.data || [],
        ambassadors: a.data || [],
        municipalities: (m.data || []).sort((x, y) => x.subregion.sort_order - y.subregion.sort_order),
      };
    },
  });
}

export function ProductsList() {
  useTitle('Productos');
  const [params] = useSearchParams();
  const lk = useLookups();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const table = useServerTable({
    key: ['products'],
    initialSort: { col: 'updated_at', asc: false },
    initialFilters: { stock: params.get('stock') || undefined, ambassador: params.get('embajador') || undefined },
    query: ({ search, filters, sort, from, to }) => {
      let q = supabase.from('products').select('id, sku, name, price, stock, status, is_featured, sales_count, updated_at, ambassador:ambassadors (brand_name), category:categories (name), images:product_images (thumb_url, sort_order)', { count: 'exact' });
      if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.category) q = q.eq('category_id', filters.category);
      if (filters.ambassador) q = q.eq('ambassador_id', filters.ambassador);
      if (filters.stock === 'bajo') q = q.lte('stock', 3);
      if (filters.featured) q = q.eq('is_featured', true);
      return q.order(sort.col, { ascending: sort.asc }).range(from, to);
    },
  });

  const bulk = async (patch, msg) => {
    const { error } = await supabase.from('products').update(patch).in('id', [...selected]);
    if (error) return notify(friendlyError(error), 'error');
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ['admin'] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
    notify(msg);
  };

  return (
    <div className="pn-stack">
      <header className="pn-head pn-head-row">
        <div><h1>Productos</h1><p className="muted">Todo el catálogo, de todos los embajadores.</p></div>
        <Link to="/admin/productos/nuevo" className="btn btn-green"><Icon name="bag" size={18} />Nuevo producto</Link>
      </header>
      {selected.size > 0 && (
        <div className="bulk-bar">
          <span><b>{selected.size}</b> seleccionados</span>
          <div className="form-actions">
            <button type="button" className="btn btn-green btn-sm" onClick={() => bulk({ status: 'aprobado' }, 'Productos aprobados')}>Aprobar</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => bulk({ status: 'inactivo' }, 'Productos pausados')}>Pausar</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => bulk({ is_featured: true }, 'Destacados en el inicio')}>Destacar</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => bulk({ is_featured: false }, 'Ya no están destacados')}>Quitar destacado</button>
          </div>
        </div>
      )}
      <DataTable
        table={table}
        selectable
        selected={selected}
        onSelect={setSelected}
        searchPlaceholder="Nombre o SKU"
        filterDefs={[
          { key: 'status', label: 'Estado', options: Object.entries(PRODUCT_STATUS).map(([v, s]) => [v, s.label]) },
          { key: 'category', label: 'Categoría', options: (lk.data?.categories || []).map((c) => [c.id, c.name]) },
          { key: 'ambassador', label: 'Embajador', options: (lk.data?.ambassadors || []).map((a) => [a.id, a.brand_name]) },
          { key: 'stock', label: 'Stock', options: [['bajo', '3 o menos']] },
          { key: 'featured', label: 'Destacados', options: [['1', 'Solo destacados']] },
        ]}
        columns={[
          { key: 'name', label: 'Producto', sort: 'name', render: (p) => {
            const t = [...p.images].sort((a, b) => a.sort_order - b.sort_order)[0];
            return (
              <Link to={`/admin/productos/${p.id}`} className="dt-prod">
                {t ? <img src={t.thumb_url} alt="" width="44" height="44" loading="lazy" /> : <span className="dt-noimg"><Icon name="bag" size={18} /></span>}
                <span><b>{p.name}</b><span className="sku">{p.sku}</span></span>
              </Link>
            );
          } },
          { key: 'ambassador', label: 'Embajador', render: (p) => <>{p.ambassador?.brand_name}<br /><span className="muted small">{p.category?.name}</span></> },
          { key: 'price', label: 'Precio', sort: 'price', className: 'num', render: (p) => money(p.price) },
          { key: 'stock', label: 'Stock', sort: 'stock', className: 'num', render: (p) => <span className={p.stock <= 3 ? 'low' : ''}>{p.stock}</span> },
          { key: 'sales_count', label: 'Ventas', sort: 'sales_count', className: 'num' },
          { key: 'status', label: 'Estado', sort: 'status', render: (p) => <>{p.is_featured && <span className="pill pill-ocre">Destacado</span>} <ProductStatus status={p.status} /></> },
        ]}
      />
    </div>
  );
}

/** Editar (o crear) cualquier producto con los controles de admin. */
export function ProductAdminEdit() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const lk = useLookups();
  const [ambId, setAmbId] = useState(params.get('embajador') || '');
  const owner = useQuery({
    queryKey: ['admin', 'product-owner', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('ambassador:ambassadors (id, brand_name)').eq('id', id).maybeSingle();
      if (error) throw error;
      return data?.ambassador;
    },
  });

  if (id) {
    if (owner.isLoading) return <div className="skeleton" style={{ height: 400 }} />;
    if (!owner.data) return <div className="empty"><b>Producto no encontrado</b><Link to="/admin/productos" className="btn btn-green">Volver</Link></div>;
    return <ProductForm amb={owner.data} id={id} backTo="/admin/productos" admin />;
  }

  const amb = lk.data?.ambassadors.find((a) => a.id === ambId);
  return (
    <div className="pn-stack">
      {!amb ? (
        <section className="panel form">
          <h1>Nuevo producto</h1>
          <label className="field"><span>¿De qué embajador es?</span>
            <select value={ambId} onChange={(e) => setAmbId(e.target.value)}>
              <option value="">Elige…</option>
              {(lk.data?.ambassadors || []).map((a) => <option key={a.id} value={a.id}>{a.brand_name} ({a.code})</option>)}
            </select>
          </label>
        </section>
      ) : (
        <>
          <p className="muted">Producto de <b>{amb.brand_name}</b> · <button type="button" className="link-btn" onClick={() => setAmbId('')}>cambiar</button></p>
          <ProductForm amb={amb} backTo="/admin/productos" admin />
        </>
      )}
    </div>
  );
}
