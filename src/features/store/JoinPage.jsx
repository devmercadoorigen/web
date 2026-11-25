import { useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { Field, FormNotice, isEmail } from '../auth/AuthShell.jsx';
import { useSite } from '../site/SiteProvider.jsx';

const EMPTY = { name: '', email: '', phone: '', brand_name: '', municipality_id: '', category_id: '', description: '', consent: false, website: '' };

/** Formulario "Quiero ser embajador": guarda en ambassador_applications (lo revisa el admin). */
export default function JoinPage() {
  useTitle('Quiero ser embajador');
  const site = useSite();
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (f.website) return setSent(true); // trampa para robots: un humano no ve este campo
    const er = {};
    if (f.name.trim().length < 3) er.name = 'Escribe tu nombre completo.';
    if (!isEmail(f.email)) er.email = 'Escribe un correo válido.';
    if (!/^\+?[\d\s-]{7,15}$/.test(f.phone)) er.phone = 'Escribe un celular válido, por ejemplo 300 123 4567.';
    if (!f.municipality_id) er.municipality_id = 'Elige tu municipio.';
    if (f.description.trim().length < 20) er.description = 'Cuéntanos un poco más (al menos 20 caracteres).';
    if (!f.consent) er.consent = 'Necesitamos tu autorización para contactarte.';
    setErrors(er);
    if (Object.keys(er).length) return setGeneral('Revisa los campos marcados.');
    setBusy(true);
    setGeneral('');
    const { error } = await supabase.from('ambassador_applications').insert({
      name: f.name.trim(), email: f.email.trim().toLowerCase(), phone: f.phone.trim(), brand_name: f.brand_name.trim() || null,
      municipality_id: f.municipality_id, category_id: f.category_id || null, description: f.description.trim(),
      data_policy_accepted_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return setGeneral(friendlyError(error));
    setSent(true);
  };
  const err = (k) => ({ 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? `jn-${k}-err` : undefined });

  return (
    <section className="store join">
      <div className="wrap join-grid">
        <div className="join-copy">
          <span className="kicker">Embajadores del Huila</span>
          <h1>Vende lo que haces en el Huila a todo el país</h1>
          <p className="pdp-lead">Mercado Origen reúne a productores de los {site.counts.municipalities || 37} municipios en una sola tienda. Tú haces el producto; nosotros nos encargamos del pago, la consolidación y el envío.</p>
          <ul className="join-list">
            <li><Icon name="card" size={22} /><div><b>Cobramos por ti</b><span>El cliente paga con PSE, Nequi o tarjeta y te transferimos tu parte.</span></div></li>
            <li><Icon name="box" size={22} /><div><b>Recogemos en tu taller</b><span>Marcas el pedido como listo y lo llevamos a la bodega del Huila.</span></div></li>
            <li><Icon name="award" size={22} /><div><b>Tu historia, en primer plano</b><span>Tienes tu propia página con fotos, historia y redes.</span></div></li>
            <li><Icon name="leaf" size={22} /><div><b>Tu panel</b><span>Subes productos, ves tus ventas y tus pagos desde el celular.</span></div></li>
          </ul>
        </div>

        <div className="panel join-card">
          {sent ? (
            <div className="join-sent">
              <span className="result-ico"><Icon name="check" size={30} stroke={2.4} /></span>
              <h2>¡Recibimos tu solicitud!</h2>
              <p>Te escribiremos en los próximos días al correo o al WhatsApp que nos dejaste para conocer tu producto.</p>
              <Link to="/" className="btn btn-green">Volver a la tienda</Link>
            </div>
          ) : (
            <form className="form" onSubmit={submit} noValidate>
              <h2 className="panel-title">Cuéntanos de ti</h2>
              <FormNotice>{general}</FormNotice>
              <div className="form-2">
                <Field id="jn-name" label="Tu nombre" error={errors.name}><input id="jn-name" autoComplete="name" value={f.name} onChange={set('name')} {...err('name')} /></Field>
                <Field id="jn-brand_name" label="Nombre de tu marca" optional><input id="jn-brand_name" value={f.brand_name} onChange={set('brand_name')} /></Field>
                <Field id="jn-email" label="Correo" error={errors.email}><input id="jn-email" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} {...err('email')} /></Field>
                <Field id="jn-phone" label="Celular (WhatsApp)" error={errors.phone}><input id="jn-phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} {...err('phone')} /></Field>
                <Field id="jn-municipality_id" label="¿Dónde produces?" error={errors.municipality_id}>
                  <select id="jn-municipality_id" value={f.municipality_id} onChange={set('municipality_id')} {...err('municipality_id')}>
                    <option value="">Elige tu municipio…</option>
                    {site.zones.map((z) => (
                      <optgroup key={z.slug} label={`Zona ${z.name}`}>
                        {z.municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field id="jn-category_id" label="¿Qué produces?" optional>
                  <select id="jn-category_id" value={f.category_id} onChange={set('category_id')}>
                    <option value="">Elige una categoría…</option>
                    {site.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field id="jn-description" label="Tu producto y tu historia" hint="Qué haces, desde cuándo y qué lo hace especial." error={errors.description}>
                <textarea id="jn-description" rows={5} maxLength={3000} value={f.description} onChange={set('description')} {...err('description')} />
              </Field>
              <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} aria-hidden="true" />
              <label className={`check${errors.consent ? ' has-error' : ''}`}>
                <input type="checkbox" checked={f.consent} onChange={set('consent')} />
                <span>Autorizo a Mercado Origen a usar estos datos para evaluar mi solicitud y contactarme, según la <Link to="/tratamiento-de-datos" className="link" target="_blank">política de tratamiento de datos</Link> (Ley 1581 de 2012).</span>
              </label>
              {errors.consent && <span className="field-error" role="alert">{errors.consent}</span>}
              <button type="submit" className="btn btn-green btn-block" disabled={busy}>{busy ? 'Enviando…' : 'Enviar mi solicitud'}</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
