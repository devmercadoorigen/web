// Carga de página: en Navidad, Papá Noel empuja el carrito; el resto del año el logo late suavemente.
import { isChristmas } from '../lib/boot.js';

export function PageLoader({ label = 'Cargando…' }) {
  const xmas = isChristmas();
  return (
    <div className={`page-loader${xmas ? ' xmas' : ''}`} role="status" aria-live="polite">
      {xmas
        ? <img src="/brand/papa-noel.svg" alt="" width="260" height="167" />
        : <img src="/brand/logo-vertical.svg" alt="" width="72" height="82" />}
      <span className="sr-only">{label}</span>
    </div>
  );
}
