import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { friendlyError } from '../../lib/errors.js';
import { money } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useWheel } from './useWheel.js';
import './wheel.css';

const LATER_KEY = 'mo-wheel-later';
const TEASER_KEY = 'mo-wheel-teaser-off';
const ICON = { 'envio-gratis': '🚚', '2x1': '🍫', gratis: '🎁', 'bono-20': '💵' };
const iconFor = (slug) => ICON[slug] || '🏷️';
const HIDE_ON = /^\/(checkout|pago|login|registro|recuperar)/;

const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* modo privado */ } },
};
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ geometría
const C = 200;          // centro del SVG (viewBox 400)
const R = 172;          // radio de las porciones
const polar = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const HUB = 66;         // radio que tapa el botón GIRAR

/** Reparte la etiqueta en 1 o 2 líneas y calcula el tamaño para que quepa en su porción. */
function fitLabel(label, span) {
  const band = R - 12 - HUB;                                  // largo disponible a lo largo del radio
  const arc = (((HUB + R) / 2) * span * Math.PI) / 180;       // ancho disponible a mitad del radio
  const words = label.split(' ');
  let lines = [label];
  if (words.length > 1 && span >= 18) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const cand = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
      const w = Math.max(...cand.map((c) => c.length));
      if (!best || w < best.w) best = { cand, w };
    }
    lines = best.cand;
  }
  const longest = Math.max(...lines.map((l) => l.length));
  const byLength = band / (longest * 0.68);
  const byWidth = (arc * 0.78) / (lines.length * 1.1);
  return { lines, size: Math.max(9, Math.min(20, byLength, byWidth)) };
}

function slicePath(a0, a1) {
  const [x0, y0] = polar(a0, R);
  const [x1, y1] = polar(a1, R);
  return `M${C},${C} L${x0},${y0} A${R},${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1} Z`;
}

/** Porciones con tamaño proporcional al peso (probabilidad real de cada premio). */
function useSlices(prizes) {
  return useMemo(() => {
    const total = prizes.reduce((s, p) => s + p.weight, 0) || 1;
    let a = 0;
    return prizes.map((p) => {
      const span = (p.weight / total) * 360;
      const s = { ...p, a0: a, a1: a + span, mid: a + span / 2, span };
      a += span;
      return s;
    });
  }, [prizes]);
}

