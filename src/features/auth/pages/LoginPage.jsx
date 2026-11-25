import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { friendlyError } from '../../../lib/errors.js';
import { useTitle } from '../../../lib/useTitle.js';
import { useToast } from '../../../components/Toast.jsx';
import { useAuth } from '../AuthProvider.jsx';
import { AuthShell, Field, FormNotice, PasswordInput, isEmail } from '../AuthShell.jsx';
import { GoogleButton } from '../GoogleButton.jsx';
import { safeNext } from '../guards.jsx';

export default function LoginPage() {
  useTitle('Iniciar sesión');
  const { signIn, resendConfirmation } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) return setError({ text: 'Escribe un correo válido, por ejemplo nombre@correo.com.' });
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      notify('¡Hola de nuevo!');
      navigate(next, { replace: true });
    } catch (err) {
      setError({ text: friendlyError(err), unconfirmed: err.code === 'email_not_confirmed' || /not confirmed/i.test(err.message) });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await resendConfirmation(email);
      notify('Te enviamos de nuevo el correo de confirmación');
    } catch (err) {
      notify(friendlyError(err), 'error');
    }
  };

  return (
    <AuthShell kicker="Mi cuenta" title="Entra a tu cuenta" lead="Sigue tus pedidos, guarda tus favoritos y paga más rápido.">
      <form className="form" onSubmit={submit} noValidate>
        <FormNotice>
          {error && (
            <>
              {error.text}
              {error.unconfirmed && (
                <> <button type="button" className="link-btn" onClick={resend}>Reenviar correo</button></>
              )}
            </>
          )}
        </FormNotice>
        <Field id="login-email" label="Correo electrónico">
          <input id="login-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field id="login-pass" label="Contraseña">
          <PasswordInput id="login-pass" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="form-row-end">
          <Link to={`/recuperar${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="link">¿Olvidaste tu contraseña?</Link>
        </div>
        <button className="btn btn-green btn-block" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <GoogleButton next={next} />
        <p className="form-alt">
          ¿Primera vez en Mercado Origen? <Link to={`/registro?next=${encodeURIComponent(next)}`} className="link">Crea tu cuenta</Link>
        </p>
      </form>
    </AuthShell>
  );
}
