#!/usr/bin/env node
/**
 * Optimiza las imágenes fijas del sitio (public/img, sin las de productos).
 *
 *   node scripts/optimize-site-images.mjs
 *
 * Por cada .jpg/.png genera WebP en varios anchos junto al original:
 *   tatacoa.jpg -> tatacoa-480.webp, tatacoa-960.webp, tatacoa-1600.webp
 * y escribe src/lib/image-manifest.json con ancho, alto y anchos disponibles,
 * que usa <Img> para armar srcset y fijar dimensiones (sin saltos de diseño).
 * Los créditos de Wikimedia (public/img/found/credits.json) no cambian.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const WIDTHS = [480, 960, 1600];
const SPECIAL = {};

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'products') walk(f); }
    else if (/\.(jpe?g|png)$/i.test(e.name)) files.push(f);
  }
})(path.join(pub, 'img'));

const manifest = {};
for (const file of files) {
  const url = '/' + path.relative(pub, file).split(path.sep).join('/');
  const { width, height } = await sharp(file).metadata();
  const targets = (SPECIAL[url] || WIDTHS).filter((w) => w < width).concat(width <= Math.max(...(SPECIAL[url] || WIDTHS)) ? [width] : []);
  const widths = [...new Set(targets)].sort((a, b) => a - b);
  for (const w of widths) {
    const out = file.replace(/\.(jpe?g|png)$/i, `-${w}.webp`);
    if (!fs.existsSync(out)) await sharp(file).resize({ width: w }).webp({ quality: url.includes('logo') ? 90 : 72 }).toFile(out);
  }
  manifest[url] = { w: width, h: height, widths };
  const kb = (f) => Math.round(fs.statSync(f).size / 1024);
  console.log(`${url} ${width}×${height} ${kb(file)} KB -> ${widths.map((w) => `${w}w ${kb(file.replace(/\.(jpe?g|png)$/i, `-${w}.webp`))} KB`).join(', ')}`);
}

// Íconos desde el carrito vectorial del logo (public/brand/carrito.svg): el texto no se lee a 64 px.
const cart = path.join(pub, 'brand', 'carrito.svg');
const icon = (size, pad, bg) => sharp(cart, { density: 600 }).resize(size - pad * 2, size - pad * 2, { fit: 'contain', background: '#0000' })
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: bg }).flatten(bg === '#0000' ? false : { background: bg }).png();
await icon(64, 2, '#0000').toFile(path.join(pub, 'favicon-64.png'));
await icon(180, 22, '#ffffff').toFile(path.join(pub, 'apple-touch-icon.png'));
await icon(512, 64, '#ffffff').toFile(path.join(pub, 'icon-512.png'));

fs.writeFileSync(path.join(root, 'src', 'lib', 'image-manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`\n${files.length} imágenes · manifiesto en src/lib/image-manifest.json`);
