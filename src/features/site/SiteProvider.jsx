import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { cachedQuery } from '../../lib/cache.js';

/*
 * Datos del sitio que antes estaban fijos en el código: zonas y municipios,
 * categorías, embajadores, preguntas frecuentes y textos editables.
 * Se cargan una vez y se cachean; el admin los invalida al editar ('site').
 */
async function fetchSite() {
  const [zones, cats, ambs, faqs, settings] = await Promise.all([
    supabase.from('subregions').select('id, name, slug, landmark, capital, altitude, ecosystem, facts, description, image_url, image_credit, fill_color, label_color, sort_order, municipalities (id, name, slug, map_x, map_y, label_anchor, sort_order)').order('sort_order'),
    supabase.from('categories').select('id, name, slug, code, tagline, image_url, color, tile, tint, sort_order').order('sort_order'),
    supabase.from('ambassadors').select('id, slug, code, brand_name, initials, avatar_url, banner_url, short_description, municipality_id, rating_avg, rating_count, sales_count, joined_at, badges:ambassador_badges (label, type, year, sort_order)').order('brand_name'),
    supabase.from('faqs').select('id, question, answer').order('sort_order'),
    supabase.from('site_settings').select('key, value'),
  ]);
  for (const r of [zones, cats, ambs, faqs, settings]) if (r.error) throw r.error;
  return {
    zones: zones.data.map((z) => ({ ...z, municipalities: [...z.municipalities].sort((a, b) => a.sort_order - b.sort_order) })),
    categories: cats.data,
    ambassadors: ambs.data.map((a) => ({ ...a, badges: [...a.badges].sort((x, y) => x.sort_order - y.sort_order) })),
    faqs: faqs.data,
    settings: Object.fromEntries(settings.data.map((s) => [s.key, s.value])),
  };
}

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const cache = useMemo(() => cachedQuery('site', fetchSite), []);
  const q = useQuery({ queryKey: ['site'], ...cache, staleTime: 10 * 60_000 });

  const value = useMemo(() => {
    const d = q.data ?? { zones: [], categories: [], ambassadors: [], faqs: [], settings: {} };
    const muniById = new Map();
    for (const z of d.zones) for (const m of z.municipalities) muniById.set(m.id, { ...m, zone: z });
    const ambassadors = d.ambassadors.map((a) => {
      const m = muniById.get(a.municipality_id);
      return { ...a, municipality: m, zone: m?.zone, award: a.badges.find((b) => b.type === 'premio')?.label };
    });
    const zoneBySlug = Object.fromEntries(d.zones.map((z) => [z.slug, z]));
    const withAmb = new Set(ambassadors.map((a) => a.municipality_id));
    return {
      ...d,
      ready: q.isSuccess,
      error: q.error,
      retry: q.refetch,
      ambassadors,
      zoneBySlug,
      municipalities: d.zones.flatMap((z) => z.municipalities.map((m) => ({ ...m, zone: z }))),
      hasAmbassador: (muniId) => withAmb.has(muniId),
      ambassadorBySlug: (slug) => ambassadors.find((a) => a.slug === slug),
      categoryBySlug: (slug) => d.categories.find((c) => c.slug === slug),
      counts: {
        municipalities: muniById.size,
        ambassadors: ambassadors.length,
        zones: d.zones.length,
      },
      contact: d.settings.contact || {},
      welcomeCoupon: d.settings.welcome_coupon?.code || null,
    };
  }, [q.data, q.isSuccess, q.error, q.refetch]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);

/** "**negrita**" -> <b>negrita</b> (textos editables desde el admin). */
export function RichText({ text }) {
  return String(text || '').split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : <span key={i}>{part}</span>
  );
}

export const waNumber = (contact) => (contact?.whatsapp || '+57 314 239 8821').replace(/\D/g, '');
