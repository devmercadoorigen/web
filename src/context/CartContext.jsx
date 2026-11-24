import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FREE_SHIPPING, kitById, productById } from '../data/catalog.js';
import { money } from '../lib/format.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'mo-cart';

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

// Normaliza productos y kits a una misma forma para el carrito.
export function lineInfo(id) {
  const p = productById(id);
  if (p) return { id, name: p.name, sub: `${p.maker} · ${p.town}`, price: p.price, art: p.art, colors: p.colors, image: p.image, maker: p.maker };
  const k = kitById(id);
  if (k) return { id, name: `Kit ${k.name}`, sub: `${k.items.length} productos`, price: k.price, art: k.art, colors: ['#F5F3EE', k.bg] };
  return null;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [bump, setBump] = useState(0);
  const timer = useRef();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const lines = useMemo(
    () => Object.entries(items).filter(([id, q]) => q > 0 && lineInfo(id)).map(([id, qty]) => ({ ...lineInfo(id), qty })),
    [items]
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const missing = Math.max(0, FREE_SHIPPING - subtotal);

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const add = useCallback(
    (id) => {
      const prev = itemsRef.current;
      const next = { ...prev, [id]: (prev[id] || 0) + 1 };
      const sub = Object.entries(next).reduce((s, [k, q]) => s + (lineInfo(k)?.price || 0) * q, 0);
      const left = FREE_SHIPPING - sub;
      itemsRef.current = next;
      setItems(next);
      setBump((b) => b + 1);
      notify(left > 0 ? `Añadido. Te faltan ${money(left)} para el envío gratis` : 'Añadido. Tu envío es gratis');
    },
    [notify]
  );

  const setQty = useCallback((id, qty) => {
    setItems((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }, []);

  const value = { items, lines, count, subtotal, missing, add, setQty, open, setOpen, toast, notify, bump };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
