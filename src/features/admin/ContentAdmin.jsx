import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';
import { compressImage, newName, uploadPublic } from '../ambassador-panel/images.js';
import { Modal, Tabs } from './kit.jsx';

function useInvalidate() {
  const qc = useQueryClient();
  return () => { qc.invalidateQueries({ queryKey: ['admin'] }); qc.invalidateQueries({ queryKey: ['catalog'] }); qc.invalidateQueries({ queryKey: ['site'] }); };
}

async function uploadAsset(file, folder) {
  const { blob } = await compressImage(file, { max: 1600 });
  return uploadPublic('brand-assets', `${folder}/${newName(blob)}`, blob);
}

export default function ContentAdmin() {
  useTitle('Contenido');
  const [tab, setTab] = useState('categorias');
  return (
    <div className="pn-stack">
      <header className="pn-head"><h1>Contenido</h1><p className="muted">Lo que se muestra en la tienda: categorías, territorio, textos y preguntas frecuentes.</p></header>
      <Tabs tabs={[['categorias', 'Categorías'], ['zonas', 'Zonas'], ['municipios', 'Municipios'], ['textos', 'Textos y envíos'], ['faq', 'Preguntas frecuentes']]} value={tab} onChange={setTab} />
      {tab === 'categorias' && <Categories />}
      {tab === 'zonas' && <Zones />}
      {tab === 'municipios' && <Municipalities />}
      {tab === 'textos' && <SiteTexts />}
      {tab === 'faq' && <Faqs />}
    </div>
  );
}

