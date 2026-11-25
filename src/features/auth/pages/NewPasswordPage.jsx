import { useState } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { friendlyError } from '../../../lib/errors.js';
import { useTitle } from '../../../lib/useTitle.js';
import { PageLoader } from '../../../components/PageLoader.jsx';
import { useToast } from '../../../components/Toast.jsx';
import { useAuth } from '../AuthProvider.jsx';
import { AuthShell, Field, FormNotice, PasswordInput, passwordProblem } from '../AuthShell.jsx';
import { safeNext } from '../guards.jsx';

// Destino del enlace de recuperación: Supabase abre una sesión temporal y aquí se fija la nueva clave.
export default function NewPasswordPage() {
  useTitle('Nueva contraseña');
  const { ready, user, profile, updatePassword, refreshProfile } = useAuth();
  // Quien llega por invitación aún no ha autorizado el tratamiento de datos.
  const needsConsent = !!profile && !profile.data_policy_accepted_at;
  const [consent, setConsent] = useState(false);
  const { notify } = useToast();
  const navigate = useNavigate();
  // Las invitaciones de embajador llegan con ?next=/panel
  const next = safeNext(useSearchParams()[0].get('next'));
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ready) return <PageLoader />;

  if (!user) {
    return (
      <AuthShell kicker="Recuperar acceso" title="El enlace venció" lead="Por seguridad, los enlaces de recuperación duran una hora y sirven una sola vez.">
        <div className="form">
          <Link to="/recuperar" className="btn btn-green btn-block">Pedir un enlace nuevo</Link>
        </div>
      </AuthShell>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const pp = passwordProblem(pass);
    if (pp) return setError(pp);
    if (pass !== pass2) return setError('Las dos contraseñas no coinciden.');
    if (needsConsent && !consent) return setError('Para continuar necesitamos tu autorización de tratamiento de datos.');
    setBusy(true);
    setError('');
    try {
      await updatePassword(pass);
      if (needsConsent) {
        await supabase.from('profiles').update({ data_policy_accepted_at: new Date().toISOString() }).eq('id', user.id);
        refreshProfile();
      }
      notify('Listo, tu contraseña quedó actualizada');
      navigate(next, { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell kicker="Recuperar acceso" title="Crea una nueva contraseña" lead={`Para la cuenta ${user.email}.`}>
      <form className="form" onSubmit={submit} noValidate>
        <FormNotice>{error}</FormNotice>
        <Field id="np-1" label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números.">
          <PasswordInput id="np-1" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} describedBy="np-1-hint" />
        </Field>
        <Field id="np-2" label="Repite la contraseña">
          <PasswordInput id="np-2" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
        </Field>
        {needsConsent && (
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Autorizo a Mercado Origen a tratar mis datos personales según la <Link to="/tratamiento-de-datos" target="_blank" className="link">política de tratamiento de datos</Link> (Ley 1581 de 2012).</span>
          </label>
        )}
        <button className="btn btn-green btn-block" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form>
    </AuthShell>
  );
}
