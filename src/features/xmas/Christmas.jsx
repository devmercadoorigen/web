// Temporada navideña (15 nov – 6 ene). Todo lo de aquí desaparece solo fuera de temporada.
// ?navidad la activa en cualquier fecha (para revisarla) durante la sesión.
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { isChristmas } from '../../lib/boot.js';
import './christmas.css';

function forced() {
  try {
    if (/[?&]navidad\b/.test(location.search)) sessionStorage.setItem('mo-xmas-force', '1');
    return sessionStorage.getItem('mo-xmas-force') === '1';
  } catch { return false; }
}

export const XMAS = typeof window !== 'undefined' && (isChristmas() || forced());

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Nieve suave sobre toda la página (no intercepta clics). */
function Snow() {
  const flakes = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100 + Math.random() * 3,
    size: 4 + Math.random() * 6,
    dur: 9 + Math.random() * 9,
    delay: -Math.random() * 18,
    drift: (Math.random() * 2 - 1) * 40,
  })), []);
  return (
    <div className="xm-snow" aria-hidden="true">
      {flakes.map((f, i) => (
        <i key={i} style={{ left: `${f.left}%`, width: f.size, height: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, '--drift': `${f.drift}px` }} />
      ))}
    </div>
  );
}

/**
 * Franja navideña del inicio: Papá Noel cruza de lado a lado empujando el carrito del logo.
 * Tiene su propio carril, así no tapa botones ni textos de la página.
 */
export function XmasBanner() {
  if (!XMAS) return null;
  return (
    <section className="xm-banner" aria-labelledby="xm-banner-title">
      <div className="wrap">
        <div className="xm-banner-in">
          <div className="xm-banner-copy">
            <span className="xm-banner-kicker">Temporada navideña</span>
            <h2 id="xm-banner-title">Esta Navidad, regala el Huila</h2>
            <p>Arma una caja con café, cacao, miel y artesanías de varios municipios. Un solo envío, empacado para regalo.</p>
            <Link to="/kits" className="btn btn-ocre">Ver regalos de Navidad</Link>
          </div>
          <div className="xm-lane" aria-hidden="true">
            <img className="xm-walker" src="/brand/papa-noel.svg" alt="" width="260" height="167" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Capa global: clase .xmas en <html> y nieve. */
export function ChristmasLayer() {
  const { pathname } = useLocation();
  const [motionOk] = useState(() => !reducedMotion());
  useEffect(() => {
    if (!XMAS) return undefined;
    document.documentElement.classList.add('xmas');
    return () => document.documentElement.classList.remove('xmas');
  }, []);
  // En el admin y el panel no hace falta la nieve.
  if (!XMAS || !motionOk || /^\/(admin|panel)/.test(pathname)) return null;
  return <Snow />;
}

/** Luces de colores colgando bajo el header. */
export function Garland() {
  if (!XMAS) return null;
  return (
    <div className="xm-garland" aria-hidden="true">
      {Array.from({ length: 60 }, (_, i) => <i key={i} />)}
    </div>
  );
}

/** Gorro de Papá Noel sobre la manija del carrito del logo. */
export function LogoHat() {
  if (!XMAS) return null;
  return (
    <svg className="xm-hat" viewBox="0 0 60 44" aria-hidden="true">
      <path d="M6 34C8 16 22 4 40 6c8 1 12 10 10 18L6 34z" fill="#d62839" />
      <path d="M40 6c8-4 16 0 16 8" fill="none" stroke="#d62839" strokeWidth="7" strokeLinecap="round" />
      <circle cx="55" cy="16" r="5.5" fill="#fff" stroke="#c9b9ae" strokeWidth="1.5" />
      <rect x="2" y="29" width="50" height="11" rx="5.5" fill="#fff" stroke="#c9b9ae" strokeWidth="1.5" transform="rotate(-10 27 34)" />
    </svg>
  );
}

export const XMAS_NEWS = { icon: 'gift', text: 'Esta Navidad regala **productos 100% del Huila**' };
