// Convierte errores de Supabase/Postgres en mensajes claros en español.
const AUTH = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Aún no confirmas tu correo. Revisa tu bandeja de entrada (y la de spam).',
  user_already_exists: 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
  email_exists: 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
  weak_password: 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
  same_password: 'La nueva contraseña debe ser distinta a la anterior.',
  over_email_send_rate_limit: 'Ya te enviamos un correo hace poco. Espera un minuto antes de pedir otro.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  email_address_invalid: 'Escribe un correo válido, por ejemplo nombre@correo.com.',
  validation_failed: 'Revisa los datos del formulario.',
  session_not_found: 'Tu sesión venció. Vuelve a iniciar sesión.',
  otp_expired: 'El enlace venció o ya se usó. Pide uno nuevo.',
  user_banned: 'Esta cuenta está desactivada. Escríbenos por WhatsApp si crees que es un error.',
};

/** @param {any} err */
export function friendlyError(err) {
  if (!err) return '';
  const msg = String(err.message || err);
  if (err.code && AUTH[err.code]) return AUTH[err.code];
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.';
  if (/invalid login credentials/i.test(msg)) return AUTH.invalid_credentials;
  if (/email not confirmed/i.test(msg)) return AUTH.email_not_confirmed;
  if (/password should/i.test(msg)) return AUTH.weak_password;
  if (/row-level security|permission denied/i.test(msg)) return 'No tienes permiso para hacer esto.';
  // Mensajes propios de la base (triggers y RPC): ya vienen en español.
  if (['42501', 'P0001', 'P0002', '22023', '23514'].includes(err.code)) return msg;
  if (err.code === '23505') return 'Ese dato ya existe.';
  return 'Algo salió mal. Inténtalo de nuevo en un momento.';
}
