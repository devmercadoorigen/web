import { useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../lib/supabase.js';
import { friendlyError } from '../lib/errors.js';
import { useCatalog } from '../features/catalog/CatalogProvider.jsx';
import { useSite } from '../features/site/SiteProvider.jsx';
import { magnet, unmagnet } from '../lib/motion.js';
import { Icon, ProductArt } from './ui.jsx';

export function Faq() {
  const [open, setOpen] = useState(0);
  const { faqs, contact } = useSite();
  return (
    <section className="faq" id="faq">
      <div className="wrap faq-grid">
        <div className="faq-side">
          <span className="kicker" data-anim="up">Antes de comprar</span>
          <h2 data-anim="up">Preguntas frecuentes</h2>
          <div className="help-card" data-anim="up">
            <span className="help-ico"><Icon name="whatsapp" size={26} stroke={1.8} /></span>
            <div>
              <b>¿Otra duda? Te ayudamos</b>
              <span>Escríbenos por WhatsApp al <strong>{contact.whatsapp || '+57 314 239 8821'}</strong></span>
            </div>
          </div>
        </div>
        <div className="acc">
          {faqs.map((f, i) => (
            <div key={f.id} className={`acc-item${open === i ? ' open' : ''}`} data-anim="up">
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {f.question}<span className="acc-ico" aria-hidden="true" />
              </button>
              <div className="acc-panel"><div><p>{f.answer}</p></div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Newsletter() {
  const { welcomeCoupon } = useSite();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Consentimiento previo y expreso (Ley 1581): se guarda la fecha en el servidor.
  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setMsg({ ok: false, text: 'Escribe un correo válido, por ejemplo nombre@correo.com.' });
    if (!consent) return setMsg({ ok: false, text: 'Marca la casilla para autorizar el envío de correos.' });
    setBusy(true);
    const { error } = await supabase.rpc('subscribe_newsletter', { p_email: email.trim(), p_source: 'home' });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: friendlyError(error) });
    setEmail('');
    setMsg({
      ok: true,
      text: welcomeCoupon
        ? <>¡Listo! Tu código es <b className="coupon-code">{welcomeCoupon}</b>: úsalo en tu primera compra.</>
        : '¡Listo! Te escribiremos con los lanzamientos y las cosechas de temporada.',
    });
  };

  // Tres empaques distintos (barra, frasco, bola) para la ilustración del boletín.
  const { products } = useCatalog();
  const float = ['bar', 'jar', 'ball']
    .map((art) => products.find((p) => p.art === art && !p.featured) || products.find((p) => p.art === art))
    .filter(Boolean);

  return (
    <section className="news" id="unete">
      <div className="wrap">
        <div className="news-card" data-anim="scale">
          <div className="news-blobs" aria-hidden="true"><span /><span /><span /></div>
          <div className="news-copy">
            <span className="kicker light">Únete a la comunidad</span>
            <h2>{welcomeCoupon ? '10% de descuento en tu primera compra' : 'Lo nuevo del Huila, en tu correo'}</h2>
            <p>{welcomeCoupon ? 'Recibe el código, los' : 'Recibe los'} lanzamientos de los embajadores y las cosechas de temporada. Un correo al mes.</p>
            <form onSubmit={submit} noValidate>
              <label htmlFor="leadEmail" className="sr-only">Correo electrónico</label>
              <input id="leadEmail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
              <button className="btn btn-ocre" type="submit" disabled={busy} onMouseMove={magnet} onMouseLeave={unmagnet}>{welcomeCoupon ? 'Quiero mi 10%' : 'Suscribirme'}</button>
            </form>
            <label className="news-consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>Autorizo a Mercado Origen a enviarme correos y a tratar mis datos según la <Link to="/tratamiento-de-datos">política de tratamiento de datos</Link> (Ley 1581 de 2012).</span>
            </label>
            {msg && <p className={`form-msg${msg.ok ? '' : ' err'}`} role="status">{msg.text}</p>}
          </div>
          <div className="news-art" aria-hidden="true">
            {float.map((p, i) => <div key={p.id} className={`na na${i}`} data-speed={[0.15, -0.1, 0.25][i]}><ProductArt {...p} /></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
