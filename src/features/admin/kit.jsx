import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/ui.jsx';
import { money } from '../../lib/format.js';

/* ======================================================================
   Tabla con búsqueda, filtros, orden y paginación EN EL SERVIDOR.
   `query({ search, filters, sort, from, to })` devuelve un query builder de
   Supabase con { count: 'exact' } y .range(from, to).
   ====================================================================== */

/** Quita caracteres que rompen los filtros or() de PostgREST. */
export const clean = (s) => s.replace(/[,()*%\\:"']/g, ' ').trim();

export function useServerTable({ key, query, pageSize = 20, initialSort, initialFilters = {} }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState(initialSort);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(clean(search)), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(0);
  }, [debounced, filters, sort]);

  const q = useQuery({
    queryKey: ['admin', ...key, page, debounced, filters, sort],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, count, error } = await query({ search: debounced, filters, sort, from: page * pageSize, to: page * pageSize + pageSize - 1 });
      if (error) throw error;
      return { rows: data, count: count ?? data.length };
    },
  });

  return {
    rows: q.data?.rows ?? [], count: q.data?.count ?? 0, isLoading: q.isLoading, isFetching: q.isFetching, error: q.error,
    refetch: q.refetch, page, setPage, pageSize, search, setSearch, filters,
    setFilter: (k, v) => setFilters((f) => ({ ...f, [k]: v || undefined })),
    sort, setSort,
  };
}

/**
 * columns: [{ key, label, render?(row), sort?: 'columna', className?, mobile?: false }]
 * filterDefs: [{ key, label, options: [[valor, etiqueta]] }]
 */