function Wheel({ slices, rotation, duration, spinning }) {
  const bulbs = Array.from({ length: 24 }, (_, i) => polar(i * 15, 188));
  return (
    <div className={`ww-wheel${spinning ? ' is-spinning' : ''}`}>
      <svg viewBox="0 0 400 400" className="ww-svg" aria-hidden="true">
        <defs>
          <radialGradient id="ww-rim" cx="50%" cy="40%" r="60%">
            <stop offset="0" stopColor="#0E8A45" /><stop offset="1" stopColor="#043A1C" />
          </radialGradient>
          <linearGradient id="ww-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFE07A" /><stop offset=".5" stopColor="#F2B705" /><stop offset="1" stopColor="#C98A00" />
          </linearGradient>
          <radialGradient id="ww-shine" cx="50%" cy="50%" r="50%">
            <stop offset=".25" stopColor="#fff" stopOpacity=".28" /><stop offset=".7" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".18" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r="198" fill="url(#ww-rim)" />
        <circle cx={C} cy={C} r="179" fill="none" stroke="url(#ww-gold)" strokeWidth="7" />
        {bulbs.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.6" className={`ww-bulb ${i % 2 ? 'b' : 'a'}`} />)}
      </svg>

      <div className="ww-disc" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${duration}ms` }}>
        <svg viewBox="0 0 400 400" aria-hidden="true">
          {slices.map((s) => <path key={s.slug} d={slicePath(s.a0, s.a1)} fill={s.color} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />)}
          <circle cx={C} cy={C} r={R} fill="url(#ww-shine)" pointerEvents="none" />
          {slices.map((s) => {
            const { lines, size } = fitLabel(s.label.toUpperCase(), s.span);
            const mid = (HUB + R - 12) / 2;
            return (
              <g key={`t-${s.slug}`} transform={`rotate(${s.mid - 90} ${C} ${C})`}>
                <text x={C + mid} y={C} textAnchor="middle" className="ww-label" style={{ fontSize: size }}>
                  {lines.map((l, i) => (
                    <tspan key={i} x={C + mid} dy={i === 0 ? `${(0.36 - (lines.length - 1) * 0.55).toFixed(2)}em` : '1.1em'}>{l}</tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <svg viewBox="0 0 60 70" className="ww-pointer" aria-hidden="true">
        <defs><linearGradient id="ww-pin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE07A" /><stop offset="1" stopColor="#E09A00" /></linearGradient></defs>
        <path d="M30 68 L6 22 A26 26 0 1 1 54 22 Z" fill="url(#ww-pin)" stroke="#8A5A00" strokeWidth="2" />
        <circle cx="30" cy="24" r="10" fill="#E2483D" stroke="#fff" strokeWidth="3" />
      </svg>
    </div>
  );
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    dur: 1.8 + Math.random() * 1.6,
    dx: (Math.random() - 0.5) * 160,
    rot: Math.random() * 720,
    color: ['#F2B705', '#0B7A3B', '#E2483D', '#0E8FB0', '#F39200', '#B8408A', '#6BA539', '#fff'][i % 8],
    w: 6 + Math.random() * 6,
  })), []);
  return (
    <div className="ww-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ left: `${b.left}%`, width: b.w, height: b.w * 0.45, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, '--dx': `${b.dx}px`, '--rot': `${b.rot}deg` }} />
      ))}
    </div>
  );
}

function Prize({ won, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(won.code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* sin portapapeles */ }
  };
  const until = won.expires_at ? new Date(won.expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) : null;
  return (
    <div className="ww-prize" role="status" aria-live="polite">
      <span className="ww-prize-ico" aria-hidden="true">{iconFor(won.prize)}</span>
      <span className="ww-prize-kicker">¡Ganaste!</span>
      <h3>{won.legend}</h3>
      {won.terms && <p className="ww-terms">{won.terms}</p>}
      <button type="button" className="ww-code" onClick={copy} aria-label={`Copiar el código ${won.code}`}>
        <span>Tu código</span><b>{won.code}</b><em>{copied ? '¡Copiado!' : 'Copiar'}</em>
      </button>
      <p className="ww-auto">
        ✨ <b>No tienes que hacer nada:</b> se aplica solo en tu primera compra
        {won.min_order > 0 ? ` desde ${money(won.min_order)}` : ''}{until ? `. Vence el ${until}.` : '.'}
      </p>
      <div className="ww-actions">
        <Link to="/tienda" className="btn btn-ocre" onClick={onClose}>Usar mi premio</Link>
        <button type="button" className="ww-link" onClick={onClose}>Seguir mirando</button>
      </div>
    </div>
  );
}

/** Ruleta de bienvenida: se abre sola para cuentas nuevas; si la aplazan, queda un botón flotante. */
export function WelcomeWheel() {
  const { pathname } = useLocation();
  const { profile, role } = useAuth();
  const { status, prizes, spin, commit, user } = useWheel();
  const slices = useSlices(prizes);
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [later, setLater] = useState(() => store.get(LATER_KEY) === '1');
  const [teaserOff, setTeaserOff] = useState(() => store.get(TEASER_KEY) === '1');
  const [phase, setPhase] = useState('idle'); // idle | loading | spinning | won
  const [rotation, setRotation] = useState(0);
  const [duration, setDuration] = useState(0);
  const [won, setWon] = useState(null);
  const [err, setErr] = useState('');

  const consentOk = !profile || !!profile.data_policy_accepted_at || user?.app_metadata?.provider === 'email';
  const eligible = !!status?.eligible && role === 'cliente' && consentOk && slices.length > 1;
  const hidden = HIDE_ON.test(pathname) || pathname.startsWith('/admin') || pathname.startsWith('/panel');

  // Se abre sola una vez por sesión, un momento después de llegar.
  useEffect(() => {
    if (!eligible || later || hidden || open) return;
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, [eligible, later, hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const close = () => {
    if (phase === 'spinning' || phase === 'loading') return;
    setOpen(false);
    if (phase !== 'won') { store.set(LATER_KEY, '1'); setLater(true); }
  };

  const go = async () => {
    if (phase !== 'idle') return;
    setErr('');
    setPhase('loading');
    let res;
    try {
      res = await spin();
    } catch (e) {
      setPhase('idle');
      setErr(friendlyError(e));
      return;
    }
    const target = slices.find((s) => s.slug === res.prize) || slices[0];
    const jitter = (Math.random() - 0.5) * target.span * 0.6;
    const ms = reduced() ? 1200 : 6200;
    setWon(res);
    setDuration(ms);
    setPhase('spinning');
    requestAnimationFrame(() => setRotation(360 * (reduced() ? 2 : 8) - target.mid + jitter));
    setTimeout(() => { setPhase('won'); commit(res); }, ms + 150);
  };

  // Premio ya ganado (otra sesión): abrir muestra el premio.
  const savedWin = status?.spin && !status.spin.used ? status.spin : null;
  const view = phase === 'won' ? won : null;

  if (!status?.enabled || hidden) return null;

  // Visitante: invitación discreta a registrarse.
  if (!user) {
    if (teaserOff) return null;
    return (
      <div className="ww-fab ww-teaser">
        <Link to="/registro" className="ww-fab-main"><span className="ww-fab-wheel" aria-hidden="true" />Regístrate y <b>gira la ruleta</b></Link>
        <button type="button" className="ww-fab-x" aria-label="Ocultar" onClick={() => { store.set(TEASER_KEY, '1'); setTeaserOff(true); }}>×</button>
      </div>
    );
  }

  const showFab = !open && ((eligible && later) || (savedWin && phase !== 'won' && !pathname.startsWith('/carrito')));

  return (
    <>
      {showFab && (
        <div className="ww-fab">
          <button type="button" className="ww-fab-main" onClick={() => { if (savedWin) { setWon(savedWin); setPhase('won'); } setOpen(true); }}>
            {savedWin
              ? <><span aria-hidden="true">🎁</span>Tu premio: <b>{savedWin.legend}</b></>
              : <><span className="ww-fab-wheel" aria-hidden="true" />¡Gira la <b>ruleta</b>!</>}
          </button>
        </div>
      )}

      <dialog ref={ref} className="ww" aria-labelledby="ww-title" onCancel={(e) => { e.preventDefault(); close(); }}>
        {(open || phase === 'won') && (
          <div className="ww-in">
            <button type="button" className="ww-x" onClick={close} aria-label="Cerrar" disabled={phase === 'spinning' || phase === 'loading'}>×</button>
            <header className="ww-head">
              <span className="ww-kicker">¡Bienvenido a Mercado Origen!</span>
              <h2 id="ww-title">Gira la ruleta <span>y gana</span></h2>
              <p>Un solo giro. Tu premio se aplica solo en tu primera compra.</p>
            </header>

            <div className="ww-stage">
              <Wheel slices={slices} rotation={rotation} duration={duration} spinning={phase === 'spinning'} />
              <button type="button" className={`ww-spin${phase === 'idle' ? ' ready' : ''}`} onClick={go} disabled={phase !== 'idle'}>
                {phase === 'loading' ? '…' : phase === 'idle' ? 'Girar' : '★'}
              </button>
              {view && <Confetti />}
            </div>

            <div className="ww-side">
            {err && <p className="ww-err" role="alert">{err}</p>}

            {view ? <Prize won={view} onClose={() => setOpen(false)} /> : (
              <>
                <ul className="ww-legend">
                  {slices.map((s) => <li key={s.slug}><i style={{ background: s.color }} />{s.legend}</li>)}
                </ul>
                <details className="ww-details">
                  <summary>Condiciones de los premios</summary>
                  <ul>{slices.map((s) => <li key={s.slug}><b>{s.legend}:</b> {s.terms}</li>)}</ul>
                  <p>Un giro por cuenta nueva. El premio es personal, de un solo uso, para tu primera compra y vence a los 30 días. El tamaño de cada porción muestra su probabilidad.</p>
                </details>
                <button type="button" className="ww-link ww-later" onClick={close} disabled={phase !== 'idle'}>Jugar después</button>
              </>
            )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
