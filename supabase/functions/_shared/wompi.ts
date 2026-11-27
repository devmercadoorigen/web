// Wompi Colombia (docs.wompi.co). Las llaves privadas y secretos solo viven aquí.
//  · Firma de integridad: SHA256(referencia + monto_en_centavos + moneda [+ expiración] + secreto_integridad)
//  · Checksum de eventos: SHA256(valores de signature.properties + timestamp + secreto_eventos)
//  · GET /v1/transactions/{id} exige la llave privada (Bearer prv_...)
//
// Hay DOS juegos de llaves en los secretos de Supabase:
//   WOMPI_TEST_*  (sandbox)   y   WOMPI_PROD_*  (producción)
// El modo activo lo escoge el admin en /admin/pagos (site_settings 'payments').
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type WompiMode = 'sandbox' | 'production';
export const MODES: WompiMode[] = ['sandbox', 'production'];

const PREFIX: Record<WompiMode, string> = { sandbox: 'WOMPI_TEST_', production: 'WOMPI_PROD_' };
/** Prefijo que debe tener cada llave según el ambiente (evita mezclar llaves). */
const SHAPE: Record<WompiMode, Record<string, string>> = {
  sandbox: { PUBLIC_KEY: 'pub_test_', PRIVATE_KEY: 'prv_test_', INTEGRITY_SECRET: 'test_integrity_', EVENTS_SECRET: 'test_events_' },
  production: { PUBLIC_KEY: 'pub_prod_', PRIVATE_KEY: 'prv_prod_', INTEGRITY_SECRET: 'prod_integrity_', EVENTS_SECRET: 'prod_events_' },
};

/** Compatibilidad: configuración vieja con un solo juego (WOMPI_ENV + WOMPI_*). */
const legacyMode = (): WompiMode => (Deno.env.get('WOMPI_ENV') === 'production' ? 'production' : 'sandbox');

function secret(mode: WompiMode, name: string): string {
  const v = Deno.env.get(PREFIX[mode] + name);
  if (v) return v.trim();
  return legacyMode() === mode ? (Deno.env.get('WOMPI_' + name) ?? '').trim() : '';
}

export function wompiKeys(mode: WompiMode) {
  return {
    mode,
    api: mode === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1',
    /** Valor de "environment" que manda Wompi en los eventos. */
    eventEnv: mode === 'production' ? 'prod' : 'test',
    publicKey: secret(mode, 'PUBLIC_KEY'),
    privateKey: secret(mode, 'PRIVATE_KEY'),
    integrity: secret(mode, 'INTEGRITY_SECRET'),
    events: secret(mode, 'EVENTS_SECRET'),
  };
}

/** Variables que faltan o que tienen llaves de otro ambiente. Vacío = listo para cobrar. */
export type KeyProblem = { name: string; problem: 'falta' | 'otro_ambiente' };
export function keyProblems(mode: WompiMode): KeyProblem[] {
  return Object.entries(SHAPE[mode]).flatMap(([name, prefix]): KeyProblem[] => {
    const v = secret(mode, name);
    if (v.length <= prefix.length && prefix.startsWith(v)) return [{ name: PREFIX[mode] + name, problem: 'falta' }];
    if (!v.startsWith(prefix)) return [{ name: PREFIX[mode] + name, problem: 'otro_ambiente' }];
    return [];
  });
}

export const isMode = (v: unknown): v is WompiMode => v === 'sandbox' || v === 'production';
export const modeFromEvent = (env: unknown): WompiMode | null => (env === 'prod' ? 'production' : env === 'test' ? 'sandbox' : null);

/** Modo activo elegido en el admin (si no hay fila, el de WOMPI_ENV). */
export async function getMode(sb: SupabaseClient): Promise<WompiMode> {
  const { data } = await sb.from('site_settings').select('value').eq('key', 'payments').maybeSingle();
  const m = (data?.value as { wompi_mode?: unknown } | null)?.wompi_mode;
  return isMode(m) ? m : legacyMode();
}

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

/** Consulta la transacción real en Wompi (servidor a servidor) en el ambiente indicado. */
export async function fetchTransaction(id: string, mode: WompiMode) {
  const { api, privateKey } = wompiKeys(mode);
  if (!privateKey) throw new Error(`${PREFIX[mode]}PRIVATE_KEY no configurada`);
  const res = await fetch(`${api}/transactions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${privateKey}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Wompi (${mode}) respondió ${res.status}`);
  const body = await res.json();
  return body.data as Record<string, unknown>;
}

export const PAYMENT_LABEL: Record<string, string> = {
  CARD: 'Tarjeta', PSE: 'PSE', NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', BANCOLOMBIA_TRANSFER: 'Botón Bancolombia',
  BANCOLOMBIA_QR: 'QR Bancolombia', PCOL: 'Puntos Colombia', BANCOLOMBIA_BNPL: 'Compra y paga después',
};
