import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { money, longDate } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { useToast } from '../../components/Toast.jsx';
import { Icon } from '../../components/ui.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';
import { StatusPill } from '../orders/StatusPill.jsx';

export default function AccountHome() {
  useTitle('Mi cuenta');
  const { user, profile, refreshProfile, signOut, role } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const welcome = params.get('bienvenida') === '1';
  const [f, setF] = useState({ full_name: '', phone: '', marketing_opt_in: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) setF({ full_name: profile.full_name || '', phone: profile.phone || '', marketing_opt_in: !!profile.marketing_opt_in });
  }, [profile]);

  const last = useQuery({
    queryKey: ['orders', user.id, 'last'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('order_number, status, total, created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const save = async (e) => {
    e.preventDefault();
    if (f.full_name.trim().length < 3) return setError('Escribe tu nombre y apellido.');
    if (f.phone && !/^\+?[\d\s-]{7,15}$/.test(f.phone)) return setError('Escribe un celular válido, por ejemplo 300 123 4567.');
    setBusy(true);
    setError('');
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: f.full_name.trim(), phone: f.phone.trim() || null, marketing_opt_in: f.marketing_opt_in })
      .eq('id', user.id);
    setBusy(false);
    if (err) return setError(friendlyError(err));
    refreshProfile();
    notify('Tus datos quedaron guardados');
  };

  const logout = async () => {
    await signOut();
    notify('Cerraste sesión. ¡Vuelve pronto!');
    navigate('/');
  };

  return (
    <div className="account-grid">
      {welcome && (
        <div className="welcome-card">
          <Icon name="check" size={22} stroke={2.6} />
          <div>
            <b>¡Tu cuenta quedó confirmada!</b>
            <span>Ya puedes guardar favoritos, direcciones y seguir tus pedidos.</span>
          </div>
          <button type="button" className="icon-btn" aria-label="Cerrar aviso" onClick={() => setParams({}, { replace: true })}><Icon name="close" size={18} /></button>
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Tu último pedido</h2>
        {last.isLoading ? (
          <div className="skeleton" style={{ height: 84 }} />
        ) : last.data ? (
          <Link to={`/cuenta/pedidos/${last.data.order_number}`} className="order-row">
            <div>
              <b>{last.data.order_number}</b>
              <span>{longDate(last.data.created_at)} · {money(last.data.total)}</span>
            </div>
            <StatusPill status={last.data.status} />
            <Icon name="arrow" size={18} stroke={2.4} />
          </Link>
        ) : (
          <p className="muted">Aún no tienes pedidos. <Link to="/#tienda" className="link">Empieza por lo más pedido del Huila</Link>.</p>
        )}
        <div className="quick-links">
          <Link to="/cuenta/pedidos" className="quick"><Icon name="box" size={20} />Mis pedidos</Link>
          <Link to="/cuenta/deseos" className="quick"><Icon name="heart" size={20} />Lista de deseos</Link>
          <Link to="/cuenta/direcciones" className="quick"><Icon name="pin" size={20} />Direcciones</Link>
          {role === 'embajador' && <Link to="/panel" className="quick"><Icon name="leaf" size={20} />Panel de embajador</Link>}
          {role === 'admin' && <Link to="/admin" className="quick"><Icon name="shield" size={20} />Administración</Link>}
        </div>
      </div>

      <form className="panel form" onSubmit={save} noValidate>
        <h2 className="panel-title">Tus datos</h2>
        <FormNotice>{error}</FormNotice>
        <Field id="acc-email" label="Correo electrónico" hint="Para cambiarlo, escríbenos por WhatsApp.">
          <input id="acc-email" type="email" value={user.email} readOnly aria-describedby="acc-email-hint" />
        </Field>
        <Field id="acc-name" label="Nombre completo">
          <input id="acc-name" autoComplete="name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        </Field>
        <Field id="acc-phone" label="Celular" optional>
          <input id="acc-phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={f.marketing_opt_in} onChange={(e) => setF({ ...f, marketing_opt_in: e.target.checked })} />
          <span>Quiero recibir lanzamientos y cosechas de temporada (un correo al mes).</span>
        </label>
        {profile?.data_policy_accepted_at && (
          <p className="field-hint">Autorizaste el tratamiento de tus datos el {longDate(profile.data_policy_accepted_at)}.</p>
        )}
        <div className="form-actions">
          <button className="btn btn-green" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
          <button className="btn btn-outline" type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </form>
    </div>
  );
}