export function DataTable({ table, columns, filterDefs = [], searchPlaceholder = 'Buscar…', rowKey = 'id', empty = 'No hay resultados.', toolbar = null, selectable = false, selected, onSelect }) {
  const { rows, count, isLoading, isFetching, page, setPage, pageSize, search, setSearch, filters, setFilter, sort, setSort, error } = table;
  const from = count ? page * pageSize + 1 : 0;
  const to = Math.min(count, (page + 1) * pageSize);
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected.has(r[rowKey]));

  return (
    <div className="dt">
      <div className="dt-toolbar">
        <label className="pn-search">
          <Icon name="search" size={18} />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
        </label>
        {filterDefs.map((fd) => (
          <label key={fd.key} className="dt-filter">
            <span className="sr-only">{fd.label}</span>
            <select value={filters[fd.key] ?? ''} onChange={(e) => setFilter(fd.key, e.target.value)}>
              <option value="">{fd.label}: todos</option>
              {fd.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        ))}
        {toolbar}
      </div>

      {error ? (
        <p className="notice notice-error">No pudimos cargar los datos. {String(error.message || '')}</p>
      ) : isLoading ? (
        <div className="skeleton-list">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}</div>
      ) : !rows.length ? (
        <p className="dt-empty">{empty}</p>
      ) : (
        <div className={`dt-wrap${isFetching ? ' is-fetching' : ''}`}>
          <table className="tbl dt-table">
            <thead>
              <tr>
                {selectable && (
                  <th className="dt-check">
                    <input type="checkbox" aria-label="Seleccionar todos" checked={allSelected}
                      onChange={(e) => onSelect(e.target.checked ? new Set([...selected, ...rows.map((r) => r[rowKey])]) : new Set([...selected].filter((id) => !rows.some((r) => r[rowKey] === id))))} />
                  </th>
                )}
                {columns.map((c) => (
                  <th key={c.key} className={c.className} aria-sort={sort?.col === c.sort ? (sort.asc ? 'ascending' : 'descending') : undefined}>
                    {c.sort ? (
                      <button type="button" className="dt-sort" onClick={() => setSort((s) => ({ col: c.sort, asc: s?.col === c.sort ? !s.asc : true }))}>
                        {c.label}<span aria-hidden="true">{sort?.col === c.sort ? (sort.asc ? ' ↑' : ' ↓') : ''}</span>
                      </button>
                    ) : c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[rowKey]}>
                  {selectable && (
                    <td className="dt-check">
                      <input type="checkbox" aria-label="Seleccionar" checked={selected.has(r[rowKey])}
                        onChange={(e) => { const n = new Set(selected); if (e.target.checked) n.add(r[rowKey]); else n.delete(r[rowKey]); onSelect(n); }} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} data-label={c.label} className={c.className}>{c.render ? c.render(r) : r[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="dt-pager">
        <span className="muted small">{count ? `${from}–${to} de ${count}` : ''}</span>
        <div>
          <button type="button" className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
          <button type="button" className="btn btn-outline btn-sm" disabled={to >= count} onClick={() => setPage(page + 1)}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Modal */
export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={`modal${wide ? ' modal-wide' : ''}`} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-label={title}>
      {open && (
        <>
          <header className="modal-head">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}><Icon name="close" size={20} /></button>
          </header>
          <div className="modal-body">{children}</div>
        </>
      )}
    </dialog>
  );
}

/* ---------------------------------------------------------------- Pestañas */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="chips" role="tablist">
      {tabs.map(([v, l, n]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {l}{n ? <em>{n}</em> : null}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- CSV */
export function downloadCsv(filename, rows, columns) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c[1])).join(';'), ...rows.map((r) => columns.map((c) => esc(typeof c[0] === 'function' ? c[0](r) : r[c[0]])).join(';'))];
  // BOM + punto y coma: Excel en español lo abre con tildes y columnas correctas.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ======================================================================
   Gráficas (una sola serie, un solo color de marca, sin leyenda; tooltip
   al pasar o enfocar; los valores también están en texto).
   ====================================================================== */
const DAY = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' });

/** Ventas diarias: barras verticales con rejilla discreta y tooltip. */
export function DailySalesChart({ series }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...series.map((d) => d.sales));
  const nice = (() => { const p = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / p) * p; })();
  const ticks = [nice, nice / 2, 0];
  const total = series.reduce((s, d) => s + d.sales, 0);
  return (
    <figure className="chart">
      <figcaption className="sr-only">Ventas diarias de los últimos 30 días. Total {money(total)}.</figcaption>
      <div className="chart-plot">
        <div className="chart-grid" aria-hidden="true">{ticks.map((t) => <span key={t}><em>{t ? money(t) : '$0'}</em></span>)}</div>
        <div className="chart-bars">
          {series.map((d, i) => (
            <button
              key={d.day}
              type="button"
              className="chart-col"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${DAY(d.day)}: ${money(d.sales)}, ${d.orders} pedidos`}
            >
              <i style={{ height: `${(d.sales / nice) * 100}%` }} className={d.sales ? '' : 'zero'} />
            </button>
          ))}
          {hover !== null && (
            <div className="chart-tip" style={{ left: `${((hover + 0.5) / series.length) * 100}%` }} role="status">
              <b>{money(series[hover].sales)}</b>
              <span>{DAY(series[hover].day)} · {series[hover].orders} {series[hover].orders === 1 ? 'pedido' : 'pedidos'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="chart-x" aria-hidden="true">
        {series.map((d, i) => {
          const last = series.length - 1;
          // Una etiqueta por semana; la del último día solo si no choca con la anterior.
          const show = i % 7 === 0 ? last - i >= 4 || i === last : i === last;
          return <span key={d.day}>{show ? DAY(d.day) : ''}</span>;
        })}
      </div>
    </figure>
  );
}

/** Ranking: barras horizontales con nombre y valor en texto. */
export function RankBars({ items, value = 'revenue', label = 'name', sub, empty = 'Sin ventas todavía.' }) {
  const max = Math.max(1, ...items.map((i) => i[value]));
  if (!items.length || !items.some((i) => i[value] > 0)) return <p className="muted small">{empty}</p>;
  return (
    <ol className="rank">
      {items.map((it) => (
        <li key={it[label]} title={`${it[label]}: ${money(it[value])}`}>
          <div className="rank-top">
            <span className="rank-name">{it[label]}{sub && <em>{sub(it)}</em>}</span>
            <b>{money(it[value])}</b>
          </div>
          <span className="rank-track"><i style={{ width: `${(it[value] / max) * 100}%` }} /></span>
        </li>
      ))}
    </ol>
  );
}

/** Mapa de calor del Huila por subregión (un solo tono, de claro a oscuro). */
const RAMP = ['#EDF6EA', '#BFE0B5', '#7FC07A', '#2E9A4E', '#0B7A3B'];
export function HuilaHeatmap({ data, paths, labels }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const step = (v) => (v <= 0 ? 0 : Math.min(RAMP.length - 1, 1 + Math.floor((v / max) * (RAMP.length - 1.01))));
  const by = Object.fromEntries(data.map((d) => [d.slug, d]));
  const h = hover && by[hover];
  return (
    <figure className="heat">
      <svg viewBox="10 10 785 795" role="img" aria-label={data.map((d) => `${d.name}: ${money(d.revenue)}`).join(', ')}>
        {Object.entries(paths).map(([k, d]) => (
          <path key={k} d={d} fill={RAMP[step(by[k]?.revenue ?? 0)]} stroke="#fff" strokeWidth="4" strokeLinejoin="round"
            className={hover === k ? 'on' : ''} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)} />
        ))}
        {Object.entries(labels).map(([k, [x, y]]) => (
          <text key={k} x={x} y={y} textAnchor="middle" className="heat-label" fill={step(by[k]?.revenue ?? 0) >= 3 ? '#fff' : '#23302A'}>
            {by[k]?.name}
          </text>
        ))}
      </svg>
      <figcaption>
        {h ? (
          <><b>{h.name}</b> {money(h.revenue)} · {h.ambassadors} {h.ambassadors === 1 ? 'embajador' : 'embajadores'}</>
        ) : (
          <span className="heat-scale"><span>Menos</span>{RAMP.map((c) => <i key={c} style={{ background: c }} />)}<span>Más ventas</span></span>
        )}
      </figcaption>
      <ul className="heat-list">
        {data.map((d) => <li key={d.slug}><span>{d.name}</span><b>{money(d.revenue)}</b><em>{d.ambassadors} emb.</em></li>)}
      </ul>
    </figure>
  );
}
