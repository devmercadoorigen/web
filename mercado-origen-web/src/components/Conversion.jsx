import { useState } from 'react';
import { FAQS, productById } from '../data/catalog.js';
import { magnet, unmagnet } from '../lib/motion.js';
import { Icon, ProductArt } from './ui.jsx';

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq">
      <div className="wrap faq-grid">
        <div className="faq-side">
          <span className="kicker" data-anim="up">Antes de comprar</span>
          <h2 data-anim="up">Preguntas frecuentes</h2>
          <div className="help-card" data-anim="up">
            <span className="help-ico"><Icon name="whatsapp" size={26} stroke={1.8} /></span>
            <div>
              <b>¿Otra duda? Te ayudamos</b>
              <span>Escríbenos por WhatsApp al <strong>+57 314 239 8821</strong></span>
            </div>
          </div>
        </div>
        <div className="acc">
          {FAQS.map(([q, a], i) => (
            <div key={q} className={`acc-item${open === i ? ' open' : ''}`} data-anim="up">
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {q}<span className="acc-ico" aria-hidden="true" />
              </button>
              <div className="acc-panel"><div><p>{a}</p></div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const submit = (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    setMsg(ok ? { ok, text: 'Listo. Tu código es ORIGEN10 y también llegará a tu correo.' } : { ok, text: 'Escribe un correo válido, por ejemplo nombre@correo.com.' });
  };
  const float = ['bried', 'miel', 'tachacoa'].map(productById);

  return (
    <section className="news" id="unete">
      <div className="wrap">
        <div className="news-card" data-anim="scale">
          <div className="news-blobs" aria-hidden="true"><span /><span /><span /></div>
          <div className="news-copy">
            <span className="kicker light">Únete a la comunidad</span>
            <h2>10% de descuento en tu primera compra</h2>
            <p>Recibe el código, los lanzamientos de los embajadores y las cosechas de temporada. Un correo al mes.</p>
            <form onSubmit={submit} noValidate>
              <label htmlFor="leadEmail" className="sr-only">Correo electrónico</label>
              <input id="leadEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
              <button className="btn btn-ocre" type="submit" onMouseMove={magnet} onMouseLeave={unmagnet}>Quiero mi 10%</button>
            </form>
            {msg && <p className={`form-msg${msg.ok ? '' : ' err'}`} role="status">{msg.text}</p>}
            <small>Al suscribirte aceptas la política de tratamiento de datos (Ley 1581 de 2012).</small>
          </div>
          <div className="news-art" aria-hidden="true">
            {float.map((p, i) => <div key={p.id} className={`na na${i}`} data-speed={[0.15, -0.1, 0.25][i]}><ProductArt {...p} /></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
