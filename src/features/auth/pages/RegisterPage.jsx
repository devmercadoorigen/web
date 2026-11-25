import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { friendlyError } from '../../../lib/errors.js';
import { useTitle } from '../../../lib/useTitle.js';
import { useToast } from '../../../components/Toast.jsx';
import { Icon } from '../../../components/ui.jsx';
import { useAuth } from '../AuthProvider.jsx';
import { AuthShell, Field, FormNotice, PasswordInput, isEmail, passwordProblem } from '../AuthShell.jsx';
import { GoogleButton } from '../GoogleButton.jsx';
import { safeNext } from '../guards.jsx';

export default function RegisterPage() {
  useTitle('Crear cuenta');
  const { signUp, resendConfirmation } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '', consent: false, marketing: false });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const validate = () => {
    const er = {};
    if (f.fullName.trim().length < 3) er.fullName = 'Escribe tu nombre y apellido.';
    if (!isEmail(f.email)) er.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    if (f.phone && !/^\+?[\d\s-]{7,15}$/.test(f.phone)) er.phone = 'Escribe un celular válido, por ejemplo 300 123 4567.';
    const pp = passwordProblem(f.password);
    if (pp) er.password = pp;
    if (!f.consent) er.consent = 'Para crear tu cuenta necesitamos tu autorización.';
    setErrors(er);
    return !Object.keys(er).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    setGeneral('');
    if (!validate()) return;
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp(f);
      if (needsConfirmation) setSentTo(f.email.trim());
      else {
        notify('¡Bienvenido a Mercado Origen!');
        navigate(next, { replace: true });
      }
    } catch (err) {
      setGeneral(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell kicker="Ya casi" title="Revisa tu correo" image="/img/tatacoa.jpg">
        <div className="auth-sent">
          <span className="auth-sent-ico"><Icon name="mail" size={30} stroke={1.8} /></span>
          <p>Te enviamos un enlace a <b>{sentTo}</b> para confirmar tu cuenta. Ábrelo desde este dispositivo o desde tu celular.</p>
          <p className="muted">¿No llegó? Revisa la carpeta de spam o pide otro.</p>
          <button type="button" className="btn btn-outline" onClick={() => resendConfirmation(sentTo).then(() => notify('Te lo enviamos de nuevo')).catch((er) => notify(friendlyError(er), 'error'))}>
            Reenviar correo
          </button>
          <Link to="/" className="link">Seguir mirando productos</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell kicker="Únete" title="Crea tu cuenta" lead="Guarda tus direcciones, sigue cada pedido y recibe las cosechas de temporada.">
      <form className="form" onSubmit={submit} noValidate>
        <FormNotice>{general}</FormNotice>
        <Field id="reg-name" label="Nombre completo" error={errors.fullName}>
          <input id="reg-name" autoComplete="name" value={f.fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName || undefined} aria-describedby={errors.fullName ? 'reg-name-err' : undefined} />
        </Field>
        <Field id="reg-email" label="Correo electrónico" error={errors.email}>
          <input id="reg-email" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={!!errors.email || undefined} aria-describedby={errors.email ? 'reg-email-err' : undefined} />
        </Field>
        <Field id="reg-phone" label="Celular" optional hint="Para avisarte por WhatsApp del estado de tu envío." error={errors.phone}>
          <input id="reg-phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} aria-describedby={errors.phone ? 'reg-phone-err' : 'reg-phone-hint'} />
        </Field>
        <Field id="reg-pass" label="Contraseña" hint="Mínimo 8 caracteres, con letras y números." error={errors.password}>
          <PasswordInput id="reg-pass" autoComplete="new-password" value={f.password} onChange={set('password')} invalid={!!errors.password} describedBy={errors.password ? 'reg-pass-err' : 'reg-pass-hint'} />
        </Field>

        <label className={`check${errors.consent ? ' has-error' : ''}`}>
          <input type="checkbox" checked={f.consent} onChange={set('consent')} aria-describedby={errors.consent ? 'reg-consent-err' : undefined} />
          <span>
            Autorizo a Mercado Origen a tratar mis datos personales según la{' '}
            <Link to="/tratamiento-de-datos" target="_blank" className="link">política de tratamiento de datos</Link> (Ley 1581 de 2012).
          </span>
        </label>
        {errors.consent && <span className="field-error" id="reg-consent-err" role="alert">{errors.consent}</span>}
        <label className="check">
          <input type="checkbox" checked={f.marketing} onChange={set('marketing')} />
          <span>Quiero recibir lanzamientos de los embajadores y cosechas de temporada (un correo al mes).</span>
        </label>

        <button className="btn btn-green btn-block" type="submit" disabled={busy}>{busy ? 'Creando tu cuenta…' : 'Crear cuenta'}</button>
        <GoogleButton next={next} />
        <p className="form-alt">
          ¿Ya tienes cuenta? <Link to={`/login?next=${encodeURIComponent(next)}`} className="link">Inicia sesión</Link>
        </p>
      </form>
    </AuthShell>
  );
}
