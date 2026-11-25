import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { friendlyError } from '../../../lib/errors.js';
import { useTitle } from '../../../lib/useTitle.js';
import { useAuth } from '../AuthProvider.jsx';
import { AuthShell, Field, FormNotice, isEmail } from '../AuthShell.jsx';

export default function RecoverPage() {
  useTitle('Recuperar contraseña');
  const { sendReset } = useAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) return setError('Escribe un correo válido, por ejemplo nombre@correo.com.');
    setBusy(true);
    setError('');
    try {
      await sendReset(email);
      setSent(true);   // mismo mensaje exista o no la cuenta
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell kicker="Recuperar acceso" title="¿Olvidaste tu contraseña?" lead="Escribe tu correo y te enviamos un enlace para crear una nueva." image="/img/san-agustin.jpg">
      {sent ? (
        <div className="form">
          <FormNotice tone="ok">
            Si existe una cuenta con <b>{email.trim()}</b>, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.
          </FormNotice>
          <Link to="/login" className="btn btn-green btn-block">Volver a iniciar sesión</Link>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <FormNotice>{error}</FormNotice>
          <Field id="rec-email" label="Correo electrónico">
            <input id="rec-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <button className="btn btn-green btn-block" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
          <p className="form-alt"><Link to="/login" className="link">Volver a iniciar sesión</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
