import { useState } from 'react';
import { Icon, Tricolor } from '../../components/ui.jsx';
import { Img } from '../../components/Img.jsx';

/** Marco de login/registro: foto del territorio + formulario en tarjeta. */
export function AuthShell({ kicker, title, lead, children, image = '/img/found/finca-cafetera-pitalito.jpg', quote }) {
  return (
    <section className="auth">
      <div className="wrap auth-grid">
        <aside className="auth-visual" aria-hidden="true">
          <Img src={image} sizes="(max-width: 860px) 1px, 45vw" alt="" />
          <span className="auth-visual-shade" />
          <div className="auth-visual-copy">
            <Tricolor />
            <p>{quote || 'Café, cacao, miel y artesanías de los 37 municipios del Huila. Un carrito, un pago, un envío.'}</p>
          </div>
        </aside>
        <div className="auth-card">
          <span className="kicker">{kicker}</span>
          <h1>{title}</h1>
          {lead && <p className="auth-lead">{lead}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}

/** Campo con etiqueta visible, ayuda y error accesibles. */
export function Field({ id, label, hint, error, children, optional }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="field-opt"> (opcional)</span>}
      </label>
      {children}
      {error ? (
        <span className="field-error" id={`${id}-err`} role="alert">{error}</span>
      ) : (
        hint && <span className="field-hint" id={`${id}-hint`}>{hint}</span>
      )}
    </div>
  );
}

/** Contraseña con botón para mostrarla (útil en el celular). */
export function PasswordInput({ id, value, onChange, autoComplete = 'current-password', invalid, describedBy }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pass">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button type="button" className="pass-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show}>
        <Icon name={show ? 'eyeOff' : 'eye'} size={20} />
      </button>
    </div>
  );
}

/** Aviso dentro del formulario (error general o confirmación). */
export function FormNotice({ tone = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={tone === 'error' ? 'close' : 'check'} size={18} stroke={2.4} />
      <div>{children}</div>
    </div>
  );
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const passwordProblem = (v) =>
  v.length < 8 ? 'Usa al menos 8 caracteres.' : !/[a-zA-Z]/.test(v) || !/\d/.test(v) ? 'Combina letras y números.' : '';
