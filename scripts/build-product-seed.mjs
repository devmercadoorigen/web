#!/usr/bin/env node
/**
 * Genera la semilla del catálogo a partir de la hoja "EMBAJADORES ACEPTADOS - PRODUCTOS".
 *
 *   node scripts/build-product-seed.mjs [ruta.csv] [--textos]
 *
 * Entrada (fuera de git):  private/productos.csv   (incluye números de identificación)
 * Salida:                  supabase/seed/03_products_kits.sql   (sin datos personales)
 *
 * · Las presentaciones del mismo producto (peso, grano/molido, unidades) se agrupan
 *   en un producto con variantes. Cada variante conserva su precio, stock, empaque,
 *   medidas y código del embajador (attributes.supplier_code).
 * · Las fotos se usan si ya existen en public/img/products/<código>.webp
 *   (las prepara scripts/fetch-product-photos.mjs). Si no, se muestra el empaque ilustrado.
 * · Las correcciones editoriales (nombres, tildes, mayúsculas) viven en GROUPS:
 *   la hoja se respeta en precios, stock, pesos y medidas.
 * · Las descripciones de vitrina salen de scripts/catalog-texts.mjs (catálogo PDF).
 *   Con --textos también escribe supabase/snippets/textos_catalogo.sql, que actualiza
 *   nombre, descripción corta y descripción en una base ya poblada (sin tocar precios).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTS } from './catalog-texts.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const wantTexts = args.includes('--textos');
const csvPath = args.find((a) => !a.startsWith('--')) || path.join(root, 'private', 'productos.csv');
const outPath = path.join(root, 'supabase', 'seed', '03_products_kits.sql');
const photoDir = path.join(root, 'public', 'img', 'products');

// ---------------------------------------------------------------------------
// CSV (RFC 4180)
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
  return rows.filter((r) => r.some((f) => f.trim()));
}

const [header, ...body] = parseCsv(fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
const col = (name) => {
  const i = header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  if (i < 0) throw new Error(`Columna no encontrada: ${name}`);
  return i;
};
const C = {
  amb: col('Código de Embajador'), code: col('Código de Producto'), name: col('Nombre del Producto'),
  desc: col('Descripción del Producto'), format: col('Formato del Empaque'), weight: col('Peso Aproximado por unidad (Gr.)'),
  h: col('Alto Aproximado por unidad (cm)'), w: col('Ancho Aproximado por unidad (cm)'), d: col('Profundidad Aproximada por unidad (cm)'),
  photo: col('Foto referencia de producto'), stock: col('Stock disponible'), price: col('Precio de Venta'),
};

const num = (s) => {
  const n = Number(String(s ?? '').trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && String(s).trim() !== '' ? n : null;
};
// Correcciones de ortografía frecuentes en la hoja (no cambian el sentido).
const FIXES = [
  [/\bartesanel\b/gi, 'artesanal'], [/\bhem[eé]tico\b/gi, 'hermético'], [/\baluminazada\b/gi, 'aluminizada'],
  [/\benergia\b/gi, 'energía'], [/\bmal altos\b/gi, 'más altos'], [/\bamazonico\b/gi, 'amazónico'],
  [/\bchocolatina al\b/gi, 'Chocolatinas al'],
];
const clean = (s) => {
  let t = String(s ?? '').replace(/\s+/g, ' ').trim();
  for (const [re, to] of FIXES) t = t.replace(re, to);
  // Textos escritos todo en MAYÚSCULAS -> oración normal.
  if (t.length > 12 && t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t)) t = t.charAt(0) + t.slice(1).toLowerCase();
  if (t && /^[a-záéíóúñ]/.test(t)) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
};
const driveId = (url) => (String(url).match(/[?&]id=([\w-]+)/) || String(url).match(/\/d\/([\w-]+)/) || [])[1] || null;

const rows = new Map();
for (const r of body) {
  const code = r[C.code].trim();
  if (!code) continue;
  rows.set(code, {
    code, amb: r[C.amb].trim(), csvName: r[C.name], description: clean(r[C.desc]),
    pkg: {
      format: clean(r[C.format]) || null, weight_g: num(r[C.weight]),
      height_cm: num(r[C.h]), width_cm: num(r[C.w]), depth_cm: num(r[C.d]),
    },
    photo: driveId(r[C.photo]), stock: num(r[C.stock]) ?? 0, price: num(r[C.price]),
  });
}

// ---------------------------------------------------------------------------
// Catálogo: agrupación y textos de vitrina.
//  v: [código, sufijo SKU, nombre de la presentación]
//  photos: códigos extra cuyas fotos se suman a la galería (sin crear producto)
// ---------------------------------------------------------------------------
const M = {
  coffee: (label = 'Café especial') => ({ art: 'tea', colors: ['#F3E6D8', '#4A2C1E'], label }),
  bar: (label) => ({ art: 'bar', colors: ['#FCEFC2', '#6B2F22'], ...(label && { label }) }),
  ball: (label) => ({ art: 'ball', colors: ['#F6E7C9', '#5A2E1E'], ...(label && { label }) }),
  jar: (label) => ({ art: 'jar', colors: ['#FFF4CC', '#E59A00'], ...(label && { label }) }),
  achira: { art: 'achira', colors: ['#FDEBD0', '#D98A1F'] },
  craft: (label) => ({ art: 'bar', colors: ['#F7E6DA', '#B14A3A'], label }),
  beer: (label) => ({ art: 'bar', colors: ['#FFF1C7', '#B8741A'], label }),
  jewel: (label) => ({ art: 'bar', colors: ['#F7EFD9', '#8A6A1F'], label }),
  care: (label) => ({ art: 'tea', colors: ['#EEF2EC', '#5E6B62'], label }),
  tea: { art: 'tea', colors: ['#E8EFE2', '#0B7A3B'] },
  swim: { art: 'swim', colors: ['#DDF0F2', '#0B7A3B'] },
};

const GROUPS = [
  // EM0001 · La Petit Huila
  { key: 'petit-achiras', cat: 'TIP', name: 'Achiras tradicionales huilenses', short: '100% naturales y artesanales, en bolsa kraft con cierre hermético.', badges: ['Típico'], featured: true, mockup: M.achira,
    v: [['EM0001_4', '60G', '60 g'], ['EM0001_1', '140G', '140 g']] },
  { key: 'petit-geisha', cat: 'CAF', name: 'Café exótico Geisha · tueste medio', short: 'Pitalito, 1.850 msnm. Proceso honey y secado natural.', mockup: M.coffee('Café Geisha'),
    v: [['EM0001_11', 'G250', 'Grano · 250 g'], ['EM0001_2', 'M250', 'Molido · 250 g'], ['EM0001_10', 'G500', 'Grano · 500 g'], ['EM0001_12', 'M500', 'Molido · 500 g']] },
  { key: 'petit-pacamara', cat: 'CAF', name: 'Café exótico Pacamara en grano · 500 g', short: 'Pitalito, 1.800 msnm. Proceso honey y secado natural.', mockup: M.coffee('Café Pacamara'),
    v: [['EM0001_3']], photos: ['EM0001_6'] },
  { key: 'petit-bourbon', cat: 'CAF', name: 'Café especial Bourbon Rosado · tueste medio', short: 'Pitalito, 1.800 msnm. Proceso honey y secado natural.', mockup: M.coffee('Bourbon Rosado'),
    v: [['EM0001_7', 'G250', 'Grano · 250 g'], ['EM0001_9', 'M250', 'Molido · 250 g'], ['EM0001_5', 'G500', 'Grano · 500 g'], ['EM0001_8', 'M500', 'Molido · 500 g']] },

  // EM0003 · BRIED Chocolatería
  { key: 'bried-100', cat: 'CHO', name: 'Chocolate de mesa 100% cacao', short: 'Sin endulzantes, desde nuestro cultivo. Caja de 250 g.', mockup: M.bar(), v: [['EM0003_1']] },
  { key: 'bried-cardamomo', cat: 'CHO', name: 'Chocolate de mesa 100% cacao con cardamomo y canela', short: 'Sin endulzantes, con cardamomo y canela. Caja de 250 g.', badges: ['Más vendido'], mockup: M.bar(), v: [['EM0003_2']] },
  { key: 'bried-nuez', cat: 'CHO', name: 'Chocolate de mesa 100% cacao con nuez moscada y clavos', short: 'Sin endulzantes, con nuez moscada y clavos. Bolsa de 250 g.', mockup: M.bar(), v: [['EM0003_3']] },
  { key: 'bried-nibs', cat: 'CHO', name: 'Nibs de cacao', short: 'Cacao tostado 100% natural y crujiente. 150 g.', mockup: M.bar('Nibs de cacao'), v: [['EM0003_4']] },
  { key: 'bried-almendra', cat: 'CHO', name: 'Almendra de cacao tostada', short: 'Grano tostado con su cascarilla natural. 300 g.', mockup: M.bar('Cacao tostado'), v: [['EM0003_5']] },

  // EM0004 · Chocolate Mamá Susana
  { key: 'susana-tradicional', cat: 'CHO', name: 'Chocolate de mesa artesanal tradicional en bolitas', short: 'Cacao huilense con panela, canela y clavos.', badges: ['Ganador FICCA 2024'], featured: true, mockup: M.ball(),
    v: [['EM0004_1', '250G', '250 g'], ['EM0004_2', '1KG', '1 kg · 50 bolitas']] },
  { key: 'susana-100', cat: 'CHO', name: 'Chocolate de mesa artesanal 100% cacao en bolitas', short: 'Sin azúcar añadida, con clavos y canela. 125 g.', mockup: M.ball(), v: [['EM0004_3']] },
  { key: 'susana-nibs', cat: 'CHO', name: 'Nibs de cacao tostados', short: '100% cacao, textura crujiente. 125 g.', mockup: M.bar('Nibs de cacao'), v: [['EM0004_4']] },
  { key: 'susana-nibs-choco', cat: 'CHO', name: 'Nibs de cacao cubiertos con chocolate al 60%', short: 'Un snack crujiente y lleno de energía. 125 g.', mockup: M.bar('Nibs con chocolate'), v: [['EM0004_5']] },

  // EM0005 · ARTBACU
  { key: 'artbacu-pocillo', cat: 'ART', name: 'Pocillo chocolatero tallado "Huilensidad"', short: 'Pocillo para servir a la mesa, alusivo al Huila.', mockup: M.craft('Pocillo tallado'), v: [['EM0005_1']] },

  // EM0006 · APIFIT
  { key: 'apifit-miel', cat: 'MIE', name: 'Miel de abejas natural', short: 'Miel pura de abejas del Huila.', featured: true, mockup: M.jar(),
    v: [['EM0006_4', '450G', '450 g · frasco de vidrio'], ['EM0006_1', '500G', '500 g · botella']] },
  { key: 'apifit-jengibre', cat: 'MIE', name: 'Miel con jengibre y limón', short: 'Frasco de vidrio de 250 g.', mockup: M.jar('Miel y jengibre'), v: [['EM0006_2']] },
  { key: 'apifit-propoleo', cat: 'MIE', name: 'Propóleo con miel, eucalipto y extracto de marañón', short: 'Frasco de vidrio de 300 g.', mockup: M.jar('Propóleo y miel'), v: [['EM0006_3']] },
  { key: 'apifit-cacao', cat: 'MIE', name: 'Miel con cacao', short: 'Frasco de vidrio de 250 g.', mockup: M.jar('Miel y cacao'), v: [['EM0006_5']] },

  // EM0007 · Bambuqueras
  { key: 'bambuqueras-achiras', cat: 'TIP', name: 'Achiras Bambuqueras', short: 'Achiras huilenses en caja de 75 g.', mockup: M.achira, v: [['EM0007_1']] },

  // EM0008 · Macchi Infinite
  { key: 'macchi-ecru', cat: 'ART', name: 'Abanico Écru en madera de cedro', short: 'Pieza de estilo con estructura en cedro achapo.', mockup: M.craft('Abanico'),
    v: [['EM0008_2', 'C24', 'Compact · 24 cm'], ['EM0008_1', 'S28', 'Standard · 28 cm']] },
  { key: 'macchi-noche', cat: 'ART', name: 'Abanico Noche Standard · 28 cm', short: 'La versión más imponente, en cedro achapo.', mockup: M.craft('Abanico'), v: [['EM0008_3']] },
  { key: 'macchi-panthere', cat: 'ART', name: 'Abanico Panthère Compact · 24 cm', short: 'Versátil, cómodo y sofisticado.', mockup: M.craft('Abanico'), v: [['EM0008_4']] },

  // EM0009 · Chocolatería Shalena
  { key: 'shalena-barra', cat: 'CHO', name: 'Chocolate de mesa en barra 100% cacao · 250 g', short: 'Barra de chocolate de mesa 100% cacao.', mockup: M.bar(), v: [['EM0009_1']] },
  { key: 'shalena-sabores', cat: 'CHO', name: 'Chocolate al 55%: amazónico, mexicano, enchilado, sal y pimienta', short: 'Chocolate de consumo directo, 45 g.', mockup: M.bar(), v: [['EM0009_2']] },
  { key: 'shalena-chocolatinas', cat: 'CHO', name: 'Chocolatinas al 55%, 70% y 75%', short: 'Chocolate de consumo directo, 90 g.', mockup: M.bar(), v: [['EM0009_3']] },
  { key: 'shalena-intenso', cat: 'CHO', name: 'Chocolate intenso al 80% y 90%', short: 'Chocolate de consumo directo, 90 g.', mockup: M.bar(), v: [['EM0009_4']] },
  { key: 'shalena-nibs', cat: 'CHO', name: 'Nibs de cacao caramelizados', short: 'Bolsa de 50 g.', mockup: M.bar('Nibs de cacao'), v: [['EM0009_5']] },

  // EM0010 · TACHACOA
  { key: 'tachacoa-100', cat: 'CHO', name: 'Chocolate de mesa en bola 100% cacao con nuez moscada, canela y clavos', short: 'Bolsa de 20 bolas.', mockup: M.ball(), v: [['EM0010_1']] },
  { key: 'tachacoa-40', cat: 'CHO', name: 'Chocolate de mesa en bola 40% con nuez moscada, canela y clavos', short: 'Receta tradicional del desierto de la Tatacoa.', mockup: M.ball(),
    v: [['EM0010_2', '10U', '10 bolas · 250 g'], ['EM0010_3', '20U', '20 bolas · 500 g']] },

  // EM0011 · Café Horizonte FC
  { key: 'horizonte-cafe', cat: 'CAF', name: 'Café especial Café Horizonte', short: 'Notas cítricas, achocolatadas y apaneladas. Incluye una semilla para sembrar.', mockup: M.coffee('Café Horizonte'),
    v: [['EM0011_3', '125G', '125 g · molido'], ['EM0011_2', '250G', '250 g · molido'], ['EM0011_1', '500G', '500 g · grano o molido']] },

  // EM0012 · Cervecería Indian (+18)
  { key: 'indian-pureza', cat: 'TEB', name: 'Cerveza artesanal INDIAN · Pureza Alemana', short: 'Malta, lúpulo, levadura y agua, según la ley de pureza alemana.', age: true, mockup: M.beer('Cerveza artesanal'), v: [['EM0012_1']] },
  { key: 'indian-gaitana', cat: 'TEB', name: 'Cerveza Gaitana Dorada · caja x 24', short: 'Tributo a la cacica Gaitana. 100% malta Pilsen, 5% a 5,5% de alcohol.', age: true, mockup: M.beer('Gaitana Dorada'), v: [['EM0012_2']] },
  { key: 'indian-serrania', cat: 'TEB', name: 'Cerveza Serranía Roja · caja x 24', short: 'Homenaje a la Serranía de Chiribiquete. 5% a 5,5% de alcohol.', age: true, mockup: M.beer('Serranía Roja'), v: [['EM0012_3']] },

  // EM0014 · Maca Joyas
  { key: 'maca-cafe', cat: 'MOD', name: 'Candongas Grano de Café', short: 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', mockup: M.jewel('Joyería'), v: [['EM0014_1']] },
  { key: 'maca-cholupa', cat: 'MOD', name: 'Candongas Flor de Cholupa', short: 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', mockup: M.jewel('Joyería'), v: [['EM0014_2']] },
  { key: 'maca-chiva', cat: 'MOD', name: 'Candongas Chiva', short: 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', mockup: M.jewel('Joyería'), v: [['EM0014_3']] },
  { key: 'maca-sanjuanero', cat: 'MOD', name: 'Candongas Pareja del Sanjuanero', short: 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', mockup: M.jewel('Joyería'), v: [['EM0014_4']] },
  { key: 'maca-collar', cat: 'MOD', name: 'Collar Raíces', short: 'Chiva, cholupa, Sanjuanero, café y el Águila de San Agustín en una joya.', mockup: M.jewel('Joyería'), v: [['EM0014_5']] },

  // EM0002 · Adames Resortwear
  { key: 'adames-boyaca', cat: 'MOD', name: 'Vestido de baño Boyacá', short: 'Enterizo con escote cuadrado tejido y panty anudado.', badges: ['Diseño huilense'], mockup: M.swim, v: [['EM0002_1']] },

  // EM0016 · María Rivas
  { key: 'acacias-fit', cat: 'TEB', name: 'Acacias Fit · té natural', short: 'Té natural en bolsitas.', mockup: M.tea, v: [['EM0016_1']] },

  // EM0015 · María Victoria Alarcón
  { key: 'mva-shampoo', cat: 'CUI', name: 'Shampoo de romero y extracto de café', short: 'Estimula el crecimiento y aporta brillo. 450 g.', mockup: M.care('Shampoo'), v: [['EM0015_1']] },
  { key: 'mva-acondicionador', cat: 'CUI', name: 'Acondicionador de coco', short: 'Brillo y suavidad sin siliconas pesadas. 450 g.', mockup: M.care('Acondicionador'), v: [['EM0015_2']] },
  { key: 'mva-coctel', cat: 'CUI', name: 'Cóctel capilar de frutas y aceites vegetales', short: 'Nutrición profunda para el cabello. 300 g.', mockup: M.care('Cóctel capilar'), v: [['EM0015_3']] },
];

// Textos del catálogo PDF: reemplazan nombre/corta/descripción donde existan.
for (const g of GROUPS) {
  const t = TEXTS[g.key];
  if (!t?.description) throw new Error(`${g.key}: falta su descripción en catalog-texts.mjs`);
  if (t.name) g.name = t.name;
  if (t.short) g.short = t.short;
  g.description = t.description;
}
for (const key of Object.keys(TEXTS)) if (!GROUPS.some((g) => g.key === key)) throw new Error(`catalog-texts.mjs: ${key} no existe en GROUPS`);

// Kits: solo con productos sin presentaciones (el kit lleva una unidad fija).
// Precio PROVISIONAL ≈ 8% menos que por separado; el admin lo ajusta.
const KITS = [
  { name: 'Ruta del Cacao', tagline: '3 embajadores · 3 municipios', bg: '#0B7A3B', fg: '#FFFFFF', art: 'ball', badge: 'El más regalado', items: ['susana-100', 'bried-cardamomo', 'shalena-sabores'] },
  { name: 'Tarde en la Tatacoa', tagline: 'Onces huilenses para compartir', bg: '#F2B705', fg: '#2F3A33', art: 'achira', badge: null, items: ['bambuqueras-achiras', 'tachacoa-100', 'acacias-fit'] },
  { name: 'Dulce del Sur', tagline: 'Del macizo a tu mesa', bg: '#F39200', fg: '#2F3A33', art: 'jar', badge: null, items: ['apifit-jengibre', 'bambuqueras-achiras', 'shalena-sabores'] },
];

// ---------------------------------------------------------------------------
// Validación: cada fila del CSV termina en un producto, presentación o foto.
// ---------------------------------------------------------------------------
const used = new Map();
for (const g of GROUPS) {
  for (const [code] of g.v) used.set(code, g.key);
  for (const code of g.photos || []) used.set(code, g.key);
  for (const [code] of g.v) if (!rows.has(code)) throw new Error(`${g.key}: el código ${code} no está en la hoja`);
}
const missing = [...rows.keys()].filter((c) => !used.has(c));
if (missing.length) throw new Error(`Filas sin ubicar en GROUPS: ${missing.join(', ')}`);
for (const k of KITS) for (const key of k.items) {
  const g = GROUPS.find((x) => x.key === key);
  if (!g) throw new Error(`Kit ${k.name}: no existe ${key}`);
  if (g.v.length > 1) throw new Error(`Kit ${k.name}: ${key} tiene presentaciones`);
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
const arr = (a = []) => (a.length ? `array[${a.map(q).join(', ')}]` : `'{}'::text[]`);
const photo = (code) => {
  const file = path.join(photoDir, `${code}.webp`);
  if (!fs.existsSync(file)) return null;
  const meta = fs.existsSync(`${file}.json`) ? JSON.parse(fs.readFileSync(`${file}.json`, 'utf8')) : {};
  return { url: `/img/products/${code}.webp`, thumb: `/img/products/${code}-400.webp`, width: meta.width ?? null, height: meta.height ?? null };
};
const pkg = (r) => Object.fromEntries(Object.entries(r.pkg).filter(([, v]) => v !== null));

let sql = `-- =====================================================================
-- Semilla 03 · Catálogo real de los embajadores (${GROUPS.length} productos).
-- GENERADO por scripts/build-product-seed.mjs desde private/productos.csv.
-- No lo edites a mano: corrige la hoja o GROUPS y vuelve a generarlo.
--  · SKU y slug los genera la base (trigger); supplier_code = código del embajador.
--  · Presentaciones (peso, grano/molido, unidades) = variantes con su precio y stock.
--  · Calificaciones en 0: aún no hay reseñas reales.
-- =====================================================================

create temporary table seed_products (key text primary key, product_id uuid not null);
`;

let n = 0;
let photos = 0;
for (const g of GROUPS) {
  n += 1;
  const vrows = g.v.map(([code, suffix, label]) => ({ ...rows.get(code), suffix, label }));
  const first = vrows[0];
  const prices = vrows.map((r) => r.price);
  const base = Math.min(...prices);
  const stock = vrows.reduce((s, r) => s + r.stock, 0);
  const amb = first.amb;
  for (const r of vrows) if (r.amb !== amb) throw new Error(`${g.key}: mezcla embajadores`);
  const desc = g.description;
  // created_at escalonado: orden estable de "Lo más pedido" mientras no hay ventas.
  sql += `
-- ${g.key} (${g.v.map((x) => x[0]).join(', ')})
with p as (
  insert into public.products (ambassador_id, category_id, name, short_description, description, price, stock, weight_grams,
                               badges, mockup, is_featured, is_age_restricted, supplier_code, package, status, approved_at, created_at)
  select a.id, c.id, ${q(g.name)}, ${q(g.short)}, ${q(desc)}, ${base}, ${stock}, ${vrows.length === 1 && first.pkg.weight_g ? Math.round(first.pkg.weight_g) : 'null'},
         ${arr(g.badges)}, ${j(g.mockup)}, ${!!g.featured}, ${!!g.age}, ${q(vrows.length === 1 ? first.code : null)}, ${vrows.length === 1 ? j(pkg(first)) : 'null'},
         'aprobado', now(), now() - make_interval(mins => ${1000 - n})
  from public.ambassadors a, public.categories c where a.code = ${q(amb)} and c.code = ${q(g.cat)}
  returning id
)
insert into seed_products select ${q(g.key)}, id from p;
`;
  if (vrows.length > 1) {
    vrows.forEach((r, i) => {
      const img = photo(r.code);
      sql += `insert into public.product_variants (product_id, sku_suffix, name, attributes, price_override, stock, sort_order)
select product_id, ${q(r.suffix)}, ${q(r.label)}, ${j({ supplier_code: r.code, ...pkg(r), ...(img && { image: img.url }) })}, ${r.price === base ? 'null' : r.price}, ${r.stock}, ${i} from seed_products where key = ${q(g.key)};
`;
    });
  }
  const imgs = [...g.v.map((x) => x[0]), ...(g.photos || [])].map(photo).filter(Boolean);
  imgs.forEach((img, i) => {
    photos += 1;
    sql += `insert into public.product_images (product_id, url, thumb_url, alt, width, height, sort_order)
select product_id, ${q(img.url)}, ${q(img.thumb)}, ${q(g.name)}, ${img.width ?? 'null'}, ${img.height ?? 'null'}, ${i} from seed_products where key = ${q(g.key)};
`;
  });
}

sql += `
-- Kits (precio PROVISIONAL ≈ 8% menos que por separado; el admin lo ajusta y decide cuáles van al home)
`;
KITS.forEach((k, i) => {
  const sum = k.items.reduce((s, key) => s + rows.get(GROUPS.find((g) => g.key === key).v[0][0]).price, 0);
  const price = Math.floor((sum * 0.92) / 1000) * 1000;
  sql += `
with k as (
  insert into public.kits (name, tagline, price, bg_color, fg_color, mockup, badge, is_active, show_on_home, sort_order)
  values (${q(k.name)}, ${q(k.tagline)}, ${price}, ${q(k.bg)}, ${q(k.fg)}, ${j({ art: k.art })}, ${q(k.badge)}, true, true, ${i + 1})
  returning id
)
insert into public.kit_items (kit_id, product_id, sort_order)
select k.id, s.product_id, x.ord from k, (values ${k.items.map((key, o) => `(${q(key)}, ${o})`).join(', ')}) x(key, ord)
join seed_products s on s.key = x.key;
`;
});

fs.writeFileSync(outPath, sql);

if (wantTexts) {
  const textsPath = path.join(root, 'supabase', 'snippets', 'textos_catalogo.sql');
  const values = GROUPS.map((g) => {
    const codes = [...g.v.map((x) => x[0]), ...(g.photos || [])];
    return `  (${q(g.key)}, ${arr(codes)}, ${q(g.name)}, ${q(g.short)}, ${q(g.description)})`;
  }).join(',\n');
  fs.writeFileSync(textsPath, `-- =====================================================================
-- Textos del catálogo (Catalogo_Mercado_Origen.pdf) en una base ya poblada.
-- GENERADO por: node scripts/build-product-seed.mjs --textos
-- Actualiza nombre, descripción corta y descripción. No toca precios, stock,
-- fotos ni slugs (el slug solo se fija al crear el producto).
-- Ejecútalo en Supabase > SQL Editor. Corre en una transacción.
-- =====================================================================
begin;
set local app.trusted = 'on';

create temporary table new_texts (key text primary key, codes text[] not null, name text not null,
                                  short_description text, description text not null) on commit drop;
insert into new_texts (key, codes, name, short_description, description) values
${values};

-- Cada producto se ubica por su código del embajador (producto o presentación).
create temporary table targets on commit drop as
select distinct t.key, p.id as product_id
  from new_texts t
  join public.products p
    on p.supplier_code = any(t.codes)
    or p.id in (select v.product_id from public.product_variants v where v.attributes->>'supplier_code' = any(t.codes));

update public.products p
   set name = t.name, short_description = t.short_description, description = t.description
  from targets x join new_texts t on t.key = x.key
 where p.id = x.product_id
   and (p.name, p.short_description, p.description) is distinct from (t.name, t.short_description, t.description);

-- Revisión: textos que no encontraron su producto en la base
select t.key, t.codes from new_texts t where not exists (select 1 from targets x where x.key = t.key) order by 1;

commit;
`);
  console.log(`Escrito: ${path.relative(root, textsPath)}`);
}
const variants = GROUPS.reduce((s, g) => s + (g.v.length > 1 ? g.v.length : 0), 0);
console.log(`${rows.size} filas → ${GROUPS.length} productos (${variants} presentaciones) · ${photos} fotos · ${KITS.length} kits`);
console.log(`Escrito: ${path.relative(root, outPath)}`);
