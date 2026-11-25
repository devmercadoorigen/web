#!/usr/bin/env node
/**
 * Genera la semilla de embajadores a partir de la hoja "EMBAJADORES ACEPTADOS".
 *
 *   node scripts/build-ambassador-seed.mjs [ruta.csv]
 *
 * Entrada (fuera de git):  private/embajadores.csv
 * Salidas:
 *   supabase/seed/02_ambassadors.sql          datos públicos (sí van al repositorio)
 *   supabase/seed/private/90_private.sql      identificación, contacto y enlaces de Drive (NO van al repo)
 *
 * El usuario admin NO se crea aquí: usa scripts/create-admin.mjs.
 *
 * Las correcciones editoriales (nombre comercial, descripción corta, insignias,
 * redes mal escritas) viven en OVERRIDES: la hoja se respeta tal cual.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = process.argv[2] || path.join(root, 'private', 'embajadores.csv');

// ---------------------------------------------------------------------------
// CSV (RFC 4180: comillas, comas y saltos de línea dentro de campos)
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
const [header, ...body] = parseCsv(raw);
const col = (name) => {
  const i = header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  if (i < 0) throw new Error(`Columna no encontrada: ${name}`);
  return i;
};
const C = {
  idNumber: col('Número de Identificación'), code: col('Código de Embajador'), idType: col('Tipo de Identificación'),
  brand: col('Nombre Comercial (Marca)'), legal: col('Razón Social'), muni: col('Municipio de la Producción'),
  sector: col('Sector Economíco de la Produccion'), origin: col('Inicios del Embajador'), present: col('Presente del Embajador'),
  future: col('Futuro del Embajador'), email: col('Correo Electrónico'), phone: col('Teléfono (WhatsApp)'),
  logo: col('Logo de la Marca'), photos: col('Fotos del Embajador'), video: col('Video Autopresentación'),
  facebook: col('Facebook'), instagram: col('Instagram'), web: col('Página Web Empresa'),
};

// ---------------------------------------------------------------------------
// Correcciones editoriales por código
// ---------------------------------------------------------------------------
const OVERRIDES = {
  EM0001: { brand: 'La Petit Huila', short: 'Achiras tradicionales y una versión con café especial, horneadas como en casa.' },
  EM0002: { brand: 'ADAMES Resortwear', short: 'Trajes de baño y resortwear diseñados en Neiva para cuerpos reales, con soporte y elegancia.' },
  EM0003: { brand: 'BRIED Chocolatería', short: 'Chocolatería familiar que convierte el cacao de su finca en Palermo en bombones, trufas y tabletas.' },
  EM0004: { brand: 'Chocolate Mamá Susana', short: 'Receta familiar de chocolate de mesa y la “Casa del Chocolate”, abierta a quien quiera conocer el proceso.',
            badges: [{ label: 'FICCA 2024', type: 'premio', year: 2024 }] },
  EM0005: { brand: 'ARTBACU', short: 'Artesanías y souvenirs que cuentan el Huila en piezas hechas a mano.',
            facebook: 'https://www.facebook.com/ArtBaCuCasArtesanal' },
  EM0006: { brand: 'APIFIT', short: 'Productos de la colmena y servicios de polinización que cuidan los cultivos del sur del Huila.',
            badges: [{ label: 'Negocio Verde', type: 'certificacion', year: null }] },
  EM0007: { brand: 'Bambuqueras', short: 'Achiras huilenses con la misma receta de la Bizcochería La Especial desde 1988.' },
  EM0008: { brand: 'Macchi Infinite', short: 'Abanicos artesanales transformables, diseñados y hechos en Neiva.',
            instagram: null /* la hoja trae el enlace a una publicación, no al perfil */ },
  EM0009: { brand: 'Chocolatería Shalena', short: 'Chocolate de origen en barras de consumo directo, del amazónico al enchilado.',
            badges: [{ label: 'Fondo Emprender SENA', type: 'programa', year: 2020 }] },
  EM0010: { brand: 'TACHACOA', short: 'Chocolate de mesa con la receta de la abuela Tacha y cacao de origen de la Tatacoa.' },
  EM0011: { brand: 'Café Horizonte FC', short: 'Café tostado en grano o molido de fincas huilenses, reconocido en FICCA 2022.',
            badges: [{ label: 'FICCA 2022', type: 'premio', year: 2022 }] },
  EM0012: { brand: 'Cervecería Indian', short: 'Cerveza artesanal elaborada en Palermo, Huila.',
            facebook: null, website: 'https://indianbeer-co.webnode.com.co' /* venía en la columna Facebook */ },
  EM0013: { brand: 'Ecoproser', short: 'Productos de limpieza para el hogar fabricados en Palermo, con recargas y envases reutilizables.',
            badges: [{ label: 'Fondo Emprender SENA', type: 'programa', year: null }] },
  EM0014: { brand: 'Maca Joyas y Accesorios', short: 'Joyas y accesorios artesanales y personalizados, hechos en Neiva desde 2017.' },
  EM0015: { brand: 'Musas Victorianas', short: 'Cuidado capilar botánico con romero, quina, ortiga y aceite de coco.' },
  EM0016: { brand: 'Acacias Fit', short: 'Té 100% natural de fórmula propia, preparado de forma artesanal en Neiva.' },
  EM0017: { brand: 'Herencia Obsequios Huilenses', short: 'Souvenirs livianos, coloridos y útiles para llevarse el Huila como recuerdo de viaje.' },
};

