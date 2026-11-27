import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { FormNotice } from './AuthShell.jsx';
import { useAuth } from './AuthProvider.jsx';

/**
 * Ley 1581 de 2012: quien entra con Google no pasó por el formulario de registro,
 * así que no ha dado la autorización de tratamiento de datos. Se le pide una sola
 * vez; si no acepta, se cierra la sesión.
 */
export function ConsentGate() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const ref = useRef(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const provider = user?.app_metadata?.provider;
  const open = !!profile && !profile.data_policy_accepted_at && !!provider && provider !== 'email';

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const accept = async () => {
    if (!checked) return setErr('Marca la casilla para continuar.');
    setBusy(true);
    setErr('');
    const { error } = await supabase.from('profiles').update({ data_policy_accepted_at: new Date().toISOString() }).eq('id', user.id);
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    refreshProfile();
  };

  return (
    <dialog ref={ref} className="consent-gate" aria-labelledby="consent-title" onCancel={(e) => e.preventDefault()}>
      {open && (
        <div className="consent-body">
          <h2 id="consent-title">Un último paso</h2>
          <p>Para crear tu cuenta con Google necesitamos tu autorización para tratar tus datos personales (nombre, correo y pedidos).</p>
          <label className="check">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>Autorizo a Mercado Origen a tratar mis datos personales según la <Link to="/tratamiento-de-datos" target="_blank" className="link">política de tratamiento de datos</Link> (Ley 1581 de 2012).</span>
          </label>
          <FormNotice>{err}</FormNotice>
          <div className="consent-actions">
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => signOut()}>No acepto, salir</button>
            <button type="button" className="btn btn-green" disabled={busy || !checked} onClick={accept}>{busy ? 'Guardando…' : 'Aceptar y continuar'}</button>
          </div>
        </div>
      )}
    </dialog>
  );
}
