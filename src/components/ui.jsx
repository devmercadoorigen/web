import { useId, useState } from 'react';

const LABELS = { bar: 'Chocolate', ball: 'Chocolate de mesa', jar: 'Miel natural', achira: 'Achiras', tea: 'Té natural', swim: 'Resortwear' };
// Marca corta para el empaque: palabras completas hasta 14 letras ("MACA JOYAS").
const short = (s = '') => {
  const words = s.replace(/\s*(Chocolatería|Chocolate|Resortwear)\s*/gi, ' ').trim().toUpperCase().split(/\s+/);
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > 14) break;
    out = next;
  }
  out = out.replace(/\s+(Y|DE|DEL|LA|EL|LOS|LAS|&)$/, '');   // sin conectores sueltos al final
  return out || words[0]?.slice(0, 14) || '';
};

// Empaques dibujados en SVG mientras llegan las fotos reales de cada producto.
function Mockup({ art, colors, maker, uid, label: customLabel }) {
  const [bg, fg] = colors;
  const g = (n) => `${uid}-${n}`;
  const brand = short(maker);
  const label = customLabel || LABELS[art];
  const T = { fontFamily: 'Nunito, sans-serif', textAnchor: 'middle' };
  const bs = brand.length > 10 ? 7 : 8.5;
  // Etiquetas largas ("Bourbon Rosado") en letra más pequeña para que quepan.
  const ls = label && label.length > 13 ? 8 : 10;

  const pieces = {
    bar: (
      <>
        <path d="M54 44 L66 34 L158 34 L146 44Z" fill={`url(#${g('top')})`} />
        <path d="M146 44 L158 34 L158 160 L146 170Z" fill={fg} opacity=".55" />
        <rect x="54" y="44" width="92" height="126" rx="6" fill={`url(#${g('body')})`} />
        <circle cx="100" cy="70" r="15" fill="#FFF8EC" opacity=".16" />
        <path d="M100 58c7 4 9 16 0 24c-9-8-7-20 0-24z" fill="#FFF8EC" opacity=".85" />
        <rect x="62" y="96" width="76" height="58" rx="5" fill="#FFF8EC" />
        <text x="100" y="113" {...T} fontSize={bs} fontWeight="900" fill={fg}>{brand}</text>
        <rect x="80" y="118" width="40" height="1.5" fill="#F2B705" />
        <text x="100" y="132" {...T} fontSize={ls} fontWeight="900" fill="#2F3A33">{label}</text>
        <text x="100" y="145" {...T} fontSize="6.5" fontWeight="700" fill="#5E6B62">HECHO EN EL HUILA</text>
      </>
    ),
    ball: (
      <>
        <path d="M46 52 L154 52 L160 168 Q100 178 40 168Z" fill={`url(#${g('kraft')})`} />
        <path d="M46 40 h108 v14 h-108z" fill="#B88B5C" />
        <path d={`M46 54 ${Array.from({ length: 18 }, (_, i) => `L${49 + i * 6} ${i % 2 ? 54 : 58}`).join(' ')} L154 54`} fill="none" stroke="#9C7148" strokeWidth="1.5" />
        <text x="100" y="78" {...T} fontSize={bs + 0.5} fontWeight="900" fill={fg}>{brand}</text>
        <rect x="64" y="88" width="72" height="50" rx="25" fill="#2B1810" />
        {[[80, 106], [97, 101], [114, 106], [88, 121], [106, 121], [122, 124], [74, 124]].map(([x, y]) => (
          <g key={`${x}${y}`}><circle cx={x} cy={y} r="8" fill={fg} /><circle cx={x - 2.5} cy={y - 3} r="2" fill="#fff" opacity=".25" /></g>
        ))}
        <rect x="64" y="88" width="72" height="50" rx="25" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
        <text x="100" y="154" {...T} fontSize="9.5" fontWeight="900" fill="#2F3A33">{label}</text>
      </>
    ),
    jar: (
      <>
        <rect x="62" y="34" width="76" height="22" rx="6" fill="#0B7A3B" />
        {[70, 82, 94, 106, 118, 130].map((x) => <rect key={x} x={x} y="38" width="3" height="14" rx="1.5" fill="#086130" />)}
        <path d="M58 60 h84 q8 0 8 10 v80 q0 20 -20 20 h-60 q-20 0 -20 -20 v-80 q0 -10 8 -10z" fill={`url(#${g('honey')})`} />
        <rect x="66" y="70" width="7" height="86" rx="3.5" fill="#fff" opacity=".35" />
        <rect x="62" y="98" width="76" height="46" rx="5" fill="#FFF8EC" />
        <path d="M100 104 l7 4 v8 l-7 4 l-7 -4 v-8z" fill="#F2B705" />
        <text x="100" y="131" {...T} fontSize="8.5" fontWeight="900" fill="#2F3A33">{label}</text>
        <text x="100" y="140" {...T} fontSize="6.5" fontWeight="800" fill="#0B7A3B">{brand}</text>
      </>
    ),
    achira: (
      <>
        <rect x="46" y="42" width="108" height="128" rx="10" fill={`url(#${g('body')})`} />
        <path d={`M46 46 ${Array.from({ length: 19 }, (_, i) => `L${46 + i * 6} ${i % 2 ? 40 : 46}`).join(' ')} L154 46`} fill={fg} />
        <path d={`M46 166 ${Array.from({ length: 19 }, (_, i) => `L${46 + i * 6} ${i % 2 ? 172 : 166}`).join(' ')} L154 166`} fill={fg} />
        <text x="100" y="74" {...T} fontSize="16" fontWeight="900" fill="#FFF8EC" letterSpacing="1">ACHIRAS</text>
        <text x="100" y="86" {...T} fontSize="7" fontWeight="800" fill="#FFF8EC" opacity=".9">{brand}</text>
        <ellipse cx="100" cy="128" rx="40" ry="26" fill="#FFF3DD" />
        {[[82, 120, -20], [104, 116, 15], [118, 132, -10], [92, 136, 25], [74, 134, 5]].map(([x, y, r]) => (
          <rect key={`${x}${y}`} x={x - 11} y={y - 4.5} width="22" height="9" rx="4.5" fill="#E2A548" transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </>
    ),
    tea: (
      <>
        <path d="M54 50 L66 40 L158 40 L146 50Z" fill={`url(#${g('top')})`} />
        <path d="M146 50 L158 40 L158 160 L146 170Z" fill={fg} opacity=".55" />
        <rect x="54" y="50" width="92" height="120" rx="6" fill={`url(#${g('body')})`} />
        <path d="M100 66 c18 -2 26 14 18 28 c-16 4 -26 -10 -18 -28z" fill="#6BA539" />
        <path d="M100 66 c-2 12 4 22 18 28" stroke="#FFF8EC" strokeWidth="1.5" fill="none" />
        <rect x="62" y="110" width="76" height="48" rx="5" fill="#FFF8EC" />
        <text x="100" y="128" {...T} fontSize={ls} fontWeight="900" fill="#2F3A33">{label}</text>
        <text x="100" y="142" {...T} fontSize="7" fontWeight="800" fill={fg}>{brand}</text>
      </>
    ),
    swim: (
      <>
        <path d="M100 30 q10 0 10 9 q0 7 -10 10" fill="none" stroke="#5E6B62" strokeWidth="3" strokeLinecap="round" />
        <path d="M58 64 L100 48 L142 64" fill="none" stroke="#5E6B62" strokeWidth="4" strokeLinecap="round" />
        <path d="M70 62 q30 26 60 0 l8 34 q-8 18 -8 34 q0 26 -30 38 q-30 -12 -30 -38 q0 -16 -8 -34z" fill={`url(#${g('body')})`} />
        <path d="M64 104 q36 16 72 0" stroke="#F2B705" strokeWidth="5" fill="none" />
        <path d="M66 116 q34 14 68 0" stroke="#FFF8EC" strokeWidth="3" fill="none" opacity=".8" />
        <rect x="120" y="128" width="34" height="22" rx="4" fill="#FFF8EC" transform="rotate(12 137 139)" />
        <text x="137" y="142" {...T} fontSize="6.5" fontWeight="900" fill={fg} transform="rotate(12 137 139)">{brand.slice(0, 6)}</text>
      </>
    ),
  };

  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={g('bg')} cx="50%" cy="38%" r="75%"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".9" /><stop offset="1" stopColor={bg} /></radialGradient>
        <linearGradient id={g('body')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={fg} stopOpacity=".82" /><stop offset="1" stopColor={fg} /></linearGradient>
        <linearGradient id={g('top')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor={fg} stopOpacity=".7" /></linearGradient>
        <linearGradient id={g('kraft')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E3C29A" /><stop offset="1" stopColor="#BF925F" /></linearGradient>
        <linearGradient id={g('honey')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD35C" /><stop offset="1" stopColor="#E58A00" /></linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${g('bg')})`} />
      <ellipse cx="100" cy="178" rx="58" ry="7" fill="#2F3A33" opacity=".14" />
      <g className="mock">{pieces[art]}</g>
    </svg>
  );
}

export function ProductArt({ art, colors, image, thumb, maker = '', alt = '', artLabel, sizes = '(max-width: 560px) 50vw, 320px' }) {
  const [failed, setFailed] = useState(false);
  const uid = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  if (image && !failed) {
    // Miniatura de 400 px para tarjetas; la grande solo si la pantalla la necesita.
    const srcSet = thumb && thumb !== image ? `${thumb} 400w, ${image} 1200w` : undefined;
    return <img className="art-img" src={thumb || image} srcSet={srcSet} sizes={srcSet ? sizes : undefined} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
  }
  return <Mockup art={art} colors={colors} maker={maker} uid={uid} label={artLabel} />;
}

export function Photo({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`photo ${className}`}>
      {!failed && <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />}
    </div>
  );
}

// Franja tricolor de la bandera del Huila, presente en el carrito del logo.
export const Tricolor = ({ className = '' }) => (
  <div className={`tricolor ${className}`} aria-hidden="true"><i /><i /><i /></div>
);

const ICONS = {
  check: <path d="m5 12 5 5 9-10" />,
  truck: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  lock: <><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-3-6.2" /><path d="M20 4v5h-5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  bag: <><path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 7a3 3 0 0 1 6 0" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUp: <path d="M7 17 17 7M9 7h8v8" />,
  leaf: <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7" />,
  pin: <><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  gift: <><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18M12 9v12M12 9S9 3 6.5 5.5 9 9 12 9zm0 0s3-6 5.5-3.5S15 9 12 9z" /></>,
  card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  box: <><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  award: <><circle cx="12" cy="9" r="6" /><path d="M8.5 14 7 21l5-3 5 3-1.5-7" /></>,
  whatsapp: <><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" /><path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1-1.2 2 .8c-.2 1.2-1.2 2-2.4 1.9-3-.3-5.8-3.1-6.1-6.1-.1-1.2.7-2.2 1.9-2.4l.8 2z" /></>,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17" cy="7" r=".8" /></>,
  facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8.5c0-.3.2-.5.5-.5z" />,
  tiktok: <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.5 2.5 2.3 4 5 4" />,
  mountain: <path d="M3 19 9.5 8l4 6 2-3L21 19z" />,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
};

export const Icon = ({ name, size = 20, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[name]}
  </svg>
);
