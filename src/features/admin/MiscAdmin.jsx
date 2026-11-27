import { useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { dateTime, longDate, money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';
import { DataTable, Modal, Tabs, downloadCsv, useServerTable } from './kit.jsx';
import { adminFn } from './AmbassadorsAdmin.jsx';
import { ACTION, ENTITY } from './Dashboard.jsx';

/* ------------------------------------------------------------ Cupones y boletín */
// Tipos de cupón. En 2x1 y artículo gratis el valor es el tope del descuento; envío gratis no lleva valor.
const COUPON_TYPES = [['porcentaje', 'Porcentaje'], ['valor', 'Valor fijo (COP)'], ['envio_gratis', 'Envío gratis'], ['dos_por_uno', '2x1 en alimentos'], ['articulo_gratis', '1 artículo gratis']];
const couponValue = (c) => ({
  porcentaje: `${c.value}%`,
  envio_gratis: 'Envío gratis',
  dos_por_uno: `2x1 (hasta ${money(c.value)})`,
  articulo_gratis: `Artículo gratis (hasta ${money(c.value)})`,
})[c.type] ?? money(c.value);
const COUPON_EMPTY = { code: '', description: '', type: 'porcentaje', value: '', min_order: '0', max_uses: '', max_uses_per_customer: '1', first_purchase_only: false, starts_at: '', expires_at: '', is_active: true };

export function CouponsPage() {
  useTitle('Cupones y boletín');
  const [tab, setTab] = useState('cupones');
  return (
    <div className="pn-stack">
      <header className="pn-head"><h1>Cupones y boletín</h1></header>
      <Tabs tabs={[['cupones', 'Cupones'], ['boletin', 'Suscriptores del boletín']]} value={tab} onChange={setTab} />
      {tab === 'cupones' ? <Coupons /> : <Newsletter />}
    </div>
  );
}

function Coupons() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const table = useServerTable({
    key: ['coupons'],
    initialSort: { col: 'created_at', asc: false },
    query: ({ search, filters, sort, from, to }) => {
      let q = supabase.from('coupons').select('*', { count: 'exact' });
      if (search) q = q.ilike('code', `%${search}%`);
      if (filters.active) q = q.eq('is_active', filters.active === '1');
      return q.order(sort.col, { ascending: sort.asc }).range(from, to);
    },
  });
  const save = async () => {
    setErr('');
    const v = edit.type === 'envio_gratis' ? 1 : Number(edit.value);
    if (!/^[A-Z0-9-]{3,30}$/.test(edit.code)) return setErr('El código lleva de 3 a 30 letras, números o guiones.');
    if (!(v > 0) || (edit.type === 'porcentaje' && v > 100)) return setErr(edit.type === 'porcentaje' ? 'El porcentaje va de 1 a 100.' : 'Escribe el valor del descuento.');
    const row = {
      code: edit.code, description: edit.description.trim() || null, type: edit.type, value: v, min_order: Number(edit.min_order) || 0,
      max_uses: edit.max_uses ? Number(edit.max_uses) : null, max_uses_per_customer: Number(edit.max_uses_per_customer) || 1,
      first_purchase_only: edit.first_purchase_only, starts_at: edit.starts_at || null, expires_at: edit.expires_at ? `${edit.expires_at}T23:59:59-05:00` : null, is_active: edit.is_active,
    };
    const { error } = edit.id ? await supabase.from('coupons').update(row).eq('id', edit.id) : await supabase.from('coupons').insert(row);
    if (error) return setErr(error.code === '23505' ? 'Ya existe un cupón con ese código.' : friendlyError(error));
    setEdit(null);
    qc.invalidateQueries({ queryKey: ['admin'] });
    notify('Cupón guardado');
  };
  const set = (k) => (e) => setEdit((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : k === 'code' ? e.target.value.toUpperCase().replace(/\s/g, '') : e.target.value }));
  return (
    <>
      <DataTable
        table={table}
        searchPlaceholder="Código"
        toolbar={<button type="button" className="btn btn-green btn-sm" onClick={() => setEdit({ ...COUPON_EMPTY })}>Nuevo cupón</button>}
        filterDefs={[{ key: 'active', label: 'Estado', options: [['1', 'Activos'], ['0', 'Inactivos']] }]}
        empty="Aún no hay cupones."
        columns={[
          { key: 'code', label: 'Código', sort: 'code', render: (c) => <button type="button" className="link-btn" onClick={() => setEdit({ ...COUPON_EMPTY, ...c, description: c.description || '', value: String(c.value), min_order: String(c.min_order), max_uses: c.max_uses ? String(c.max_uses) : '', max_uses_per_customer: String(c.max_uses_per_customer), starts_at: c.starts_at?.slice(0, 10) || '', expires_at: c.expires_at?.slice(0, 10) || '' })}>{c.code}</button> },
          { key: 'value', label: 'Descuento', render: (c) => <>{couponValue(c)}{c.owner_user_id && <span className="pill pill-mute" style={{ marginLeft: 6 }}>Ruleta</span>}</> },
          { key: 'rules', label: 'Condiciones', render: (c) => <span className="small">{[c.min_order ? `desde ${money(c.min_order)}` : null, c.first_purchase_only ? 'primera compra' : null, `${c.max_uses_per_customer} por cliente`].filter(Boolean).join(' · ')}</span> },
          { key: 'uses', label: 'Usos', sort: 'uses', className: 'num', render: (c) => `${c.uses}${c.max_uses ? ` / ${c.max_uses}` : ''}` },
          { key: 'expires_at', label: 'Vence', sort: 'expires_at', render: (c) => (c.expires_at ? longDate(c.expires_at) : 'No vence') },
          { key: 'is_active', label: 'Estado', render: (c) => <span className={`pill pill-${c.is_active ? 'verde' : 'mute'}`}>{c.is_active ? 'Activo' : 'Inactivo'}</span> },
        ]}
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Cupón ${edit.code}` : 'Nuevo cupón'}>
        {edit && (
          <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <FormNotice>{err}</FormNotice>
            <div className="form-2">
              <Field id="cp-code" label="Código"><input id="cp-code" value={edit.code} onChange={set('code')} placeholder="ORIGEN10" autoCapitalize="characters" /></Field>
              <Field id="cp-type" label="Tipo"><select id="cp-type" value={edit.type} onChange={set('type')}>{COUPON_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              {edit.type !== 'envio_gratis' && <Field id="cp-value" label={edit.type === 'porcentaje' ? 'Porcentaje' : edit.type === 'valor' ? 'Valor (COP)' : 'Tope del descuento (COP)'}><input id="cp-value" inputMode="numeric" value={edit.value} onChange={set('value')} /></Field>}
              <Field id="cp-min" label="Compra mínima (COP)"><input id="cp-min" inputMode="numeric" value={edit.min_order} onChange={set('min_order')} /></Field>
              <Field id="cp-max" label="Usos totales" optional hint="Vacío = sin límite"><input id="cp-max" inputMode="numeric" value={edit.max_uses} onChange={set('max_uses')} /></Field>
              <Field id="cp-per" label="Usos por cliente"><input id="cp-per" inputMode="numeric" value={edit.max_uses_per_customer} onChange={set('max_uses_per_customer')} /></Field>
              <Field id="cp-start" label="Desde" optional><input id="cp-start" type="date" value={edit.starts_at} onChange={set('starts_at')} /></Field>
              <Field id="cp-end" label="Vence" optional><input id="cp-end" type="date" value={edit.expires_at} onChange={set('expires_at')} /></Field>
            </div>
            <Field id="cp-desc" label="Descripción interna" optional><input id="cp-desc" value={edit.description} onChange={set('description')} /></Field>
            <label className="check"><input type="checkbox" checked={edit.first_purchase_only} onChange={set('first_purchase_only')} /><span>Solo para la primera compra</span></label>
            <label className="check"><input type="checkbox" checked={edit.is_active} onChange={set('is_active')} /><span>Activo</span></label>
            <div className="form-actions"><button type="submit" className="btn btn-green">Guardar cupón</button><button type="button" className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Newsletter() {
  const { notify } = useToast();
  const table = useServerTable({
    key: ['newsletter'],
    initialSort: { col: 'created_at', asc: false },
    query: ({ search, filters, sort, from, to }) => {
      let q = supabase.from('newsletter_subscribers').select('*', { count: 'exact' });
      if (search) q = q.ilike('email', `%${search}%`);
      if (filters.state === 'activos') q = q.is('unsubscribed_at', null);
      return q.order(sort.col, { ascending: sort.asc }).range(from, to);
    },
  });
  const exportAll = async () => {
    const { data, error } = await supabase.from('newsletter_subscribers').select('email, source, consent_at, unsubscribed_at').is('unsubscribed_at', null).order('created_at');
    if (error) return notify(friendlyError(error), 'error');
    downloadCsv(`boletin-${new Date().toISOString().slice(0, 10)}.csv`, data, [['email', 'Correo'], ['source', 'Origen'], [(r) => r.consent_at?.slice(0, 19).replace('T', ' '), 'Consentimiento (Ley 1581)']]);
  };
  return (
    <DataTable
      table={table}
      searchPlaceholder="Correo"
      toolbar={<button type="button" className="btn btn-outline btn-sm" onClick={exportAll}>Exportar CSV</button>}
      filterDefs={[{ key: 'state', label: 'Estado', options: [['activos', 'Suscritos']] }]}
      empty="Aún no hay suscriptores."
      columns={[
        { key: 'email', label: 'Correo', sort: 'email' },
        { key: 'source', label: 'Origen' },
        { key: 'consent_at', label: 'Consentimiento', sort: 'consent_at', render: (r) => dateTime(r.consent_at) },
        { key: 'state', label: 'Estado', render: (r) => (r.unsubscribed_at ? <span className="pill pill-mute">Se dio de baja</span> : <span className="pill pill-verde">Suscrito</span>) },
      ]}
    />
  );
}

/* ------------------------------------------------------------ Usuarios */
const ROLES = [['cliente', 'Cliente'], ['embajador', 'Embajador'], ['admin', 'Administrador']];
export function UsersPage() {
  useTitle('Usuarios');
  const { user } = useAuth();
  const { notify } = useToast();
  const qc = useQueryClient();
  const table = useServerTable({
    key: ['users'],
    initialSort: { col: 'created_at', asc: false },
    query: ({ search, filters, sort, from, to }) => {
      let q = supabase.from('profiles').select('id, email, full_name, phone, role, is_active, marketing_opt_in, created_at, orders (count), ambassador:ambassadors (id, brand_name)', { count: 'exact' });
      if (search) q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      if (filters.role) q = q.eq('role', filters.role);
      if (filters.active) q = q.eq('is_active', filters.active === '1');
      return q.order(sort.col, { ascending: sort.asc }).range(from, to);
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin'] });
  const setRole = async (u, role) => {
    if (u.id === user.id) return notify('No puedes cambiar tu propio rol.', 'error');
    if (role === 'admin' && !window.confirm(`¿Dar acceso de administrador a ${u.email}? Podrá ver y cambiar todo.`)) return;
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id);
    if (error) return notify(friendlyError(error), 'error');
    refresh();
    notify('Rol actualizado');
  };
  const setActive = async (u, active) => {
    if (!active && !window.confirm(`¿Desactivar la cuenta de ${u.email}? No podrá iniciar sesión.`)) return;
    try {
      await adminFn('admin-users', { action: 'set_active', user_id: u.id, active });
      refresh();
      notify(active ? 'Cuenta reactivada' : 'Cuenta desactivada');
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  return (
    <div className="pn-stack">
      <header className="pn-head"><h1>Usuarios</h1><p className="muted">Clientes, embajadores y administradores. Para vincular un embajador a una cuenta, usa su ficha.</p></header>
      <DataTable
        table={table}
        searchPlaceholder="Correo o nombre"
        filterDefs={[{ key: 'role', label: 'Rol', options: ROLES }, { key: 'active', label: 'Estado', options: [['1', 'Activos'], ['0', 'Desactivados']] }]}
        columns={[
          { key: 'full_name', label: 'Usuario', sort: 'full_name', render: (u) => <><b>{u.full_name || '—'}</b><br /><span className="muted small">{u.email}</span></> },
          { key: 'created_at', label: 'Registro', sort: 'created_at', render: (u) => longDate(u.created_at) },
          { key: 'orders', label: 'Pedidos', className: 'num', render: (u) => u.orders[0]?.count ?? 0 },
          { key: 'role', label: 'Rol', render: (u) => (
            <>
              <select className="mini-input" value={u.role} onChange={(e) => setRole(u, e.target.value)} aria-label={`Rol de ${u.email}`} disabled={u.id === user.id}>
                {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {u.ambassador && <Link className="link small" to={`/admin/embajadores/${u.ambassador.id}`}> {u.ambassador.brand_name}</Link>}
            </>
          ) },
          { key: 'is_active', label: 'Acceso', render: (u) => (u.id === user.id ? <span className="muted small">Tú</span> : u.is_active
            ? <button type="button" className="link-btn danger" onClick={() => setActive(u, false)}>Desactivar</button>
            : <><span className="pill pill-err">Desactivada</span> <button type="button" className="link-btn" onClick={() => setActive(u, true)}>Reactivar</button></>) },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------ Reseñas */
export function ReviewsPage() {
  useTitle('Reseñas');
  const { notify } = useToast();
  const qc = useQueryClient();
  const table = useServerTable({
    key: ['reviews'],
    initialSort: { col: 'created_at', asc: false },
    query: ({ search, filters, sort, from, to }) => {
      let q = supabase.from('reviews').select('id, rating, comment, is_visible, created_at, product:products (name, sku), ambassador:ambassadors (brand_name), user:profiles (full_name, email)', { count: 'exact' });
      if (search) q = q.ilike('comment', `%${search}%`);
      if (filters.visible) q = q.eq('is_visible', filters.visible === '1');
      if (filters.rating) q = q.lte('rating', Number(filters.rating));
      return q.order(sort.col, { ascending: sort.asc }).range(from, to);
    },
  });
  const toggle = async (r) => {
    const { error } = await supabase.from('reviews').update({ is_visible: !r.is_visible }).eq('id', r.id);
    if (error) return notify(friendlyError(error), 'error');
    qc.invalidateQueries({ queryKey: ['admin'] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
    notify(r.is_visible ? 'Reseña oculta: ya no cuenta en el promedio' : 'Reseña visible');
  };
  return (
    <div className="pn-stack">
      <header className="pn-head"><h1>Reseñas</h1><p className="muted">Solo pueden reseñar quienes recibieron el producto. Ocultar una reseña la saca del promedio.</p></header>
      <DataTable
        table={table}
        searchPlaceholder="Texto de la reseña"
        filterDefs={[{ key: 'visible', label: 'Visibilidad', options: [['1', 'Visibles'], ['0', 'Ocultas']] }, { key: 'rating', label: 'Calificación', options: [['2', '2 estrellas o menos'], ['3', '3 o menos']] }]}
        empty="Aún no hay reseñas."
        columns={[
          { key: 'rating', label: 'Calificación', sort: 'rating', render: (r) => <span className="stars" aria-label={`${r.rating} de 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span> },
          { key: 'comment', label: 'Comentario', render: (r) => <span className="small">{r.comment || <span className="muted">Sin comentario</span>}</span> },
          { key: 'product', label: 'Producto', render: (r) => <>{r.product?.name}<br /><span className="muted small">{r.ambassador?.brand_name}</span></> },
          { key: 'user', label: 'Cliente', render: (r) => <span className="small">{r.user?.full_name || r.user?.email}</span> },
          { key: 'created_at', label: 'Fecha', sort: 'created_at', render: (r) => longDate(r.created_at) },
          { key: 'is_visible', label: '', render: (r) => <button type="button" className={`link-btn${r.is_visible ? ' danger' : ''}`} onClick={() => toggle(r)}>{r.is_visible ? 'Ocultar' : 'Mostrar'}</button> },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------ Actividad */
export function ActivityPage() {
  useTitle('Actividad');
  const table = useServerTable({
    key: ['activity'],
    pageSize: 30,
    initialSort: { col: 'created_at', asc: false },
    query: ({ search, filters, sort, from, to }) => {
      let q = supabase.from('audit_log').select('id, action, entity, entity_id, payload, created_at, actor:profiles (full_name, email)', { count: 'exact' });
      if (search) q = q.ilike('entity_id', `%${search}%`);
      if (filters.entity) q = q.eq('entity', filters.entity);
      return q.order(sort.col, { ascending: sort.asc }).range(from, to);
    },
  });
  return (
    <div className="pn-stack">
      <header className="pn-head"><h1>Actividad</h1><p className="muted">Cada acción de un administrador queda registrada. Los datos bancarios y de identidad se guardan enmascarados.</p></header>
      <DataTable
        table={table}
        searchPlaceholder="ID del registro"
        filterDefs={[{ key: 'entity', label: 'Tipo', options: Object.entries(ENTITY).map(([v, l]) => [v, l.replace(/^(un|una|el|los|las|datos privados de un) /, '')]) }]}
        columns={[
          { key: 'created_at', label: 'Fecha', sort: 'created_at', render: (l) => dateTime(l.created_at) },
          { key: 'actor', label: 'Quién', render: (l) => l.actor?.full_name || l.actor?.email || 'Sistema' },
          { key: 'action', label: 'Qué', render: (l) => `${ACTION[l.action] ?? l.action} ${ENTITY[l.entity] ?? l.entity}` },
          { key: 'payload', label: 'Cambios', render: (l) => <details><summary className="link-btn">Ver</summary><pre className="payload">{JSON.stringify(l.payload, null, 2)}</pre></details> },
        ]}
      />
    </div>
  );
}

