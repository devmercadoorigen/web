import fs from 'node:fs';

/** CSV (RFC 4180: comillas, comas y saltos de línea dentro de campos). */
export function parseCsv(text) {
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

/** Lee la hoja y devuelve { rows, col(nombre) } con búsqueda de columnas sin mayúsculas. */
export function readSheet(file) {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const col = (name) => {
    const i = header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    if (i < 0) throw new Error(`Columna no encontrada: ${name}`);
    return i;
  };
  return { rows, col };
}

export const driveId = (url) => (String(url).match(/[?&]id=([\w-]+)/) || String(url).match(/\/d\/([\w-]+)/) || [])[1] || null;
