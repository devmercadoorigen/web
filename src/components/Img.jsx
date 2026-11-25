import { forwardRef } from 'react';
import manifest from '../lib/image-manifest.json';

/*
 * Imágenes fijas del sitio en WebP con srcset (las genera
 * scripts/optimize-site-images.mjs). Si la ruta no está en el manifiesto
 * (p. ej. una imagen subida por el admin) se usa tal cual.
 */
const webp = (src, w) => src.replace(/\.(jpe?g|png)$/i, `-${w}.webp`);

export function imgProps(src, sizes = '100vw') {
  const m = src && manifest[src];
  if (!m) return { src };
  const mid = m.widths.find((w) => w >= 960) ?? m.widths[m.widths.length - 1];
  return {
    src: webp(src, mid),
    srcSet: m.widths.map((w) => `${webp(src, w)} ${w}w`).join(', '),
    sizes,
    width: m.w,
    height: m.h,
  };
}

/** <img> optimizado. `sizes` indica el ancho real en pantalla para elegir el archivo. */
export const Img = forwardRef(function Img({ src, sizes, ...rest }, ref) {
  return <img ref={ref} {...imgProps(src, sizes)} {...rest} />;
});
