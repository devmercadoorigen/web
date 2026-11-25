import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { money } from '../../lib/format.js';
import { track } from '../recommendations/track.js';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useCatalog } from '../catalog/CatalogProvider.jsx';

/*
 * Carrito: { "p:<uuid>": cantidad, "k:<uuid>": cantidad }
 *  · Invitado: localStorage.
 *  · Con sesión: al entrar se fusiona con el guardado (merge_cart, gana la
 *    cantidad mayor) y cada cambio se guarda en cart_items.
 *  · Al cerrar sesión el carrito local se vacía (equipos compartidos).
 */
const STORAGE_KEY = 'mo-cart';

// Carritos guardados antes de conectar Supabase usaban ids como "susana".
const LEGACY = {
  susana: 'p:chocolate-de-mesa-artesanal-tradicional-1-kg-en-bolitas',
  bried: 'p:chocolate-de-mesa-100-cacao-con-cardamomo-y-canela',
  miel: 'p:miel-de-abejas-natural-450-g',
  achiras: 'p:achiras-tradicionales-huilenses-100-artesanales',
  shalena: 'p:chocolate-de-consumo-directo-55-amazonico-enchilado',
  tachacoa: 'p:chocolate-de-mesa-en-bola-40-con-nuez-moscada-canela-y-clavos',
  acacias: 'p:acacias-fit-te-natural',
  adames: 'p:vestido-de-bano-boyaca',
  'kit-cacao': 'k:ruta-del-cacao',
  'kit-tatacoa': 'k:tarde-en-la-tatacoa',
  'kit-sur': 'k:dulce-del-sur',
};

function loadCart() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

const toRows = (items) =>
  Object.entries(items)
    .filter(([k, q]) => q > 0 && k.includes(':'))
    .map(([k, quantity]) => (k.startsWith('p:') ? { product_id: k.slice(2), quantity } : k.startsWith('v:') ? { variant_id: k.slice(2), quantity } : { kit_id: k.slice(2), quantity }));

const fromRows = (rows) => Object.fromEntries(rows.map((r) => [r.variant_id ? `v:${r.variant_id}` : r.product_id ? `p:${r.product_id}` : `k:${r.kit_id}`, r.quantity]));

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const catalog = useCatalog();
  const { user, ready: authReady } = useAuth();
  const { notify } = useToast();
  const [items, setItems] = useState(loadCart);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const syncedUser = useRef(null);

  // Normaliza productos y kits a una misma forma para el carrito.
  const lineInfo = useCallback(
    (key) => {
      if (key.startsWith('p:')) {
        const p = catalog.productById(key.slice(2));
        return p && { cartKey: key, id: p.id, type: 'product', name: p.name, sub: `${p.maker} · ${p.town}`, price: p.price, art: p.art, artLabel: p.artLabel, colors: p.colors, image: p.thumb || p.image, maker: p.maker, stock: p.stock, ageRestricted: p.ageRestricted };
      }
      if (key.startsWith('v:')) {
        const hit = catalog.variantById(key.slice(2));
        if (!hit) return null;
        const { product: p, variant: v } = hit;
        return { cartKey: key, id: v.id, type: 'variant', productId: p.id, name: `${p.name} · ${v.name}`, sub: `${p.maker} · ${p.town}`, price: v.price, art: p.art, artLabel: p.artLabel, colors: p.colors, image: p.thumb || p.image, maker: p.maker, stock: v.stock, ageRestricted: p.ageRestricted };
      }
      if (key.startsWith('k:')) {
        const k = catalog.kitById(key.slice(2));
        return k && { cartKey: key, id: k.id, type: 'kit', name: `Kit ${k.name}`, sub: `${k.items.length} productos`, price: k.price, art: k.art, colors: ['#F5F3EE', k.bg], available: k.available, ageRestricted: k.ageRestricted };
      }
      return null;
    },
    [catalog]
  );

  // Convierte carritos antiguos ("susana") cuando el catálogo ya cargó.
  useEffect(() => {
    if (!catalog.ready) return;
    const legacy = Object.keys(itemsRef.current).filter((k) => !k.includes(':'));
    if (!legacy.length) return;
    setItems((prev) => {
      const next = {};
      for (const [k, q] of Object.entries(prev)) {
        if (k.includes(':')) { next[k] = (next[k] || 0) + q; continue; }
        const target = LEGACY[k];
        const found = target?.startsWith('p:') ? catalog.productBySlug(target.slice(2)) : target && catalog.kitBySlug(target.slice(2));
        if (found) next[found.cartKey] = (next[found.cartKey] || 0) + q;
      }
      return next;
    });
  }, [catalog]);

  // Guarda local siempre (también sirve de respaldo con sesión).
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  // Al iniciar sesión: fusiona con el carrito guardado. Al cerrarla: vacía.
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      if (syncedUser.current) setItems({});
      syncedUser.current = null;
      return;
    }
    if (syncedUser.current === user.id) return;
    syncedUser.current = user.id;
    supabase.rpc('merge_cart', { p_items: toRows(itemsRef.current) }).then(({ data, error }) => {
      if (!error && data) setItems(fromRows(data));
    });
  }, [user, authReady]);

  const persist = useCallback(
    (key, qty) => {
      if (!user || !key.includes(':')) return;
      const id = key.slice(2);
      supabase
        .rpc('set_cart_item', { p_product_id: key.startsWith('p:') ? id : null, p_kit_id: key.startsWith('k:') ? id : null, p_quantity: qty, p_variant_id: key.startsWith('v:') ? id : null })
        .then(({ error }) => error && notify('No pudimos guardar tu carrito. Tus productos siguen aquí.', 'error'));
    },
    [user, notify]
  );

  const lines = useMemo(
    () =>
      Object.entries(items)
        .filter(([, q]) => q > 0)
        .map(([key, qty]) => {
          const info = lineInfo(key);
          return info && { ...info, qty };
        })
        .filter(Boolean),
    [items, lineInfo]
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const missing = Math.max(0, catalog.freeShipping - subtotal);

  const add = useCallback(
    (key) => {
      const prev = itemsRef.current;
      const qty = Math.min((prev[key] || 0) + 1, 99);
      const next = { ...prev, [key]: qty };
      const sub = Object.entries(next).reduce((s, [k, q]) => s + (lineInfo(k)?.price || 0) * q, 0);
      const left = catalog.freeShipping - sub;
      itemsRef.current = next;
      setItems(next);
      setBump((b) => b + 1);
      persist(key, qty);
      // Señal para recomendaciones (la presentación cuenta para su producto).
      const id = key.slice(2);
      if (key.startsWith('p:')) track('cart', id);
      else if (key.startsWith('v:')) track('cart', catalog.variantById(id)?.product.id);
      else if (key.startsWith('k:')) catalog.kitById(id)?.items.forEach((pid) => track('cart', pid));
      notify(left > 0 ? `Añadido. Te faltan ${money(left)} para el envío gratis` : 'Añadido. Tu envío es gratis');
    },
    [notify, lineInfo, catalog, persist]
  );

  const setQty = useCallback(
    (key, qty) => {
      const q = Math.max(0, Math.min(qty, 99));
      setItems((prev) => {
        const next = { ...prev };
        if (q <= 0) delete next[key];
        else next[key] = q;
        return next;
      });
      persist(key, q);
    },
    [persist]
  );

  const clear = useCallback(() => {
    Object.keys(itemsRef.current).forEach((k) => persist(k, 0));
    setItems({});
  }, [persist]);

  const value = { items, lines, count, subtotal, missing, freeShipping: catalog.freeShipping, add, setQty, clear, open, setOpen, notify, bump };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
