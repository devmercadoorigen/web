#!/usr/bin/env node
/**
 * Prepara las fotos de los productos de la hoja para la web.
 *
 *   node scripts/fetch-product-photos.mjs [--force]
 *
 * Para cada código (EM0001_2) busca la foto en este orden:
 *   1. private/fotos/<código>.(jpg|jpeg|png|webp|heic)  ← si las descargaste a mano
 *   2. El enlace de Google Drive de la hoja (solo funciona si el archivo está
 *      compartido como "Cualquier persona con el enlace").
 * Y genera en public/img/products/:
 *   <código>.webp      lado mayor 1200 px (página del producto)
 *   <código>-400.webp  400 px (tarjetas, carrito, buscador)
 *   <código>.webp.json ancho y alto (evita saltos de diseño)
 *   <código>.jpg       1200×630 para vistas previas en WhatsApp/Facebook
 * Las que no consiga quedan listadas en private/fotos-pendientes.txt.
 * Después corre: node scripts/build-product-seed.mjs  (y npm run db:reset)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { driveId, readSheet } from './lib/csv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const outDir = path.join(root, 'public', 'img', 'products');
const localDir = path.join(root, 'private', 'fotos');
fs.mkdirSync(outDir, { recursive: true });

const { rows, col } = readSheet(path.join(root, 'private', 'productos.csv'));
const C = { code: col('Código de Producto'), name: col('Nombre del Producto'), photo: col('Foto referencia de producto') };

async function fromDrive(id) {
  const res = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, { redirect: 'follow' });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/')) return null;   // privado o no es imagen
  return Buffer.from(await res.arrayBuffer());
}

function fromLocal(code) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'heic', 'JPG', 'JPEG', 'PNG']) {
    const f = path.join(localDir, `${code}.${ext}`);
    if (fs.existsSync(f)) return fs.readFileSync(f);
  }
  return null;
}

let done = 0, skipped = 0;
const pending = [];
for (const r of rows) {
  const code = r[C.code].trim();
  if (!code) continue;
  const target = path.join(outDir, `${code}.webp`);
  if (!force && fs.existsSync(target)) { skipped++; continue; }
  const id = driveId(r[C.photo]);
  let buf = fromLocal(code);
  if (!buf && id) {
    try { buf = await fromDrive(id); } catch { buf = null; }
  }
  if (!buf) {
    pending.push(`${code}\t${r[C.name].replace(/\s+/g, ' ').trim()}\t${r[C.photo] || '(sin foto en la hoja)'}`);
    continue;
  }
  const img = sharp(buf, { failOn: 'none' }).rotate();
  const { data, info } = await img.clone().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  fs.writeFileSync(target, data);
  fs.writeFileSync(`${target}.json`, JSON.stringify({ width: info.width, height: info.height }));
  await img.clone().resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 76 })
    .toFile(path.join(outDir, `${code}-400.webp`));
  await img.clone().resize(1200, 630, { fit: 'contain', background: '#FAFAF6' }).jpeg({ quality: 78, mozjpeg: true })
    .toFile(path.join(outDir, `${code}.jpg`));
  done++;
  console.log(`✓ ${code} (${info.width}×${info.height}, ${Math.round(data.length / 1024)} KB)`);
}

const list = path.join(root, 'private', 'fotos-pendientes.txt');
if (pending.length) {
  fs.writeFileSync(list, `código\tproducto\tenlace\n${pending.join('\n')}\n`);
} else if (fs.existsSync(list)) fs.rmSync(list);
console.log(`\n${done} fotos nuevas · ${skipped} ya estaban · ${pending.length} pendientes${pending.length ? ` (ver ${path.relative(root, list)})` : ''}`);
if (pending.length) {
  console.log('Para las pendientes: comparte la carpeta de Drive como "Cualquier persona con el enlace" y vuelve a correr,');
  console.log('o descárgalas a private/fotos/ con el código como nombre (EM0001_2.jpg).');
}
