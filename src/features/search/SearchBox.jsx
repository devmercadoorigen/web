import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { money } from '../../lib/format.js';
import { Icon, ProductArt } from '../../components/ui.jsx';

/**
 * Buscador con sugerencias instantáneas (productos por texto o SKU,
 * embajadores y municipios). Enter abre /tienda?q=…
 * Navegable con flechas, Enter y Escape (patrón combobox).
 */
export function SearchBox({ autoFocus = false, onDone, className = 'search' }) {
  const navigate = useNavigate();
  const listId = useId();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    const onDown = (e) => {
      if (!box.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const s = useQuery({
    queryKey: ['suggest', debounced],
    enabled: debounced.length >= 2,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_suggest', { q: debounced });
      if (error) throw error;
      return data;
    },
  });

  // Lista plana para el teclado: [tipo, item, destino]
  const items = useMemo(() => {
    const d = s.data;
    if (!d || debounced.length < 2) return [];
    return [
      ...d.products.map((p) => ['p', p, `/producto/${p.slug}`]),
      ...d.ambassadors.map((a) => ['a', a, `/embajador/${a.slug}`]),
      ...d.municipalities.map((m) => ['m', m, `/tienda?municipio=${m.slug}`]),
    ];
  }, [s.data, debounced]);

  const go = (to) => {
    setOpen(false);
    setQ('');
    navigate(to);
    onDone?.();
  };
  const submit = () => {
    if (active >= 0 && items[active]) return go(items[active][2]);
    if (q.trim()) go(`/tienda?q=${encodeURIComponent(q.trim())}`);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); onDone?.(); }
  };

  const show = open && debounced.length >= 2;
  let idx = -1;
  const row = (type, it, to, body) => {
    idx += 1;
    const i = idx;
    return (
      <li key={`${type}${to}`} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
        <button type="button" className={active === i ? 'on' : ''} onMouseEnter={() => setActive(i)} onClick={() => go(to)}>{body}</button>
      </li>
    );
  };

  return (
    <div className="search-wrap" ref={box}>
      <label className={className}>
        <Icon name="search" size={18} />
        <input
          ref={input}
          type="search"
          value={q}
          placeholder="Busca café, chocolate, miel o un SKU…"
          aria-label="Buscar productos, embajadores o municipios"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          enterKeyHint="search"
        />
      </label>
      {show && (
        <div className="suggest" id={listId} role="listbox" aria-label="Sugerencias">
          {s.isLoading ? (
            <div className="suggest-loading" aria-label="Buscando">{[0, 1, 2].map((i) => <span key={i} className="skeleton" />)}</div>
          ) : !items.length ? (
            <p className="suggest-empty">Sin resultados para “{debounced}”. Prueba con otra palabra.</p>
          ) : (
            <>
              {s.data.products.length > 0 && <span className="suggest-group">Productos</span>}
              <ul>
                {s.data.products.map((p) => row('p', p, `/producto/${p.slug}`, (
                  <>
                    <span className="suggest-thumb">{p.thumb ? <img src={p.thumb} alt="" width="40" height="40" /> : <ProductArt art={p.mockup?.art} artLabel={p.mockup?.label} colors={p.mockup?.colors || ['#F5F3EE', '#0B7A3B']} maker={p.maker} />}</span>
                    <span className="suggest-text"><b>{p.name}</b><span>{p.maker} · <span className="sku">{p.sku}</span></span></span>
                    <span className="suggest-price">{money(p.price)}</span>
                  </>
                )))}
              </ul>
              {s.data.ambassadors.length > 0 && <span className="suggest-group">Embajadores</span>}
              <ul>
                {s.data.ambassadors.map((a) => row('a', a, `/embajador/${a.slug}`, (
                  <>
                    <span className="suggest-thumb round">{a.avatar_url ? <img src={a.avatar_url} alt="" width="40" height="40" /> : a.initials}</span>
                    <span className="suggest-text"><b>{a.brand_name}</b><span>{a.municipality}</span></span>
                  </>
                )))}
              </ul>
              {s.data.municipalities.length > 0 && <span className="suggest-group">Municipios</span>}
              <ul>
                {s.data.municipalities.map((m) => row('m', m, `/tienda?municipio=${m.slug}`, (
                  <>
                    <span className="suggest-thumb"><Icon name="pin" size={18} /></span>
                    <span className="suggest-text"><b>{m.name}</b><span>Zona {m.zone_name} · {m.ambassadors ? `${m.ambassadors} ${m.ambassadors === 1 ? 'embajador' : 'embajadores'}` : 'aún sin embajadores'}</span></span>
                  </>
                )))}
              </ul>
              <button type="button" className="suggest-all" onClick={() => go(`/tienda?q=${encodeURIComponent(debounced)}`)}>
                Ver todos los resultados de “{debounced}” <Icon name="arrow" size={16} stroke={2.4} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
