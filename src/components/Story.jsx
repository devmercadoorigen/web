import { Link } from 'react-router';
import { useSite } from '../features/site/SiteProvider.jsx';
import { Icon } from './ui.jsx';
import { Img } from './Img.jsx';

function AmbCard({ a }) {
  const z = a.zone;
  return (
    <article className="amb">
      <div className="amb-top">
        {a.avatar_url
          ? <img className="amb-ava" src={a.avatar_url} alt="" width="54" height="54" loading="lazy" />
          : <span className="amb-ava" style={{ background: z?.fill_color, color: z?.label_color }}>{a.initials}</span>}
        <div>
          <b>{a.brand_name}</b>
          <span><Icon name="pin" size={13} stroke={2.4} />{a.municipality?.name} · {z?.name}</span>
        </div>
      </div>
      <p>{a.short_description}</p>
      <div className="amb-foot">
        {a.award ? <span className="amb-award"><Icon name="award" size={14} stroke={2.2} />{a.award}</span> : <span />}
        <Link to={`/embajador/${a.slug}`}>Ver productos <Icon name="arrow" size={15} stroke={2.4} /></Link>
      </div>
    </article>
  );
}

// Dos cintas de embajadores que avanzan en sentidos opuestos (se pausan al pasar el cursor).
export function Ambassadors() {
  const { ambassadors } = useSite();
  const half = Math.ceil(ambassadors.length / 2);
  const rows = [ambassadors, [...ambassadors.slice(half), ...ambassadors.slice(0, half)]];
  return (
    <section id="embajadores" className="ambs">
      <div className="wrap sec-head split-head">
        <div>
          <span className="kicker" data-anim="up">Embajadores activos</span>
          <h2 data-anim="up">Las manos detrás de cada producto</h2>
        </div>
        <div className="ambs-cta" data-anim="up">
          <p>{ambassadors.length} familias, fincas y talleres del Huila con historia propia.</p>
          <div className="form-actions">
            <Link className="btn btn-outline" to="/quiero-ser-embajador">Quiero ser embajador</Link>
            <Link className="text-cta" to="/embajadores">Conócelos a todos <Icon name="arrow" size={18} stroke={2.4} /></Link>
          </div>
        </div>
      </div>
      <div className="amb-lanes">
        {rows.map((r, i) => (
          <div className={`amb-lane${i ? ' rev' : ''}`} key={i}>
            <div className="amb-track">
              {[...r, ...r].map((a, j) => <AmbCard key={`${a.id}${j}`} a={a} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Collage con parallax a distintas velocidades.
export function Culture() {
  return (
    <section className="culture" id="historia">
      <div className="wrap culture-grid">
        <div className="culture-copy">
          <span className="kicker" data-anim="up">Nuestra historia</span>
          <h2 data-anim="up">Cada caja lleva un pedazo del <em>Sanjuanero</em></h2>
          <p data-anim="up">
            El Huila es tierra de promisión, de bambuco y de fiestas de San Pedro. Mercado Origen nació para que esa cultura viaje con lo que producimos: cada
            pedido incluye una tarjeta con la historia de su embajador y de su municipio.
          </p>
          <ul className="culture-list" data-anim="up">
            <li><Icon name="check" size={18} stroke={2.6} />Comercio directo con productores locales</li>
            <li><Icon name="check" size={18} stroke={2.6} />Promoción de la cultura y el agro huilense</li>
            <li><Icon name="check" size={18} stroke={2.6} />Empleo en el campo y en los talleres del departamento</li>
          </ul>
        </div>
        <div className="collage" aria-label="Fotos del Huila">
          <figure className="c1" data-speed="0.08"><Img src="/img/sanjuanero.jpg" sizes="(max-width: 860px) 60vw, 30vw" alt="Pareja bailando el Sanjuanero huilense" loading="lazy" /></figure>
          <figure className="c2" data-speed="0.22"><Img src="/img/found/iglesia-villavieja.jpg" sizes="(max-width: 860px) 50vw, 25vw" alt="Iglesia de Villavieja, junto al desierto de la Tatacoa" loading="lazy" /></figure>
          <figure className="c3" data-speed="-0.12"><Img src="/img/found/san-agustin-mesita-a.jpg" sizes="(max-width: 860px) 50vw, 25vw" alt="Estatuas del Parque Arqueológico de San Agustín" loading="lazy" /></figure>
          <div className="c-badge" data-speed="0.35"><b>5.364</b><span>m.s.n.m.<br />Nevado del Huila</span></div>
        </div>
      </div>
    </section>
  );
}
