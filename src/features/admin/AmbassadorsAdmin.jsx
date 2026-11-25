import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { dateTime, longDate, money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';
import { compressImage, newName, uploadPublic } from '../ambassador-panel/images.js';
import { DataTable, Tabs, useServerTable } from './kit.jsx';
import { useLookups } from './ProductsAdmin.jsx';

/** Invoca una Edge Function de admin devolviendo su mensaje de error en español. */
export async function adminFn(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = 'No pudimos completar la acción.';
    try { msg = (await error.context.json()).error || msg; } catch { /* sin cuerpo */ }
    throw new Error(msg);
  }
  return data;
}

/* ------------------------------------------------------------ Lista */
export function AmbassadorsList() {
  useTitle('Embajadores');
  const [params] = useSearchParams();
  const lk = useLookups();
  const table = useServerTable({
    key: ['ambassadors'],
    initialSort: { col: 'brand_name', asc: true },
    initialFilters: { idle: params.get('sin_productos') || undefined },
    query: ({ search, filters, sort, from, to }) => {
      let q = supabase.from('ambassadors').select('id, code, brand_name, initials, avatar_url, status, sales_count, rating_avg, rating_count, profile_id, municipality:municipalities (name, subregion:subregions (name)), products (status)', { count: 'exact' });
      if (search) q = q.or(`brand_name.ilike.%${search}%,code.ilike.%${search}%`);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.municipality) q = q.eq('municipality_id', filters.municipality);
      return q.order(sort.col, { ascending: sort.asc }).range(from, to);
    },
  });
  const rows = table.filters.idle ? table.rows.filter((a) => !a.products.some((p) => p.status === 'aprobado')) : table.rows;

  return (
    <div className="pn-stack">
      <header className="pn-head pn-head-row">
        <div><h1>Embajadores</h1><p className="muted">Productores y marcas del Huila en la tienda.</p></div>
        <Link to="/admin/embajadores/nuevo" className="btn btn-green"><Icon name="award" size={18} />Nuevo embajador</Link>
      </header>
      <DataTable
        table={{ ...table, rows }}
        searchPlaceholder="Marca o código (EM0004)"
        filterDefs={[
          { key: 'status', label: 'Estado', options: [['activo', 'Activos'], ['suspendido', 'Suspendidos']] },
          { key: 'municipality', label: 'Municipio', options: (lk.data?.municipalities || []).map((m) => [m.id, `${m.name} (${m.subregion.name})`]) },
          { key: 'idle', label: 'Productos', options: [['1', 'Sin productos publicados']] },
        ]}
        columns={[
          { key: 'brand_name', label: 'Embajador', sort: 'brand_name', render: (a) => (
            <Link to={`/admin/embajadores/${a.id}`} className="dt-prod">
              {a.avatar_url ? <img src={a.avatar_url} alt="" width="44" height="44" className="round" /> : <span className="dt-noimg round">{a.initials}</span>}
              <span><b>{a.brand_name}</b><span className="sku">{a.code}</span></span>
            </Link>
          ) },
          { key: 'municipality', label: 'Municipio', render: (a) => <>{a.municipality?.name}<br /><span className="muted small">{a.municipality?.subregion?.name}</span></> },
          { key: 'products', label: 'Publicados', className: 'num', render: (a) => a.products.filter((p) => p.status === 'aprobado').length },
          { key: 'sales_count', label: 'Ventas', sort: 'sales_count', className: 'num' },
          { key: 'account', label: 'Cuenta', render: (a) => (a.profile_id ? <span className="pill pill-verde">Vinculada</span> : <span className="pill pill-mute">Sin cuenta</span>) },
          { key: 'status', label: 'Estado', sort: 'status', render: (a) => <span className={`pill pill-${a.status === 'activo' ? 'verde' : 'err'}`}>{a.status === 'activo' ? 'Activo' : 'Suspendido'}</span> },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------ Ficha */
const EMPTY = {
  brand_name: '', municipality_id: '', status: 'activo', short_description: '', story_origin: '', story_present: '', story_future: '',
  instagram: '', facebook: '', website: '', whatsapp: '', avatar_url: '', banner_url: '',
};
const EMPTY_PRIV = { id_type: '', id_number: '', legal_name: '', email: '', phone: '', commission_rate: '', notes: '', bank: { banco: '', tipo_cuenta: '', numero: '', titular: '', documento_titular: '' } };

export function AmbassadorAdmin() {
  const { id } = useParams();
  const isNew = !id;
  useTitle(isNew ? 'Nuevo embajador' : 'Embajador');
  const navigate = useNavigate();
  const { notify } = useToast();
  const qc = useQueryClient();
  const lk = useLookups();
  const [tab, setTab] = useState('perfil');
  const [f, setF] = useState(EMPTY);
  const [pv, setPv] = useState(EMPTY_PRIV);
  const [badges, setBadges] = useState([]);
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const q = useQuery({
    queryKey: ['admin', 'ambassador', id],
    enabled: !isNew,
    queryFn: async () => {
      const [a, s, r] = await Promise.all([
        supabase.from('ambassadors').select('*, private:ambassador_private (*), badges:ambassador_badges (*), profile:profiles (id, email, full_name, is_active)').eq('id', id).maybeSingle(),
        supabase.rpc('admin_ambassador_stats', { p_ambassador_id: id }),
        supabase.from('reviews').select('id, rating, comment, is_visible, created_at, product:products (name)').eq('ambassador_id', id).order('created_at', { ascending: false }).limit(10),
      ]);
      if (a.error) throw a.error;
      return { amb: a.data, stats: s.data, reviews: r.data || [] };
    },
  });

  useEffect(() => {
    const a = q.data?.amb;
    if (!a) return;
    setF(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, a[k] ?? ''])));
    const p = a.private || {};
    setPv({
      id_type: p.id_type || '', id_number: p.id_number || '', legal_name: p.legal_name || '', email: p.email || '', phone: p.phone || '',
      commission_rate: p.commission_rate ?? '', notes: p.notes || '', bank: { ...EMPTY_PRIV.bank, ...(p.bank_info || {}) },
    });
    setBadges([...(a.badges || [])].sort((x, y) => x.sort_order - y.sort_order));
    setInviteEmail(p.email || '');
  }, [q.data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin'] }); qc.invalidateQueries({ queryKey: ['catalog'] }); };
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setP = (k) => (e) => setPv((s) => ({ ...s, [k]: e.target.value }));
  const setB = (k) => (e) => setPv((s) => ({ ...s, bank: { ...s.bank, [k]: e.target.value } }));

  const upload = async (kind, file) => {
    if (!file) return;
    try {
      const { blob } = await compressImage(file, { max: kind === 'avatar' ? 600 : 1600 });
      const url = await uploadPublic('avatars', `admin/${id || 'nuevo'}/${newName(blob, `-${kind}`)}`, blob);
      setF((s) => ({ ...s, [`${kind}_url`]: url }));
      notify(kind === 'avatar' ? 'Foto lista: guarda para aplicarla' : 'Portada lista: guarda para aplicarla');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setGeneral('');
    if (f.brand_name.trim().length < 2) return setGeneral('Escribe el nombre comercial.');
    if (!f.municipality_id) return setGeneral('Elige el municipio.');
    const rate = pv.commission_rate === '' ? null : Number(pv.commission_rate);
    if (rate !== null && (Number.isNaN(rate) || rate < 0 || rate > 100)) return setGeneral('La comisión debe estar entre 0 y 100.');
    setBusy(true);
    try {
      const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]));
      let ambId = id;
      if (isNew) {
        const { data, error } = await supabase.from('ambassadors').insert(row).select('id').single();
        if (error) throw error;
        ambId = data.id;
      } else {
        const { error } = await supabase.from('ambassadors').update(row).eq('id', id);
        if (error) throw error;
      }
      const bank = Object.fromEntries(Object.entries(pv.bank).filter(([, v]) => v.trim()));
      const { error: pe } = await supabase.from('ambassador_private').upsert({
        ambassador_id: ambId, id_type: pv.id_type || null, id_number: pv.id_number.trim() || null, legal_name: pv.legal_name.trim() || null,
        email: pv.email.trim().toLowerCase() || null, phone: pv.phone.trim() || null, commission_rate: rate, notes: pv.notes.trim() || null, bank_info: bank,
      }, { onConflict: 'ambassador_id' });
      if (pe) throw pe;
      // Insignias: se reemplazan completas
      if (!isNew) await supabase.from('ambassador_badges').delete().eq('ambassador_id', ambId);
      const clean = badges.filter((b) => b.label.trim());
      if (clean.length) {
        const { error: be } = await supabase.from('ambassador_badges').insert(clean.map((b, i) => ({ ambassador_id: ambId, label: b.label.trim(), type: b.type, year: b.year ? Number(b.year) : null, sort_order: i })));
        if (be) throw be;
      }
      refresh();
      notify(isNew ? 'Embajador creado' : 'Cambios guardados');
      if (isNew) navigate(`/admin/embajadores/${ambId}`, { replace: true });
    } catch (err) {
      setGeneral(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    setBusy(true);
    try {
      const r = await adminFn('admin-users', { action: 'invite_ambassador', ambassador_id: id, email: inviteEmail, full_name: pv.legal_name || f.brand_name });
      refresh();
      notify(r.invited ? `Invitación enviada a ${inviteEmail}` : 'Cuenta existente vinculada al embajador');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleReview = async (r) => {
    const { error } = await supabase.from('reviews').update({ is_visible: !r.is_visible }).eq('id', r.id);
    if (error) return notify(friendlyError(error), 'error');
    refresh();
  };

  if (!isNew && q.isLoading) return <div className="skeleton" style={{ height: 400 }} />;
  if (!isNew && !q.data?.amb) return <div className="empty"><b>Embajador no encontrado</b><Link to="/admin/embajadores" className="btn btn-green">Volver</Link></div>;
  const a = q.data?.amb;
  const st = q.data?.stats;

  return (
    <div className="pn-stack">
      <Link to="/admin/embajadores" className="back-link"><Icon name="arrow" size={16} stroke={2.4} /> Embajadores</Link>
      <header className="pn-head pn-head-row">
        <div className="amb-title">
          {f.avatar_url ? <img src={f.avatar_url} alt="" width="64" height="64" className="round" /> : <span className="dt-noimg round lg">{a?.initials || '··'}</span>}
          <div><h1>{f.brand_name || 'Nuevo embajador'}</h1>{a && <p className="prod-meta"><span className="sku">{a.code}</span><span className={`pill pill-${a.status === 'activo' ? 'verde' : 'err'}`}>{a.status === 'activo' ? 'Activo' : 'Suspendido'}</span> Desde {longDate(a.joined_at)}</p>}</div>
        </div>
      </header>

      {st && (
        <div className="kpi-grid">
          <div className="kpi"><span className="kpi-label">Ventas totales</span><b className="kpi-value">{money(st.revenue_total)}</b><span className="kpi-hint">{st.orders} pedidos</span></div>
          <Link to={`/admin/productos?embajador=${id}`} className="kpi"><span className="kpi-label">Productos publicados</span><b className="kpi-value">{st.products.aprobado || 0}</b><span className="kpi-hint">{st.products.pendiente || 0} en revisión</span></Link>
          <Link to="/admin/liquidaciones" className="kpi kpi-ocre"><span className="kpi-label">Por pagarle</span><b className="kpi-value">{money(st.pending_payout)}</b><span className="kpi-hint">{money(st.paid_total)} pagado</span></Link>
          <div className="kpi"><span className="kpi-label">Calificación</span><b className="kpi-value">{a.rating_count ? `${Number(a.rating_avg).toFixed(1)} ★` : '—'}</b><span className="kpi-hint">{a.rating_count} reseñas</span></div>
        </div>
      )}

      <Tabs tabs={[['perfil', 'Perfil público'], ['privado', 'Datos privados'], ['cuenta', 'Cuenta'], ...(isNew ? [] : [['resenas', 'Reseñas', q.data?.reviews.length]])]} value={tab} onChange={setTab} />

      <form className="pn-stack" onSubmit={save} noValidate>
        <FormNotice>{general}</FormNotice>

        <section className="panel form" hidden={tab !== 'perfil'}>
          <div className="form-2">
            <Field id="am-brand" label="Nombre comercial"><input id="am-brand" value={f.brand_name} onChange={set('brand_name')} /></Field>
            <Field id="am-muni" label="Municipio">
              <select id="am-muni" value={f.municipality_id} onChange={set('municipality_id')}>
                <option value="">Elige…</option>
                {(lk.data?.municipalities || []).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.subregion.name})</option>)}
              </select>
            </Field>
            <Field id="am-status" label="Estado" hint="Suspendido: sus productos dejan de mostrarse en la tienda.">
              <select id="am-status" value={f.status} onChange={set('status')}><option value="activo">Activo</option><option value="suspendido">Suspendido</option></select>
            </Field>
            <Field id="am-short" label="Frase corta" hint={`${f.short_description.length}/280`}><input id="am-short" value={f.short_description} maxLength={280} onChange={set('short_description')} /></Field>
          </div>
          <div className="form-2">
            <div className="field"><span className="field-label">Foto de perfil</span>
              <label className="upload-btn">{f.avatar_url ? <img src={f.avatar_url} alt="" className="round" width="56" height="56" /> : <Icon name="user" size={22} />}<span>Subir foto</span><input type="file" accept="image/*" hidden onChange={(e) => upload('avatar', e.target.files[0])} /></label>
            </div>
            <div className="field"><span className="field-label">Portada</span>
              <label className="upload-btn">{f.banner_url ? <img src={f.banner_url} alt="" width="96" height="40" /> : <Icon name="mountain" size={22} />}<span>Subir portada</span><input type="file" accept="image/*" hidden onChange={(e) => upload('banner', e.target.files[0])} /></label>
            </div>
          </div>
          <Field id="am-o" label="Inicios"><textarea id="am-o" rows={4} value={f.story_origin} onChange={set('story_origin')} /></Field>
          <Field id="am-p" label="Presente"><textarea id="am-p" rows={4} value={f.story_present} onChange={set('story_present')} /></Field>
          <Field id="am-f" label="Futuro"><textarea id="am-f" rows={3} value={f.story_future} onChange={set('story_future')} /></Field>
          <div className="form-2">
            <Field id="am-ig" label="Instagram" optional><input id="am-ig" type="url" value={f.instagram} onChange={set('instagram')} /></Field>
            <Field id="am-fb" label="Facebook" optional><input id="am-fb" type="url" value={f.facebook} onChange={set('facebook')} /></Field>
            <Field id="am-web" label="Página web" optional><input id="am-web" type="url" value={f.website} onChange={set('website')} /></Field>
            <Field id="am-wa" label="WhatsApp público" optional hint="Solo si el embajador autoriza publicarlo."><input id="am-wa" type="tel" value={f.whatsapp} onChange={set('whatsapp')} /></Field>
          </div>
          <h2 className="panel-title">Insignias</h2>
          {badges.map((b, i) => (
            <div key={b.id || i} className="badge-row">
              <input aria-label="Insignia" value={b.label} placeholder="FICCA 2024" onChange={(e) => setBadges((bs) => bs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <select aria-label="Tipo" value={b.type} onChange={(e) => setBadges((bs) => bs.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}>
                <option value="premio">Premio</option><option value="certificacion">Certificación</option><option value="programa">Programa</option><option value="otro">Otro</option>
              </select>
              <input aria-label="Año" inputMode="numeric" value={b.year ?? ''} placeholder="Año" onChange={(e) => setBadges((bs) => bs.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))} />
              <button type="button" className="icon-btn" aria-label="Quitar insignia" onClick={() => setBadges((bs) => bs.filter((_, j) => j !== i))}><Icon name="close" size={18} /></button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setBadges((bs) => [...bs, { label: '', type: 'premio', year: '' }])}>Agregar insignia</button>
        </section>

        <section className="panel form" hidden={tab !== 'privado'}>
          <p className="notice notice-mute"><Icon name="lock" size={18} />Solo los administradores ven estos datos. El embajador ve su comisión y sus datos bancarios, pero no puede cambiarlos.</p>
          <div className="form-2">
            <Field id="pv-legal" label="Razón social o nombre legal"><input id="pv-legal" value={pv.legal_name} onChange={setP('legal_name')} /></Field>
            <div className="field-pair">
              <Field id="pv-idt" label="Documento"><select id="pv-idt" value={pv.id_type} onChange={setP('id_type')}><option value="">—</option><option>Cédula de Ciudadanía</option><option>Número de Identificación Tributaria (NIT)</option><option>Cédula de Extranjería</option></select></Field>
              <Field id="pv-idn" label="Número"><input id="pv-idn" value={pv.id_number} onChange={setP('id_number')} /></Field>
            </div>
            <Field id="pv-email" label="Correo"><input id="pv-email" type="email" value={pv.email} onChange={setP('email')} /></Field>
            <Field id="pv-phone" label="Celular"><input id="pv-phone" type="tel" value={pv.phone} onChange={setP('phone')} /></Field>
            <Field id="pv-rate" label="Comisión de Mercado Origen (%)" hint="Se acuerda con cada embajador. Vacía = por acordar."><input id="pv-rate" inputMode="decimal" value={pv.commission_rate} onChange={setP('commission_rate')} /></Field>
          </div>
          <h2 className="panel-title">Cuenta para pagos</h2>
          <div className="form-2">
            <Field id="bk-banco" label="Banco o billetera"><input id="bk-banco" value={pv.bank.banco} onChange={setB('banco')} placeholder="Bancolombia, Nequi…" /></Field>
            <Field id="bk-tipo" label="Tipo de cuenta"><select id="bk-tipo" value={pv.bank.tipo_cuenta} onChange={setB('tipo_cuenta')}><option value="">—</option><option>Ahorros</option><option>Corriente</option><option>Billetera digital</option></select></Field>
            <Field id="bk-num" label="Número"><input id="bk-num" inputMode="numeric" value={pv.bank.numero} onChange={setB('numero')} /></Field>
            <Field id="bk-tit" label="Titular"><input id="bk-tit" value={pv.bank.titular} onChange={setB('titular')} /></Field>
            <Field id="bk-doc" label="Documento del titular"><input id="bk-doc" inputMode="numeric" value={pv.bank.documento_titular} onChange={setB('documento_titular')} /></Field>
          </div>
          <Field id="pv-notes" label="Notas internas" optional><textarea id="pv-notes" rows={3} value={pv.notes} onChange={setP('notes')} /></Field>
          {a?.private?.media_sources?.logo && (
            <p className="small">Material enviado en la inscripción: <a className="link" href={a.private.media_sources.logo} target="_blank" rel="noreferrer">logo</a>
              {(a.private.media_sources.photos || []).map((u, i) => <span key={u}> · <a className="link" href={u} target="_blank" rel="noreferrer">foto {i + 1}</a></span>)}
              {a.private.media_sources.video && <> · <a className="link" href={a.private.media_sources.video} target="_blank" rel="noreferrer">video</a></>}
            </p>
          )}
        </section>

        {tab !== 'cuenta' && tab !== 'resenas' && (
          <div className="form-actions sticky-actions">
            <button type="submit" className="btn btn-green" disabled={busy}>{busy ? 'Guardando…' : isNew ? 'Crear embajador' : 'Guardar cambios'}</button>
          </div>
        )}
      </form>

      {tab === 'cuenta' && (
        <section className="panel form">
          {isNew ? <p className="muted">Primero crea el embajador; luego podrás invitarlo a su panel.</p> : a.profile ? (
            <>
              <p>Cuenta vinculada: <b>{a.profile.full_name || a.profile.email}</b> · {a.profile.email} {a.profile.is_active ? '' : <span className="pill pill-err">Desactivada</span>}</p>
              <p className="muted small">Con esta cuenta el embajador entra a /panel para subir productos y ver sus ventas.</p>
            </>
          ) : (
            <>
              <p>Este embajador aún no tiene cuenta. Escribe su correo: si ya tiene cuenta en la tienda la vinculamos; si no, le enviamos una invitación para crear su contraseña.</p>
              <div className="form-2">
                <Field id="inv-email" label="Correo del embajador"><input id="inv-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></Field>
              </div>
              <div className="form-actions"><button type="button" className="btn btn-green" disabled={busy || !inviteEmail} onClick={invite}>{busy ? 'Enviando…' : 'Invitar o vincular'}</button></div>
            </>
          )}
        </section>
      )}

      {tab === 'resenas' && (
        <section className="panel">
          {!q.data.reviews.length ? <p className="muted">Sin reseñas todavía.</p> : (
            <ul className="review-list">
              {q.data.reviews.map((r) => (
                <li key={r.id} className={r.is_visible ? '' : 'is-hidden'}>
                  <div><b>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</b> <span className="muted small">{r.product?.name} · {dateTime(r.created_at)}</span></div>
                  {r.comment && <p>{r.comment}</p>}
                  <button type="button" className="link-btn" onClick={() => toggleReview(r)}>{r.is_visible ? 'Ocultar' : 'Mostrar'}</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Solicitudes */
const APP_STATUS = { nueva: ['Nueva', 'ocre'], en_revision: ['En revisión', 'cielo'], aprobada: ['Aprobada', 'verde'], rechazada: ['Rechazada', 'mute'] };

export function ApplicationsPage() {
  useTitle('Solicitudes de embajador');
  const { notify } = useToast();
  const qc = useQueryClient();
  const lk = useLookups();
  const [tab, setTab] = useState('nueva');
  const [approving, setApproving] = useState(null);

  const q = useQuery({
    queryKey: ['admin', 'applications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ambassador_applications')
        .select('*, municipality:municipalities (name), category:categories (name), ambassador:ambassadors (id, brand_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const counts = (q.data || []).reduce((m, a) => ({ ...m, [a.status]: (m[a.status] || 0) + 1 }), {});
  const list = (q.data || []).filter((a) => a.status === tab);

  const setStatus = async (app, status) => {
    const notes = status === 'rechazada' ? window.prompt('Motivo (interno, opcional):', app.admin_notes || '') : app.admin_notes;
    if (notes === null) return;
    const { error } = await supabase.from('ambassador_applications').update({ status, admin_notes: notes || null, reviewed_at: new Date().toISOString() }).eq('id', app.id);
    if (error) return notify(friendlyError(error), 'error');
    qc.invalidateQueries({ queryKey: ['admin'] });
    notify('Solicitud actualizada');
  };

  const approve = async () => {
    const { app, brand, muni, rate, sendInvite } = approving;
    try {
      const { data: ambId, error } = await supabase.rpc('admin_approve_application', {
        p_application_id: app.id, p_brand_name: brand, p_municipality_id: muni, p_commission: rate === '' ? null : Number(rate),
      });
      if (error) throw error;
      if (sendInvite) await adminFn('admin-users', { action: 'invite_ambassador', ambassador_id: ambId, email: app.email, full_name: app.name });
      qc.invalidateQueries({ queryKey: ['admin'] });
      setApproving(null);
      notify(sendInvite ? `Embajador creado e invitación enviada a ${app.email}` : 'Embajador creado');
    } catch (e) {
      notify(e.message || friendlyError(e), 'error');
    }
  };

  return (
    <div className="pn-stack">
      <header className="pn-head"><h1>Solicitudes</h1><p className="muted">Formulario “Quiero ser embajador”.</p></header>
      <Tabs tabs={Object.entries(APP_STATUS).map(([v, [l]]) => [v, l, counts[v]])} value={tab} onChange={setTab} />
      {q.isLoading ? <div className="skeleton" style={{ height: 200 }} /> : !list.length ? <p className="dt-empty">No hay solicitudes en este estado.</p> : (
        <ul className="prep-list">
          {list.map((app) => (
            <li key={app.id} className="panel app-card">
              <header>
                <div><b className="prep-order">{app.brand_name || app.name}</b> <span className={`pill pill-${APP_STATUS[app.status][1]}`}>{APP_STATUS[app.status][0]}</span></div>
                <span className="muted small">{dateTime(app.created_at)}</span>
              </header>
              <dl className="kv">
                <dt>Contacto</dt><dd>{app.name}</dd>
                <dt>Correo</dt><dd><a className="link" href={`mailto:${app.email}`}>{app.email}</a></dd>
                <dt>Celular</dt><dd>{app.phone}</dd>
                <dt>Municipio</dt><dd>{app.municipality?.name || '—'}</dd>
                <dt>Categoría</dt><dd>{app.category?.name || '—'}</dd>
              </dl>
              {app.description && <p className="app-desc">{app.description}</p>}
              {app.admin_notes && <p className="small muted">Nota interna: {app.admin_notes}</p>}
              {app.ambassador && <Link className="link" to={`/admin/embajadores/${app.ambassador.id}`}>Ver embajador {app.ambassador.brand_name}</Link>}
              {['nueva', 'en_revision'].includes(app.status) && (
                <div className="form-actions">
                  <button type="button" className="btn btn-green btn-sm" onClick={() => setApproving({ app, brand: app.brand_name || app.name, muni: app.municipality_id || '', rate: '', sendInvite: true })}>Aprobar</button>
                  {app.status === 'nueva' && <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus(app, 'en_revision')}>Marcar en revisión</button>}
                  <button type="button" className="link-btn danger" onClick={() => setStatus(app, 'rechazada')}>Rechazar</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {approving && (
        <div className="panel form approve-box" role="dialog" aria-label="Aprobar solicitud">
          <h2 className="panel-title">Aprobar a {approving.app.name}</h2>
          <div className="form-2">
            <Field id="ap-brand" label="Nombre comercial"><input id="ap-brand" value={approving.brand} onChange={(e) => setApproving({ ...approving, brand: e.target.value })} /></Field>
            <Field id="ap-muni" label="Municipio">
              <select id="ap-muni" value={approving.muni} onChange={(e) => setApproving({ ...approving, muni: e.target.value })}>
                <option value="">Elige…</option>
                {(lk.data?.municipalities || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field id="ap-rate" label="Comisión (%)" optional hint="Puedes acordarla después."><input id="ap-rate" inputMode="decimal" value={approving.rate} onChange={(e) => setApproving({ ...approving, rate: e.target.value })} /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={approving.sendInvite} onChange={(e) => setApproving({ ...approving, sendInvite: e.target.checked })} /><span>Enviar invitación a {approving.app.email} para que entre a su panel</span></label>
          <div className="form-actions">
            <button type="button" className="btn btn-green" disabled={!approving.brand.trim() || !approving.muni} onClick={approve}>Crear embajador</button>
            <button type="button" className="btn btn-outline" onClick={() => setApproving(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
