// Copia local de datos públicos (catálogo, territorio, textos) para que quien
// vuelve vea la tienda al instante; React Query la refresca en segundo plano.
// Solo datos públicos: nunca carrito, pedidos ni datos de la cuenta.
const VERSION = 1;
const MAX_AGE = 7 * 24 * 3600_000;

export function cachedQuery(key, fetcher) {
  const storageKey = `mo-cache-${key}`;
  let cached;
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (raw?.v === VERSION && Date.now() - raw.at < MAX_AGE) cached = raw;
  } catch { /* sin almacenamiento */ }
  return {
    queryFn: async () => {
      const data = await fetcher();
      try { localStorage.setItem(storageKey, JSON.stringify({ v: VERSION, at: Date.now(), data })); } catch { /* lleno o bloqueado */ }
      return data;
    },
    // Se muestra de una vez, pero cuenta como vieja: siempre se vuelve a pedir al abrir.
    ...(cached && { initialData: cached.data, initialDataUpdatedAt: 0 }),
  };
}
