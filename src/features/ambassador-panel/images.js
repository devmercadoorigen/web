import { supabase } from '../../lib/supabase.js';

/*
 * Optimización de imágenes en el navegador antes de subir:
 *  · respeta la orientación de las fotos del celular (EXIF)
 *  · WebP (JPEG si el navegador no sabe codificar WebP), lado mayor ≤ max px
 */
async function toBlob(canvas, quality) {
  const webp = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality));
  if (webp && webp.type === 'image/webp') return webp;
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
}

export async function compressImage(file, { max = 1600, quality = 0.82 } = {}) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
    throw new Error(`"${file.name}" no es una foto (usa JPG, PNG o WebP).`);
  }
  if (file.size > 25 * 1024 * 1024) throw new Error(`"${file.name}" pesa más de 25 MB.`);
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`No pudimos leer "${file.name}". Prueba con otra foto en JPG o PNG.`);
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bmp, 0, 0, width, height);
  bmp.close?.();
  const blob = await toBlob(canvas, quality);
  if (!blob) throw new Error('No pudimos optimizar la foto.');
  return { blob, width, height };
}

/** Recorta el área elegida (en píxeles de la imagen) a un cuadrado de `size`. */
export async function cropToBlob(src, area, size = 512) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d').drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return toBlob(canvas, 0.86);
}

const ext = (blob) => (blob.type === 'image/webp' ? 'webp' : 'jpg');
export const newName = (blob, suffix = '') => `${crypto.randomUUID()}${suffix}.${ext(blob)}`;

export async function uploadPublic(bucket, path, blob) {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message?.includes('exceeded') ? 'La foto pesa demasiado después de optimizarla.' : 'No pudimos subir la foto. Revisa tu conexión.');
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Ruta interna del archivo a partir de su URL pública (para borrarlo). */
export const pathFromPublicUrl = (url, bucket) => {
  const marker = `/object/public/${bucket}/`;
  const i = url?.indexOf(marker) ?? -1;
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split('?')[0]) : null;
};
