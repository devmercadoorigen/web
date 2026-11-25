import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { Field, FormNotice, isEmail } from '../auth/AuthShell.jsx';
import { AddressFields, EMPTY_ADDRESS, validateAddress } from '../account/AddressesPage.jsx';
import { useCart } from '../cart/CartProvider.jsx';
import { cartSignature, clearPending, createOrder, quoteCheckout, readPending, retryPayment, savePending } from './api.js';
import { openWompi } from './wompi.js';

const DOC_TYPES = [['CC', 'C.C.'], ['CE', 'C.E.'], ['NIT', 'NIT'], ['PP', 'Pasaporte']];

function Summary({ quote, lines, loading, coupon, setCoupon, applyCoupon, removeCoupon }) {
  const byKey = new Map(lines.map((l) => [l.cartKey, l]));
  return (
    <div className="co-sum">
      <ul className="co-lines">
        {[...byKey.values()].map((l) => (
          <li key={l.cartKey}>
            <div className="thumb"><ProductArt art={l.art} artLabel={l.artLabel} colors={l.colors} image={l.image} maker={l.maker} alt="" /><span className="co-q">{l.qty}</span></div>
            <div><b>{l.name}</b><span className="muted">{l.sub}</span></div>
            <span>{money(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>

      <form className="co-coupon" onSubmit={(e) => { e.preventDefault(); applyCoupon(); }}>
        <label htmlFor="co-coupon" className="sr-only">Cupón de descuento</label>
        <input id="co-coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Cupón de descuento" autoComplete="off" autoCapitalize="characters" />
        <button type="submit" className="btn btn-outline btn-sm" disabled={!coupon.trim()}>Aplicar</button>
      </form>
      {quote?.coupon && (
        <p className={`co-coupon-msg${quote.coupon.ok ? ' ok' : ' err'}`} role="status">
          {quote.coupon.ok ? <><Icon name="check" size={16} stroke={2.6} />Cupón {quote.coupon.code} aplicado</> : quote.coupon.message}
          <button type="button" className="link-btn" onClick={removeCoupon}>Quitar</button>
        </p>
      )}

      <dl className={`totals${loading ? ' is-loading' : ''}`}>
        <dt>Subtotal</dt><dd>{quote ? money(quote.subtotal) : '…'}</dd>
        {quote?.discount > 0 && (<><dt>Descuento</dt><dd className="ok">−{money(quote.discount)}</dd></>)}
        <dt>Envío</dt><dd>{!quote ? '…' : quote.shipping ? money(quote.shipping) : 'Gratis'}</dd>
        <dt className="total">Total</dt><dd className="total">{quote ? money(quote.total) : '…'}</dd>
      </dl>
      {quote && quote.shipping > 0 && quote.subtotal < quote.free_shipping_threshold && (
        <p className="muted small">Te faltan <b>{money(quote.free_shipping_threshold - quote.subtotal)}</b> para el envío gratis.</p>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  useTitle('Finalizar compra');
  const { items, lines, count } = useCart();
  const { user, profile } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [contact, setContact] = useState({ email: '', full_name: '', phone: '', legal_id_type: 'CC', legal_id: '' });
  const [addrChoice, setAddrChoice] = useState('new'); // id de dirección guardada | 'new'
  const [addr, setAddr] = useState({ ...EMPTY_ADDRESS, label: 'Casa' });
  const [saveAddr, setSaveAddr] = useState(true);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);

  // Datos de la cuenta, una sola vez
  useEffect(() => {
    if (!user) return;
    setContact((c) => ({
      ...c,
      email: c.email || user.email || '',
      full_name: c.full_name || profile?.full_name || '',
      phone: c.phone || profile?.phone || '',
    }));
  }, [user, profile]);

  const addresses = useQuery({
    queryKey: ['addresses', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at');
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (addresses.data?.length && addrChoice === 'new') setAddrChoice(addresses.data[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses.data]);

  const shipAddr = useMemo(() => {
    const saved = addresses.data?.find((a) => a.id === addrChoice);
    return saved ? { ...saved, notes: saved.notes || '' } : addr;
  }, [addresses.data, addrChoice, addr]);

  const itemsPayload = useMemo(
    () =>
      Object.entries(items)
        .filter(([k, q]) => q > 0 && k.includes(':'))
        .map(([k, q]) => (k.startsWith('p:') ? { product_id: k.slice(2), quantity: q } : k.startsWith('v:') ? { variant_id: k.slice(2), quantity: q } : { kit_id: k.slice(2), quantity: q })),
    [items]
  );

  // Resumen del servidor: se recalcula al cambiar carrito, cupón o ciudad.
  const quoteQ = useQuery({
    queryKey: ['quote', itemsPayload, applied, shipAddr.city, shipAddr.department],
    enabled: itemsPayload.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: () =>
      quoteCheckout({
        items: itemsPayload,
        coupon_code: applied || null,
        email: contact.email,
        address: { city: shipAddr.city, department: shipAddr.department },
      }),
  });
  const quote = quoteQ.data;
  const blocking = (quote?.problems || []).filter((p) => p.type !== 'coupon');

  if (!count) {
    return (
      <section className="page-state">
        <div className="wrap">
          <div className="empty">
            <Icon name="bag" size={40} stroke={1.6} />
            <b>Tu caja está vacía</b>
            <p>Agrega productos del Huila para continuar al pago.</p>
            <Link className="btn btn-green" to="/#tienda">Ver productos</Link>
          </div>
        </div>
      </section>
    );
  }

  const validate = () => {
    const e = {};
    if (!isEmail(contact.email)) e.email = 'Escribe un correo válido: ahí te llega la confirmación.';
    if (contact.full_name.trim().length < 3) e.full_name = 'Escribe tu nombre completo.';
    if (!/^\+?[\d\s-]{7,15}$/.test(contact.phone)) e.phone = 'Escribe un celular válido, por ejemplo 300 123 4567.';
    if (contact.legal_id && !/^[\dA-Za-z-]{5,15}$/.test(contact.legal_id)) e.legal_id = 'Revisa el número de documento.';
    if (addrChoice === 'new') Object.assign(e, validateAddress(addr));
    if (quote?.age_required && !ageOk) e.age = 'Confirma que eres mayor de 18 años.';
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.getElementById(e.email ? 'co-email' : e.full_name ? 'co-name' : e.phone ? 'co-phone' : e.age ? 'co-age' : `ad-${Object.keys(e)[0]}`);
      first?.focus();
    }
    return !Object.keys(e).length;
  };

  const pay = async () => {
    setGeneral('');
    if (!validate()) return;
    if (blocking.length) return setGeneral(blocking[0].message);
    setBusy(true);
    const payload = {
      items: itemsPayload,
      email: contact.email.trim(),
      full_name: contact.full_name.trim(),
      phone: contact.phone.trim(),
      legal_id_type: contact.legal_id ? contact.legal_id_type : null,
      legal_id: contact.legal_id.trim() || null,
      address: {
        recipient: shipAddr.recipient, phone: shipAddr.phone, department: shipAddr.department,
        city: shipAddr.city, address_line: shipAddr.address_line, notes: shipAddr.notes || '',
      },
      coupon_code: quote?.coupon?.ok ? applied : null,
      age_confirmed: ageOk,
    };
    const sig = cartSignature(itemsPayload, payload.coupon_code);
    try {
      // Si ya hay un pedido de este mismo carrito esperando pago, se reintenta en vez de duplicarlo.
      const pending = readPending();
      let res;
      if (pending && pending.sig === sig) {
        try {
          res = await retryPayment(pending.order_number, pending.access_token);
        } catch {
          clearPending();
        }
      }
      if (!res) res = await createOrder(payload);
      savePending({ order_number: res.order_number, access_token: res.access_token, sig, email: payload.email });

      if (user && addrChoice === 'new' && saveAddr) {
        supabase.from('addresses').insert({
          user_id: user.id, label: addr.label || 'Casa', recipient: addr.recipient, phone: addr.phone, department: addr.department,
          city: addr.city, address_line: addr.address_line, notes: addr.notes || null, is_default: !addresses.data?.length,
        }).then(() => {});
      }

      await openWompi(res.wompi, { ...payload }, (tx) => {
        if (tx?.id) navigate(`/pago/resultado?id=${encodeURIComponent(tx.id)}`);
      });
    } catch (err) {
      setGeneral(err.message);
      if (err.problems) quoteQ.refetch();
    } finally {
      setBusy(false);
    }
  };

  const setC = (k) => (e) => setContact((c) => ({ ...c, [k]: e.target.value }));
  const fieldErr = (k, id) => ({ 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? `${id}-err` : undefined });
  const summaryProps = {
    quote, lines, loading: quoteQ.isFetching, coupon, setCoupon,
    applyCoupon: () => setApplied(coupon.trim()),
    removeCoupon: () => { setApplied(''); setCoupon(''); },
  };

  return (
    <section className="checkout">
      <div className="wrap">
        <header className="account-head">
          <span className="kicker">Pago seguro</span>
          <h1>Finaliza tu compra</h1>
        </header>

        {/* Móvil: resumen plegable arriba */}
        <details className="co-mobile-sum panel">
          <summary>
            <span><Icon name="bag" size={18} /> Ver resumen ({count} {count === 1 ? 'producto' : 'productos'})</span>
            <b>{quote ? money(quote.total) : '…'}</b>
          </summary>
          <Summary {...summaryProps} />
        </details>

        <div className="co-grid">
          <form className="co-main" noValidate onSubmit={(e) => { e.preventDefault(); pay(); }}>
            <section className="panel co-step" aria-labelledby="co-s1">
              <h2 id="co-s1"><span className="co-num">1</span>Tus datos</h2>
              {!user && (
                <p className="muted small">
                  Puedes comprar como invitado. ¿Ya tienes cuenta? <Link to="/login?next=/checkout" className="link">Inicia sesión</Link> para usar tus direcciones.
                </p>
              )}
              <div className="form-2">
                <Field id="co-email" label="Correo electrónico" hint="Aquí te llega la confirmación del pedido." error={errors.email}>
                  <input id="co-email" type="email" inputMode="email" autoComplete="email" value={contact.email} onChange={setC('email')} readOnly={!!user} {...fieldErr('email', 'co-email')} />
                </Field>
                <Field id="co-name" label="Nombre completo" error={errors.full_name}>
                  <input id="co-name" autoComplete="name" value={contact.full_name} onChange={setC('full_name')} {...fieldErr('full_name', 'co-name')} />
                </Field>
                <Field id="co-phone" label="Celular" hint="Te escribimos por WhatsApp si hay novedades con el envío." error={errors.phone}>
                  <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" value={contact.phone} onChange={setC('phone')} {...fieldErr('phone', 'co-phone')} />
                </Field>
                <div className="field-pair">
                  <Field id="co-doctype" label="Documento" optional>
                    <select id="co-doctype" value={contact.legal_id_type} onChange={setC('legal_id_type')}>
                      {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Field>
                  <Field id="co-doc" label="Número" error={errors.legal_id}>
                    <input id="co-doc" inputMode="numeric" value={contact.legal_id} onChange={setC('legal_id')} {...fieldErr('legal_id', 'co-doc')} />
                  </Field>
                </div>
              </div>
            </section>

            <section className="panel co-step" aria-labelledby="co-s2">
              <h2 id="co-s2"><span className="co-num">2</span>¿A dónde te lo enviamos?</h2>
              {addresses.data?.length > 0 && (
                <div className="addr-pick" role="radiogroup" aria-label="Direcciones guardadas">
                  {addresses.data.map((a) => (
                    <label key={a.id} className={`addr-opt${addrChoice === a.id ? ' on' : ''}`}>
                      <input type="radio" name="addr" checked={addrChoice === a.id} onChange={() => setAddrChoice(a.id)} />
                      <span><b>{a.label}</b>{a.address_line}, {a.city}</span>
                    </label>
                  ))}
                  <label className={`addr-opt${addrChoice === 'new' ? ' on' : ''}`}>
                    <input type="radio" name="addr" checked={addrChoice === 'new'} onChange={() => setAddrChoice('new')} />
                    <span><b>Otra dirección</b>Envía a una dirección nueva</span>
                  </label>
                </div>
              )}
              {addrChoice === 'new' && (
                <div className="form">
                  <AddressFields value={addr} onChange={setAddr} errors={errors} withLabel={!!user} />
                  {user && (
                    <label className="check">
                      <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} />
                      <span>Guardar esta dirección en mi cuenta</span>
                    </label>
                  )}
                </div>
              )}
              <p className="ship-note"><Icon name="truck" size={18} />Consolidamos tu pedido en el Huila y lo despachamos en una sola caja.</p>
            </section>

            <section className="panel co-step" aria-labelledby="co-s3">
              <h2 id="co-s3"><span className="co-num">3</span>Pago</h2>
              <div className="pay-methods" aria-label="Medios de pago">
                {['Tarjeta', 'PSE', 'Nequi', 'Daviplata', 'Bancolombia'].map((m) => <span key={m}>{m}</span>)}
              </div>
              <p className="muted small">
                Pagas en la pasarela segura de Wompi (Grupo Bancolombia). Mercado Origen no ve ni guarda los datos de tu tarjeta
                y reparte el pago entre los embajadores.
              </p>
              {quote?.age_required && (
                <>
                  <label className={`check${errors.age ? ' has-error' : ''}`}>
                    <input id="co-age" type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} />
                    <span>Confirmo que soy mayor de 18 años. Tu pedido incluye bebidas alcohólicas.</span>
                  </label>
                  {errors.age && <span className="field-error" role="alert">{errors.age}</span>}
                  <p className="legal-note">El exceso de alcohol es perjudicial para la salud. Prohíbese el expendio de bebidas embriagantes a menores de edad.</p>
                </>
              )}
              {blocking.length > 0 && (
                <FormNotice>
                  {blocking.map((p) => <span key={p.message} className="block">{p.message}</span>)}
                  <Link to="/carrito" className="link">Ajustar mi carrito</Link>
                </FormNotice>
              )}
              <FormNotice>{general}</FormNotice>
              <div className="co-pay">
                <button type="submit" className="btn btn-ocre btn-lg btn-block" disabled={busy || !quote || blocking.length > 0}>
                  <Icon name="lock" size={18} stroke={2.2} />
                  {busy ? 'Abriendo la pasarela…' : quote ? `Pagar ${money(quote.total)}` : 'Calculando…'}
                </button>
              </div>
              <p className="muted small center">
                Al pagar aceptas los <Link to="/tratamiento-de-datos" className="link">términos y la política de datos</Link>.
              </p>
            </section>
          </form>

          <aside className="co-summary co-desktop-sum">
            <div className="panel">
              <h2 className="panel-title">Tu caja</h2>
              <Summary {...summaryProps} />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
