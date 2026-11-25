import { useRef, useState } from 'react';
import { Icon } from '../../components/ui.jsx';
import { compressImage } from './images.js';

export const MAX_PHOTOS = 8;

/**
 * Fotos del producto: arrastrar y soltar (o tocar para elegir), optimización
 * en el navegador, vista previa y orden (la primera es la portada).
 * Cada item: { key, id?, url?, thumb_url?, preview, blob?, thumbBlob?, width, height, alt }
 */
export function ImageManager({ images, onChange, onError }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [dragKey, setDragKey] = useState(null);

  const addFiles = async (files) => {
    const room = MAX_PHOTOS - images.length;
    const list = [...files].slice(0, Math.max(0, room));
    if (files.length > room) onError?.(`Puedes subir hasta ${MAX_PHOTOS} fotos por producto.`);
    setBusy((b) => b + list.length);
    const added = [];
    for (const file of list) {
      try {
        const main = await compressImage(file, { max: 1600 });
        const thumb = await compressImage(file, { max: 480, quality: 0.78 });
        added.push({ key: crypto.randomUUID(), preview: URL.createObjectURL(main.blob), blob: main.blob, thumbBlob: thumb.blob, width: main.width, height: main.height, alt: '' });
      } catch (e) {
        onError?.(e.message);
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (added.length) onChange((prev) => [...prev, ...added]);
  };

  const move = (i, dir) => onChange((prev) => {
    const next = [...prev];
    const j = i + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const remove = (key) => onChange((prev) => prev.filter((x) => x.key !== key));
  const dropOn = (targetKey) => {
    if (!dragKey || dragKey === targetKey) return;
    onChange((prev) => {
      const from = prev.findIndex((x) => x.key === dragKey);
      const to = prev.findIndex((x) => x.key === targetKey);
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
    setDragKey(null);
  };

  return (
    <div className="imgm">
      <div
        className={`imgm-drop${over ? ' over' : ''}`}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
      >
        <Icon name="gift" size={28} stroke={1.8} />
        <b>Arrastra tus fotos aquí</b>
        <span>o <button type="button" className="link-btn" onClick={() => input.current?.click()}>elígelas desde tu equipo o celular</button></span>
        <small>Hasta {MAX_PHOTOS} fotos · JPG, PNG o WebP · las optimizamos por ti. Fondo claro y buena luz natural venden más.</small>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {(images.length > 0 || busy > 0) && (
        <ol className="imgm-grid">
          {images.map((img, i) => (
            <li
              key={img.key}
              className={`imgm-item${dragKey === img.key ? ' dragging' : ''}`}
              draggable
              onDragStart={() => setDragKey(img.key)}
              onDragEnd={() => setDragKey(null)}
              onDragOver={(e) => dragKey && e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); dropOn(img.key); }}
            >
              <img src={img.preview || img.thumb_url || img.url} alt={img.alt || `Foto ${i + 1}`} />
              {i === 0 && <span className="imgm-cover">Portada</span>}
              <div className="imgm-tools">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda"><Icon name="arrow" size={16} stroke={2.4} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Mover a la derecha"><Icon name="arrow" size={16} stroke={2.4} /></button>
                <button type="button" onClick={() => remove(img.key)} aria-label="Quitar foto" className="imgm-del"><Icon name="close" size={16} stroke={2.4} /></button>
              </div>
            </li>
          ))}
          {Array.from({ length: busy }, (_, i) => <li key={`b${i}`} className="imgm-item skeleton" aria-label="Optimizando foto…" />)}
        </ol>
      )}
    </div>
  );
}
