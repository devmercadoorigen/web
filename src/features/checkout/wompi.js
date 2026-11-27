// Widget de Wompi (https://checkout.wompi.co/widget.js). Se descarga solo al pagar.
let loading = null;

export function loadWompi() {
  if (window.WidgetCheckout) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.wompi.co/widget.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error('No pudimos abrir la pasarela de pago. Revisa tu conexión e inténtalo de nuevo.'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/**
 * Abre el checkout de Wompi con los datos firmados por el servidor.
 * `onResult(transaction)` se llama si el cliente termina dentro del widget;
 * además Wompi redirige a /pago/resultado?id=… (redirectUrl).
 */
export async function openWompi(cfg, customer, onResult) {
  await loadWompi();
  // La llave pública la manda el servidor según el modo activo (prueba / producción),
  // así siempre coincide con la firma de integridad.
  const publicKey = cfg.publicKey;
  if (!publicKey) throw new Error('Los pagos todavía no están configurados. Escríbenos por WhatsApp para completar tu compra.');
  const digits = (v) => (v || '').replace(/\D/g, '').slice(-10);
  const a = customer.address || {};
  const options = {
    currency: cfg.currency,
    amountInCents: cfg.amountInCents,
    reference: cfg.reference,
    publicKey,
    signature: cfg.signature,
    redirectUrl: cfg.redirectUrl,
    expirationTime: cfg.expirationTime,
  };
  if (customer.email) {
    options.customerData = {
      email: customer.email,
      fullName: customer.full_name || undefined,
      phoneNumber: digits(customer.phone) || undefined,
      phoneNumberPrefix: customer.phone ? '+57' : undefined,
      ...(customer.legal_id ? { legalId: customer.legal_id, legalIdType: customer.legal_id_type || 'CC' } : {}),
    };
  }
  if (a.address_line && a.city) {
    options.shippingAddress = { addressLine1: a.address_line, city: a.city, region: a.department, country: 'CO', phoneNumber: digits(a.phone), name: a.recipient };
  }
  const checkout = new window.WidgetCheckout(options);
  checkout.open((result) => onResult?.(result?.transaction ?? null));
}
