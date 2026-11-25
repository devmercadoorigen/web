// Retira el esqueleto HTML del home (index.html) cuando React ya pintó lo suyo,
// y la pantalla de carga navideña (si está) con un fundido.
const XMAS_MIN_MS = 1600; // tiempo mínimo para que la animación no parpadee

export function removeBoot() {
  document.getElementById('boot')?.remove();
  const xmas = document.getElementById('xmas');
  if (!xmas || xmas.dataset.leaving) return;
  xmas.dataset.leaving = '1';
  const wait = Math.max(0, XMAS_MIN_MS - (Date.now() - (window.__xmasAt || 0)));
  setTimeout(() => {
    xmas.classList.add('out');
    setTimeout(() => xmas.remove(), 500);
  }, wait);
}

/** Temporada navideña: 15 de noviembre a 6 de enero. */
export function isChristmas(d = new Date()) {
  const m = d.getMonth();
  const day = d.getDate();
  return (m === 10 && day >= 15) || m === 11 || (m === 0 && day <= 6);
}
