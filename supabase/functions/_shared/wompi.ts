// Wompi Colombia (docs.wompi.co). Las llaves privadas y secretos solo viven aquí.
//  · Firma de integridad: SHA256(referencia + monto_en_centavos + moneda [+ expiración] + secreto_integridad)
//  · Checksum de eventos: SHA256(valores de signature.properties + timestamp + secreto_eventos)
//  · GET /v1/transactions/{id} exige la llave privada (Bearer prv_...)

export const WOMPI_ENV = Deno.env.get('WOMPI_ENV') === 'production' ? 'production' : 'sandbox';
export const WOMPI_API = WOMPI_ENV === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';
/** Valor de "environment" que manda Wompi en los eventos. */
export const WOMPI_EVENT_ENV = WOMPI_ENV === 'production' ? 'prod' : 'test';

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function integritySignature(reference: string, amountInCents: number, currency: string, expirationTime: string | null, secret: string) {
  return sha256Hex(`${reference}${amountInCents}${currency}${expirationTime ?? ''}${secret}`);
}

/** Comparación en tiempo constante (evita filtrar el checksum por tiempos de respuesta). */
export function safeEqual(a: string, b: string) {
  const x = a.toLowerCase(), y = b.toLowerCase();
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

type WompiEvent = {
  event: string;
  data: Record<string, unknown>;
  environment: string;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  sent_at?: string;
};

/** Verifica el checksum leyendo las propiedades que indique el propio evento (no se fijan a mano). */
export async function verifyEvent(evt: WompiEvent, secret: string, headerChecksum: string | null) {
  if (!evt?.signature?.properties?.length || !evt.signature.checksum || typeof evt.timestamp !== 'number') return false;
  const values = evt.signature.properties.map((path) =>
    path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), evt.data),
  );
  if (values.some((v) => v === undefined || v === null)) return false;
  const expected = await sha256Hex(values.map(String).join('') + evt.timestamp + secret);
  if (!safeEqual(expected, evt.signature.checksum)) return false;
  return headerChecksum ? safeEqual(expected, headerChecksum) : true;
}

/** Consulta la transacción real en Wompi (servidor a servidor). */
export async function fetchTransaction(id: string) {
  const key = Deno.env.get('WOMPI_PRIVATE_KEY');
  if (!key) throw new Error('WOMPI_PRIVATE_KEY no configurada');
  const res = await fetch(`${WOMPI_API}/transactions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Wompi respondió ${res.status}`);
  const body = await res.json();
  return body.data as Record<string, unknown>;
}

export const PAYMENT_LABEL: Record<string, string> = {
  CARD: 'Tarjeta', PSE: 'PSE', NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', BANCOLOMBIA_TRANSFER: 'Botón Bancolombia',
  BANCOLOMBIA_QR: 'QR Bancolombia', PCOL: 'Puntos Colombia', BANCOLOMBIA_BNPL: 'Compra y paga después',
};