// ---------------------------------------------------------------------------
// Limpieza
// ---------------------------------------------------------------------------
const EMPTY = new Set(['', 'na', 'n/a', 'no', 'no contamos', 'ninguna', 'ninguno']);
const clean = (s) => {
  const v = (s ?? '').replace(/ /g, ' ').trim();
  return EMPTY.has(v.toLowerCase()) ? null : v;
};
const story = (s) => {
  const v = clean(s);
  return v && v.split('\n').map((l) => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
};
const withScheme = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const stripTracking = (u) => {
  try {
    const url = new URL(withScheme(u));
    ['igsh', 'utm_source', 'utm_medium', 'mibextid', 'locale', 'stkn', 'img_index'].forEach((k) => url.searchParams.delete(k));
    return url.toString().replace(/\?$/, '');
  } catch { return withScheme(u); }
};
const social = (value, network) => {
  const v = clean(value);
  if (!v) return null;
  if (v.startsWith('@')) {
    return network === 'instagram' ? `https://www.instagram.com/${v.slice(1)}/` : `https://www.facebook.com/${v.slice(1)}`;
  }
  return stripTracking(v.replace(/\s+/g, ''));
};
const links = (s) => (clean(s) ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const qj = (o) => `${q(JSON.stringify(o))}::jsonb`;

// ---------------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------------
const people = body
  .map((r) => ({ r, code: (r[C.code] || '').trim() }))
  .filter(({ r, code }) => code && clean(r[C.brand]));   // EM0018+ vienen vacíos en la hoja

const pub = [];
const priv = [];
pub.push('-- Generado por scripts/build-ambassador-seed.mjs. No editar a mano: corre el script de nuevo.');
pub.push('-- Datos públicos de los embajadores (vitrina). Los datos personales están en seed/private/.', '');

for (const { r, code } of people) {
  const o = OVERRIDES[code] || {};
  const brand = o.brand || clean(r[C.brand]);
  const instagram = 'instagram' in o ? o.instagram : social(r[C.instagram], 'instagram');
  const facebook = 'facebook' in o ? o.facebook : social(r[C.facebook], 'facebook');
  const website = 'website' in o ? o.website : (clean(r[C.web]) ? stripTracking(clean(r[C.web])) : null);

  pub.push(`insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select ${q(code)}, ${q(brand)}, m.id, ${q(o.short || null)},
  ${q(story(r[C.origin]))},
  ${q(story(r[C.present]))},
  ${q(story(r[C.future]))},
  ${q(instagram)}, ${q(facebook)}, ${q(website)}, 'activo'
from public.municipalities m where m.name = ${q(clean(r[C.muni]))};
`);
  (o.badges || []).forEach((b, i) => {
    pub.push(`insert into public.ambassador_badges (ambassador_id, label, type, year, sort_order)
select id, ${q(b.label)}, ${q(b.type)}, ${b.year ?? 'null'}, ${i} from public.ambassadors where code = ${q(code)};
`);
  });

  priv.push(`insert into public.ambassador_private (ambassador_id, id_type, id_number, legal_name, email, phone, media_sources)
select id, ${q(clean(r[C.idType]))}, ${q(clean(r[C.idNumber]))}, ${q(clean(r[C.legal]))}, ${q(clean(r[C.email])?.toLowerCase())}, ${q(clean(r[C.phone]))},
  ${qj({ sector: clean(r[C.sector]), logo: clean(r[C.logo]), photos: links(r[C.photos]), video: clean(r[C.video]) })}
from public.ambassadors where code = ${q(code)};
`);
}

const maxCode = Math.max(...people.map(({ code }) => parseInt(code.slice(2), 10)));
pub.push(`-- El siguiente embajador creado desde /admin recibe EM${String(maxCode + 1).padStart(4, '0')}.`);
pub.push(`insert into public.sku_counters (scope, last_value) values ('AMBASSADOR', ${maxCode})
on conflict (scope) do update set last_value = greatest(public.sku_counters.last_value, excluded.last_value);`);

const privOut = [
  '-- Generado por scripts/build-ambassador-seed.mjs. CONTIENE DATOS PERSONALES (Ley 1581): no subir al repositorio.',
  '',
  ...priv,
];

fs.mkdirSync(path.join(root, 'supabase', 'seed', 'private'), { recursive: true });
fs.writeFileSync(path.join(root, 'supabase', 'seed', '02_ambassadors.sql'), pub.join('\n') + '\n');
fs.writeFileSync(path.join(root, 'supabase', 'seed', 'private', '90_private.sql'), privOut.join('\n') + '\n');
console.log(`✓ ${people.length} embajadores · siguiente código EM${String(maxCode + 1).padStart(4, '0')}`);
