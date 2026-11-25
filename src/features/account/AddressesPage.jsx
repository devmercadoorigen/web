import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { useTitle } from '../../lib/useTitle.js';
import { useToast } from '../../components/Toast.jsx';
import { Icon } from '../../components/ui.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';

export const DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca',
  'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
  'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
  'Valle del Cauca', 'Vaupés', 'Vichada',
];

export const EMPTY_ADDRESS = { label: 'Casa', recipient: '', phone: '', department: '', city: '', address_line: '', notes: '', is_default: false };
const EMPTY = EMPTY_ADDRESS;

export function validateAddress(a) {
  const e = {};
  if (a.recipient.trim().length < 3) e.recipient = 'Escribe quién recibe.';
  if (!/^\+?[\d\s-]{7,15}$/.test(a.phone)) e.phone = 'Escribe un celular válido, por ejemplo 300 123 4567.';
  if (!a.department) e.department = 'Elige el departamento.';
  if (a.city.trim().length < 2) e.city = 'Escribe la ciudad o municipio.';
  if (a.address_line.trim().length < 5) e.address_line = 'Escribe la dirección completa.';
  return e;
}

/** Campos de dirección controlados: los usan Mis direcciones y el checkout. */
export function AddressFields({ value: a, onChange, errors = {}, withLabel = true }) {
  const set = (k) => (e) => onChange({ ...a, [k]: e.target.value });
  const err = (k) => ({ 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? `ad-${k}-err` : undefined });
  return (
    <>
      <div className="form-2">
        {withLabel && (
          <Field id="ad-label" label="Nombre de la dirección" hint="Casa, Oficina, Donde mi mamá…">
            <input id="ad-label" value={a.label} onChange={set('label')} maxLength={40} />
          </Field>
        )}
        <Field id="ad-recipient" label="Quién recibe" error={errors.recipient}>
          <input id="ad-recipient" autoComplete="name" value={a.recipient} onChange={set('recipient')} {...err('recipient')} />
        </Field>
        <Field id="ad-phone" label="Celular de quien recibe" error={errors.phone}>
          <input id="ad-phone" type="tel" inputMode="tel" autoComplete="tel" value={a.phone} onChange={set('phone')} {...err('phone')} />
        </Field>
        <Field id="ad-department" label="Departamento" error={errors.department}>
          <select id="ad-department" autoComplete="address-level1" value={a.department} onChange={set('department')} {...err('department')}>
            <option value="">Elige…</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field id="ad-city" label="Ciudad o municipio" error={errors.city}>
          <input id="ad-city" autoComplete="address-level2" value={a.city} onChange={set('city')} {...err('city')} />
        </Field>
        <Field id="ad-address_line" label="Dirección" hint="Calle, número, barrio, apto." error={errors.address_line}>
          <input id="ad-address_line" autoComplete="street-address" value={a.address_line} onChange={set('address_line')} {...err('address_line')} />
        </Field>
      </div>
      <Field id="ad-notes" label="Indicaciones para la entrega" optional>
        <input id="ad-notes" value={a.notes || ''} onChange={set('notes')} maxLength={200} placeholder="Portería 24 horas, casa esquinera…" />
      </Field>
    </>
  );
}

/** Formulario completo de Mis direcciones. */
export function AddressForm({ initial = EMPTY, onSubmit, onCancel, busy, submitLabel = 'Guardar dirección' }) {
  const [a, setA] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const er = validateAddress(a);
    setErrors(er);
    if (!Object.keys(er).length) onSubmit(a);
  };
  return (
    <form className="form addr-form" onSubmit={submit} noValidate>
      <AddressFields value={a} onChange={setA} errors={errors} />
      <label className="check">
        <input type="checkbox" checked={a.is_default} onChange={(e) => setA({ ...a, is_default: e.target.checked })} />
        <span>Usar como dirección principal</span>
      </label>
      <div className="form-actions">
        <button className="btn btn-green" type="submit" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
        {onCancel && <button className="btn btn-outline" type="button" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

export default function AddressesPage() {
  useTitle('Mis direcciones');
  const { user } = useAuth();
  const { notify } = useToast();
  const qc = useQueryClient();
  const key = ['addresses', user.id];
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [error, setError] = useState('');

  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error: e } = await supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at');
      if (e) throw e;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (a) => {
      const row = {
        label: a.label.trim() || 'Casa', recipient: a.recipient.trim(), phone: a.phone.trim(), department: a.department,
        city: a.city.trim(), address_line: a.address_line.trim(), notes: a.notes?.trim() || null,
        // La primera dirección queda como principal.
        is_default: a.is_default || !q.data?.length,
      };
      const { error: e } = a.id
        ? await supabase.from('addresses').update(row).eq('id', a.id)
        : await supabase.from('addresses').insert({ ...row, user_id: user.id });
      if (e) throw e;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      setEditing(null);
      setError('');
      notify('Dirección guardada');
    },
    onError: (e) => setError(friendlyError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error: e } = await supabase.from('addresses').delete().eq('id', id);
      if (e) throw e;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); notify('Dirección eliminada'); },
    onError: (e) => notify(friendlyError(e), 'error'),
  });

  const makeDefault = useMutation({
    mutationFn: async (id) => {
      const { error: e } = await supabase.from('addresses').update({ is_default: true }).eq('id', id);
      if (e) throw e;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => notify(friendlyError(e), 'error'),
  });

  if (q.isLoading) return <div className="panel"><div className="skeleton" style={{ height: 160 }} /></div>;

  if (editing) {
    return (
      <div className="panel">
        <h2 className="panel-title">{editing === 'new' ? 'Nueva dirección' : 'Editar dirección'}</h2>
        <FormNotice>{error}</FormNotice>
        <AddressForm
          initial={editing === 'new' ? undefined : { ...editing, notes: editing.notes || '' }}
          busy={save.isPending}
          onSubmit={(a) => save.mutate({ ...a, id: editing === 'new' ? undefined : editing.id })}
          onCancel={() => { setEditing(null); setError(''); }}
        />
      </div>
    );
  }

  return (
    <div className="addr-grid">
      {q.data.map((a) => (
        <article key={a.id} className={`addr-card${a.is_default ? ' is-default' : ''}`}>
          <header>
            <b>{a.label}</b>
            {a.is_default && <span className="pill pill-verde">Principal</span>}
          </header>
          <p>
            {a.recipient} · {a.phone}<br />
            {a.address_line}<br />
            {a.city}, {a.department}
            {a.notes && <><br /><span className="muted">{a.notes}</span></>}
          </p>
          <footer>
            <button type="button" className="link-btn" onClick={() => setEditing(a)}>Editar</button>
            {!a.is_default && <button type="button" className="link-btn" onClick={() => makeDefault.mutate(a.id)}>Usar como principal</button>}
            <button
              type="button"
              className="link-btn danger"
              onClick={() => window.confirm(`¿Eliminar la dirección "${a.label}"?`) && remove.mutate(a.id)}
            >
              Eliminar
            </button>
          </footer>
        </article>
      ))}
      <button type="button" className="addr-card addr-new" onClick={() => setEditing('new')}>
        <Icon name="pin" size={28} stroke={1.8} />
        <b>Agregar dirección</b>
        <span>Guárdala para pagar más rápido</span>
      </button>
    </div>
  );
}