/* ------------------------------------------------------------ Categorías */
const CAT_EMPTY = { name: '', code: '', tagline: '', image_url: '', color: '#0B7A3B', tile: 'mini', tint: '', is_consumable: false, is_active: true, sort_order: 0 };
function Categories() {
  const { notify } = useToast();
  const invalidate = useInvalidate();
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const q = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*, products (count)').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
  const save = async () => {
    setErr('');
    if (edit.name.trim().length < 3) return setErr('Escribe el nombre.');
    if (!/^[A-Z]{3}$/.test(edit.code)) return setErr('El código debe tener 3 letras mayúsculas (va en el SKU).');
    const row = { name: edit.name.trim(), code: edit.code, tagline: edit.tagline.trim() || null, image_url: edit.image_url || null, color: edit.color, tile: edit.tile, tint: edit.tint || null, is_consumable: edit.is_consumable, is_active: edit.is_active, sort_order: Number(edit.sort_order) || 0 };
    const { error } = edit.id
      ? await supabase.from('categories').update(row).eq('id', edit.id)
      : await supabase.from('categories').insert({ ...row, slug: row.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
    if (error) return setErr(error.code === '23505' ? 'Ya existe una categoría con ese nombre o código.' : friendlyError(error));
    setEdit(null);
    invalidate();
    notify('Categoría guardada');
  };
  const remove = async (c) => {
    if (!window.confirm(`¿Eliminar "${c.name}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) return notify(error.code === '23503' ? 'Tiene productos: desactívala en vez de eliminarla.' : friendlyError(error), 'error');
    invalidate();
  };
  return (
    <section className="panel">
      <div className="panel-row"><h2 className="panel-title">Categorías</h2><button type="button" className="btn btn-green btn-sm" onClick={() => setEdit({ ...CAT_EMPTY })}>Nueva categoría</button></div>
      <p className="muted small">Si una categoría no tiene productos publicados, la tienda muestra “Muy pronto”. El código de 3 letras forma el SKU y no se puede cambiar cuando ya hay productos.</p>
      <ul className="row-list">
        {(q.data || []).map((c) => (
          <li key={c.id}>
            <span className="swatch" style={{ background: c.color }} />
            <div><b>{c.name}</b> <span className="sku">{c.code}</span><span className="muted small">{c.tagline} · {c.products[0]?.count ?? 0} productos · forma: {c.tile}</span></div>
            {!c.is_active && <span className="pill pill-mute">Oculta</span>}
            <button type="button" className="link-btn" onClick={() => setEdit({ ...CAT_EMPTY, ...c, tagline: c.tagline || '', tint: c.tint || '', image_url: c.image_url || '', hasProducts: (c.products[0]?.count ?? 0) > 0 })}>Editar</button>
            <button type="button" className="link-btn danger" onClick={() => remove(c)}>Eliminar</button>
          </li>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar categoría' : 'Nueva categoría'}>
        {edit && (
          <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <FormNotice>{err}</FormNotice>
            <div className="form-2">
              <Field id="ct-name" label="Nombre"><input id="ct-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field id="ct-code" label="Código SKU" hint="3 letras: CHO, CAF…"><input id="ct-code" value={edit.code} maxLength={3} disabled={edit.hasProducts} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /></Field>
              <Field id="ct-tag" label="Frase"><input id="ct-tag" value={edit.tagline} onChange={(e) => setEdit({ ...edit, tagline: e.target.value })} /></Field>
              <Field id="ct-tile" label="Forma en el inicio"><select id="ct-tile" value={edit.tile} onChange={(e) => setEdit({ ...edit, tile: e.target.value })}><option value="big">Grande con foto</option><option value="sq">Cuadrada con foto</option><option value="wide">Ancha con foto</option><option value="mini">Compacta</option></select></Field>
              <Field id="ct-color" label="Color"><input id="ct-color" type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></Field>
              <Field id="ct-order" label="Orden"><input id="ct-order" inputMode="numeric" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: e.target.value })} /></Field>
            </div>
            <div className="field"><span className="field-label">Foto (para las formas con foto)</span>
              <label className="upload-btn">{edit.image_url ? <img src={edit.image_url} alt="" width="72" height="48" /> : <Icon name="mountain" size={22} />}<span>Subir foto</span>
                <input type="file" accept="image/*" hidden onChange={async (e) => { try { const url = await uploadAsset(e.target.files[0], 'categorias'); setEdit((x) => ({ ...x, image_url: url })); } catch (er) { setErr(er.message); } }} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={edit.is_consumable} onChange={(e) => setEdit({ ...edit, is_consumable: e.target.checked })} /><span>Se recompra seguido (café, chocolate, miel…): las recomendaciones lo vuelven a sugerir</span></label>
            <label className="check"><input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /><span>Visible en la tienda</span></label>
            <div className="form-actions"><button type="submit" className="btn btn-green">Guardar</button><button type="button" className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button></div>
          </form>
        )}
      </Modal>
    </section>
  );
}

/* ------------------------------------------------------------ Zonas */
function Zones() {
  const { notify } = useToast();
  const invalidate = useInvalidate();
  const [edit, setEdit] = useState(null);
  const q = useQuery({
    queryKey: ['admin', 'subregions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subregions').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
  const save = async () => {
    const { id, created_at: _c, updated_at: _u, ...row } = edit;
    row.facts = typeof row.facts === 'string' ? row.facts.split('·').map((s) => s.trim()).filter(Boolean) : row.facts;
    row.altitude = row.altitude === '' ? null : Number(row.altitude);
    const { error } = await supabase.from('subregions').update(row).eq('id', id);
    if (error) return notify(friendlyError(error), 'error');
    setEdit(null);
    invalidate();
    notify('Zona guardada');
  };
  return (
    <section className="panel">
      <h2 className="panel-title">Zonas del Huila</h2>
      <ul className="row-list">
        {(q.data || []).map((z) => (
          <li key={z.id}>
            {z.image_url ? <img src={z.image_url} alt="" width="64" height="44" className="row-img" /> : <span className="swatch" style={{ background: z.fill_color }} />}
            <div><b>Zona {z.name}</b><span className="muted small">{z.landmark} · {z.capital} · {z.altitude ? `${z.altitude} m.s.n.m.` : 'altitud sin dato'}</span></div>
            <button type="button" className="link-btn" onClick={() => setEdit({ ...z, facts: (z.facts || []).join(' · '), image_credit: z.image_credit || '', ecosystem: z.ecosystem || '', capital: z.capital || '', altitude: z.altitude ?? '' })}>Editar</button>
          </li>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `Zona ${edit.name}` : ''} wide>
        {edit && (
          <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="form-2">
              <Field id="z-land" label="Paisaje emblemático"><input id="z-land" value={edit.landmark} onChange={(e) => setEdit({ ...edit, landmark: e.target.value })} /></Field>
              <Field id="z-cap" label="Capital"><input id="z-cap" value={edit.capital} onChange={(e) => setEdit({ ...edit, capital: e.target.value })} /></Field>
              <Field id="z-alt" label="Altitud de la capital (m.s.n.m.)"><input id="z-alt" inputMode="numeric" value={edit.altitude} onChange={(e) => setEdit({ ...edit, altitude: e.target.value })} /></Field>
              <Field id="z-eco" label="Ecosistema"><input id="z-eco" value={edit.ecosystem} onChange={(e) => setEdit({ ...edit, ecosystem: e.target.value })} /></Field>
            </div>
            <Field id="z-facts" label="Datos que se muestran" hint="Separados por · (punto medio). Ej.: Neiva · 442 m.s.n.m. · bosque seco tropical"><input id="z-facts" value={edit.facts} onChange={(e) => setEdit({ ...edit, facts: e.target.value })} /></Field>
            <Field id="z-desc" label="Descripción"><textarea id="z-desc" rows={3} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="form-2">
              <div className="field"><span className="field-label">Foto</span>
                <label className="upload-btn">{edit.image_url ? <img src={edit.image_url} alt="" width="72" height="48" /> : <Icon name="mountain" size={22} />}<span>Cambiar foto</span>
                  <input type="file" accept="image/*" hidden onChange={async (e) => { try { const url = await uploadAsset(e.target.files[0], 'zonas'); setEdit((x) => ({ ...x, image_url: url })); } catch (er) { notify(er.message, 'error'); } }} /></label>
              </div>
              <Field id="z-credit" label="Crédito de la foto" optional hint="Autor y licencia si es de Wikimedia u otra fuente."><input id="z-credit" value={edit.image_credit} onChange={(e) => setEdit({ ...edit, image_credit: e.target.value })} /></Field>
              <Field id="z-fill" label="Color en el mapa"><input id="z-fill" type="color" value={edit.fill_color} onChange={(e) => setEdit({ ...edit, fill_color: e.target.value })} /></Field>
              <Field id="z-label" label="Color del texto sobre el mapa"><input id="z-label" type="color" value={edit.label_color} onChange={(e) => setEdit({ ...edit, label_color: e.target.value })} /></Field>
            </div>
            <div className="form-actions"><button type="submit" className="btn btn-green">Guardar</button><button type="button" className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button></div>
          </form>
        )}
      </Modal>
    </section>
  );
}

/* ------------------------------------------------------------ Municipios */
function Municipalities() {
  const { notify } = useToast();
  const invalidate = useInvalidate();
  const q = useQuery({
    queryKey: ['admin', 'municipalities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('municipalities').select('id, name, map_x, map_y, label_anchor, sort_order, subregion:subregions (name, sort_order), ambassadors (count)').order('sort_order');
      if (error) throw error;
      return data.sort((a, b) => a.subregion.sort_order - b.subregion.sort_order || a.sort_order - b.sort_order);
    },
  });
  const save = async (m, patch) => {
    const { error } = await supabase.from('municipalities').update(patch).eq('id', m.id);
    if (error) return notify(friendlyError(error), 'error');
    invalidate();
    notify(`${m.name} actualizado`);
  };
  return (
    <section className="panel">
      <h2 className="panel-title">Municipios y puntos del mapa</h2>
      <p className="muted small">El punto del mapa aparece cuando el municipio tiene un embajador. Coordenadas sobre el dibujo del Huila (ancho 800, alto 810).</p>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Municipio</th><th>Zona</th><th className="num">Embajadores</th><th>X</th><th>Y</th><th>Etiqueta</th><th /></tr></thead>
          <tbody>
            {(q.data || []).map((m) => <MuniRow key={m.id} m={m} onSave={save} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function MuniRow({ m, onSave }) {
  const [x, setX] = useState(m.map_x ?? '');
  const [y, setY] = useState(m.map_y ?? '');
  const [anchor, setAnchor] = useState(m.label_anchor);
  const dirty = String(x) !== String(m.map_x ?? '') || String(y) !== String(m.map_y ?? '') || anchor !== m.label_anchor;
  return (
    <tr>
      <td data-label="Municipio"><b>{m.name}</b></td>
      <td data-label="Zona">{m.subregion.name}</td>
      <td data-label="Embajadores" className="num">{m.ambassadors[0]?.count ?? 0}</td>
      <td data-label="X"><input className="mini-input" inputMode="numeric" value={x} onChange={(e) => setX(e.target.value)} aria-label={`X de ${m.name}`} /></td>
      <td data-label="Y"><input className="mini-input" inputMode="numeric" value={y} onChange={(e) => setY(e.target.value)} aria-label={`Y de ${m.name}`} /></td>
      <td data-label="Etiqueta"><select className="mini-input" value={anchor} onChange={(e) => setAnchor(e.target.value)} aria-label={`Lado de la etiqueta de ${m.name}`}><option value="start">Derecha</option><option value="end">Izquierda</option></select></td>
      <td data-label="">{dirty && <button type="button" className="btn btn-green btn-sm" onClick={() => onSave(m, { map_x: x === '' ? null : Number(x), map_y: y === '' ? null : Number(y), label_anchor: anchor })}>Guardar</button>}</td>
    </tr>
  );
}

/* ------------------------------------------------------------ Textos y envío */
const ICONS = [['truck', 'Camión'], ['box', 'Caja'], ['gift', 'Regalo'], ['pin', 'Ubicación'], ['leaf', 'Hoja'], ['award', 'Premio'], ['heart', 'Corazón']];
function SiteTexts() {
  const { notify } = useToast();
  const invalidate = useInvalidate();
  const q = useQuery({
    queryKey: ['admin', 'site-settings'],
    queryFn: async () => {
      const [s, sh] = await Promise.all([supabase.from('site_settings').select('key, value'), supabase.from('shipping_settings').select('*').maybeSingle()]);
      if (s.error) throw s.error;
      return { settings: Object.fromEntries(s.data.map((r) => [r.key, r.value])), shipping: sh.data };
    },
  });
  const [st, setSt] = useState(null);
  const [ship, setShip] = useState(null);
  useEffect(() => {
    if (!q.data) return;
    setSt({ hero: q.data.settings.hero || {}, announcements: q.data.settings.announcements || [], contact: q.data.settings.contact || {}, welcome_coupon: q.data.settings.welcome_coupon || { code: null } });
    setShip({ free_shipping_threshold: q.data.shipping?.free_shipping_threshold ?? 150000, flat_rate: q.data.shipping?.flat_rate ?? '', rates: Object.entries(q.data.shipping?.base_rates || {}) });
  }, [q.data]);
  if (!st || !ship) return <div className="skeleton" style={{ height: 300 }} />;

  const saveSettings = async () => {
    const rows = Object.entries(st).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
    if (error) return notify(friendlyError(error), 'error');
    invalidate();
    notify('Textos guardados');
  };
  const saveShipping = async () => {
    const base_rates = Object.fromEntries(ship.rates.filter(([k, v]) => k.trim() && Number(v) > 0).map(([k, v]) => [k.trim(), Number(v)]));
    const { error } = await supabase.from('shipping_settings').update({
      free_shipping_threshold: Number(ship.free_shipping_threshold) || 0, flat_rate: ship.flat_rate === '' ? null : Number(ship.flat_rate), base_rates,
    }).eq('id', true);
    if (error) return notify(friendlyError(error), 'error');
    invalidate();
    notify('Envíos guardados');
  };
  const setH = (k) => (e) => setSt((s) => ({ ...s, hero: { ...s.hero, [k]: e.target.value } }));
  const setC = (k) => (e) => setSt((s) => ({ ...s, contact: { ...s.contact, [k]: e.target.value } }));

  return (
    <div className="pn-stack">
      <section className="panel form">
        <h2 className="panel-title">Portada (hero)</h2>
        <div className="form-2">
          <Field id="h-pill" label="Etiqueta superior"><input id="h-pill" value={st.hero.pill || ''} onChange={setH('pill')} /></Field>
          <Field id="h-title" label="Título"><input id="h-title" value={st.hero.title || ''} onChange={setH('title')} /></Field>
          <Field id="h-accent" label="Título en color"><input id="h-accent" value={st.hero.accent || ''} onChange={setH('accent')} /></Field>
        </div>
        <Field id="h-lead" label="Texto de apoyo"><textarea id="h-lead" rows={3} value={st.hero.lead || ''} onChange={setH('lead')} /></Field>

        <h2 className="panel-title">Cinta de anuncios</h2>
        <p className="muted small">Usa **texto** para negrita. Un anuncio con {'{welcome_coupon}'} solo se muestra si hay cupón de bienvenida.</p>
        {st.announcements.map((a, i) => (
          <div key={i} className="badge-row">
            <select aria-label="Ícono" value={a.icon} onChange={(e) => setSt((s) => ({ ...s, announcements: s.announcements.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)) }))}>{ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <input aria-label="Texto del anuncio" value={a.text} onChange={(e) => setSt((s) => ({ ...s, announcements: s.announcements.map((x, j) => (j === i ? { ...x, text: e.target.value, requires: e.target.value.includes('{welcome_coupon}') ? 'welcome_coupon' : undefined } : x)) }))} />
            <button type="button" className="icon-btn" aria-label="Quitar anuncio" onClick={() => setSt((s) => ({ ...s, announcements: s.announcements.filter((_, j) => j !== i) }))}><Icon name="close" size={18} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setSt((s) => ({ ...s, announcements: [...s.announcements, { icon: 'leaf', text: '' }] }))}>Agregar anuncio</button>

        <h2 className="panel-title">Cupón de bienvenida (boletín)</h2>
        <Field id="w-code" label="Código" optional hint="Créalo primero en Cupones. Vacío = el boletín no ofrece cupón."><input id="w-code" value={st.welcome_coupon.code || ''} onChange={(e) => setSt((s) => ({ ...s, welcome_coupon: { code: e.target.value.toUpperCase() || null } }))} /></Field>

        <h2 className="panel-title">Contacto</h2>
        <div className="form-2">
          <Field id="c-wa" label="WhatsApp"><input id="c-wa" type="tel" inputMode="tel" value={st.contact.whatsapp || ''} onChange={setC('whatsapp')} /></Field>
          <Field id="c-mail" label="Correo"><input id="c-mail" type="email" value={st.contact.email || ''} onChange={setC('email')} /></Field>
          <Field id="c-ig" label="Instagram"><input id="c-ig" type="url" value={st.contact.instagram || ''} onChange={setC('instagram')} /></Field>
          <Field id="c-fb" label="Facebook"><input id="c-fb" type="url" value={st.contact.facebook || ''} onChange={setC('facebook')} /></Field>
          <Field id="c-tt" label="TikTok"><input id="c-tt" type="url" value={st.contact.tiktok || ''} onChange={setC('tiktok')} /></Field>
        </div>
        <div className="form-actions"><button type="button" className="btn btn-green" onClick={saveSettings}>Guardar textos</button></div>
      </section>

      <section className="panel form">
        <h2 className="panel-title">Envíos</h2>
        <div className="form-2">
          <Field id="s-free" label="Envío gratis desde (COP)" hint={`Hoy: ${money(Number(ship.free_shipping_threshold) || 0)}`}><input id="s-free" inputMode="numeric" value={ship.free_shipping_threshold} onChange={(e) => setShip({ ...ship, free_shipping_threshold: e.target.value })} /></Field>
          <Field id="s-flat" label="Tarifa general (COP)" hint="Se cobra si la ciudad o el departamento no tienen tarifa propia."><input id="s-flat" inputMode="numeric" value={ship.flat_rate} onChange={(e) => setShip({ ...ship, flat_rate: e.target.value })} /></Field>
        </div>
        <p className="muted small">Tarifas por ciudad o departamento (escríbelos igual que en el formulario de dirección: “Bogotá”, “Antioquia”…).</p>
        {ship.rates.map(([k, v], i) => (
          <div key={i} className="badge-row">
            <input aria-label="Ciudad o departamento" value={k} placeholder="Medellín" onChange={(e) => setShip((s) => ({ ...s, rates: s.rates.map((r, j) => (j === i ? [e.target.value, r[1]] : r)) }))} />
            <input aria-label="Tarifa" inputMode="numeric" value={v} placeholder="14000" onChange={(e) => setShip((s) => ({ ...s, rates: s.rates.map((r, j) => (j === i ? [r[0], e.target.value] : r)) }))} />
            <button type="button" className="icon-btn" aria-label="Quitar tarifa" onClick={() => setShip((s) => ({ ...s, rates: s.rates.filter((_, j) => j !== i) }))}><Icon name="close" size={18} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setShip((s) => ({ ...s, rates: [...s.rates, ['', '']] }))}>Agregar tarifa</button>
        <div className="form-actions"><button type="button" className="btn btn-green" onClick={saveShipping}>Guardar envíos</button></div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ FAQ */
function Faqs() {
  const { notify } = useToast();
  const invalidate = useInvalidate();
  const [edit, setEdit] = useState(null);
  const q = useQuery({
    queryKey: ['admin', 'faqs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('faqs').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
  const list = q.data || [];
  const save = async () => {
    if (!edit.question.trim() || !edit.answer.trim()) return;
    const row = { question: edit.question.trim(), answer: edit.answer.trim(), is_active: edit.is_active };
    const { error } = edit.id ? await supabase.from('faqs').update(row).eq('id', edit.id) : await supabase.from('faqs').insert({ ...row, sort_order: list.length + 1 });
    if (error) return notify(friendlyError(error), 'error');
    setEdit(null);
    invalidate();
  };
  const move = async (i, dir) => {
    const a = list[i], b = list[i + dir];
    if (!b) return;
    await Promise.all([supabase.from('faqs').update({ sort_order: b.sort_order }).eq('id', a.id), supabase.from('faqs').update({ sort_order: a.sort_order }).eq('id', b.id)]);
    invalidate();
  };
  const remove = async (f) => {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;
    await supabase.from('faqs').delete().eq('id', f.id);
    invalidate();
  };
  return (
    <section className="panel">
      <div className="panel-row"><h2 className="panel-title">Preguntas frecuentes</h2><button type="button" className="btn btn-green btn-sm" onClick={() => setEdit({ question: '', answer: '', is_active: true })}>Nueva pregunta</button></div>
      <ul className="row-list">
        {list.map((f, i) => (
          <li key={f.id}>
            <div className="order-btns">
              <button type="button" className="icon-btn" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="arrowUp" size={16} /></button>
              <button type="button" className="icon-btn down" aria-label="Bajar" disabled={i === list.length - 1} onClick={() => move(i, 1)}><Icon name="arrowUp" size={16} /></button>
            </div>
            <div><b>{f.question}</b><span className="muted small">{f.answer}</span></div>
            {!f.is_active && <span className="pill pill-mute">Oculta</span>}
            <button type="button" className="link-btn" onClick={() => setEdit(f)}>Editar</button>
            <button type="button" className="link-btn danger" onClick={() => remove(f)}>Eliminar</button>
          </li>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar pregunta' : 'Nueva pregunta'}>
        {edit && (
          <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field id="fq-q" label="Pregunta"><input id="fq-q" value={edit.question} onChange={(e) => setEdit({ ...edit, question: e.target.value })} /></Field>
            <Field id="fq-a" label="Respuesta"><textarea id="fq-a" rows={4} value={edit.answer} onChange={(e) => setEdit({ ...edit, answer: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /><span>Visible en la tienda</span></label>
            <div className="form-actions"><button type="submit" className="btn btn-green">Guardar</button><button type="button" className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button></div>
          </form>
        )}
      </Modal>
    </section>
  );
}
