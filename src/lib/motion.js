import { useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
// En celulares la barra de direcciones cambia el alto al hacer scroll: no recalcular por eso.
ScrollTrigger.config({ ignoreMobileResize: true });

export const reduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;
export const getLenis = () => lenis;

// Desplaza suavemente hasta un selector, compensando el header fijo.
export function scrollToTarget(target, offset = -96) {
  let el = target;
  if (typeof target === 'string') {
    try { el = document.querySelector(target); } catch { return; }
  }
  if (!el) return;
  if (!lenis) {
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: reduced() ? 'auto' : 'smooth' });
    return;
  }
  // Lenis guarda el alto de la página: al llegar desde otra ruta sigue con el alto de la
  // anterior y se queda corto. Se recalcula antes de desplazar, y al terminar se comprueba
  // que la sección quedó en su sitio (imágenes o secciones que cargan tarde mueven el destino).
  let tries = 0;
  const go = (duration) => {
    lenis.resize();
    lenis.scrollTo(el, {
      offset, duration, force: true,
      onComplete: () => {
        if (!el.isConnected || ++tries > 3 || lenis.scroll >= lenis.limit - 1) return;
        if (Math.abs(el.getBoundingClientRect().top + offset) > 4) go(0.5);
      },
    });
  };
  go(1.2);
}

// Scroll suave (Lenis) sincronizado con ScrollTrigger; los enlaces #ancla también lo usan.
export function useSmoothScroll() {
  useEffect(() => {
    if (reduced()) return;
    lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time) => lenis?.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      let el = null;
      try { el = document.querySelector(a.getAttribute('href')); } catch { return; }
      if (!el) return;
      e.preventDefault();
      scrollToTarget(el);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenis = null;
    };
  }, []);
}

// Animaciones globales declarativas por atributo:
//   data-anim="up" | "fade" | "scale" | "left" | "right"   → entrada al aparecer (en lote, escalonada)
//   data-speed="0.2"                                        → parallax vertical
//   data-count="37"                                         → contador
export function useGlobalAnimations(deps = []) {
  useLayoutEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      const from = {
        up: { y: 48, opacity: 0 },
        fade: { opacity: 0 },
        scale: { scale: 0.92, opacity: 0 },
        left: { x: -60, opacity: 0 },
        right: { x: 60, opacity: 0 },
      };
      Object.entries(from).forEach(([kind, vars]) => {
        const els = gsap.utils.toArray(`[data-anim="${kind}"]`);
        if (!els.length) return;
        gsap.set(els, vars);
        ScrollTrigger.batch(els, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) => gsap.to(batch, { x: 0, y: 0, scale: 1, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: true }),
        });
      });

      gsap.utils.toArray('[data-speed]').forEach((el) => {
        const speed = parseFloat(el.dataset.speed);
        gsap.to(el, {
          yPercent: -speed * 100,
          ease: 'none',
          scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      gsap.utils.toArray('[data-count]').forEach((el) => {
        const end = parseFloat(el.dataset.count);
        ScrollTrigger.create({
          trigger: el,
          start: 'top 98%',
          once: true,
          onEnter: () => {
            const obj = { v: 0 };
            gsap.to(obj, { v: end, duration: 2, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString('es-CO')) });
          },
        });
      });
    });
    // Las fotos cambian la altura de la página al cargar: recalcula los disparadores,
    // agrupando las llamadas (cada recálculo mide toda la página).
    let timer;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => ScrollTrigger.refresh(), 200); };
    refresh();
    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh);
    const imgs = [...document.images].filter((i) => !i.complete);
    imgs.forEach((i) => i.addEventListener('load', refresh, { once: true }));
    return () => { clearTimeout(timer); window.removeEventListener('load', refresh); ctx.revert(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Inclinación 3D que sigue al cursor.
export function tilt(e, max = 8) {
  if (reduced()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
  el.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
  el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
  el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
}
export function untilt(e) {
  const el = e.currentTarget;
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
}

// Botón magnético: se acerca levemente al cursor.
export function magnet(e) {
  if (reduced()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' });
}
export function unmagnet(e) {
  gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
}

export { gsap, ScrollTrigger };
