import { AMBASSADORS, ZONES } from '../data/catalog.js';
import { scrollToTarget } from '../lib/motion.js';
import { Icon } from './ui.jsx';

const initials = (name) => name.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('');

function AmbCard({ a, onShop }) {
  const z = ZONES[a.zone];
  return (
    <article className="amb">
      <div className="amb-top">
        <span className="amb-ava" style={{ background: z.fill, color: z.label }}>{initials(a.name)}</span>
        <div>
          <b>{a.name}</b>
          <span><Icon name="pin" size={13} stroke={2.4} />{a.town} · {z.name.replace('Zona ', '')}</span>
        </div>
      </div>
      <p>{a.story}</p>
      <div className="amb-foot">
        {a.award ? <span className="amb-award"><Icon name="award" size={14} stroke={2.2} />{a.award}</span> : <span />}
        <button type="button" onClick={() => { onShop(a.zone); scrollToTarget('#tienda'); }}>Ver productos <Icon name="arrow" size={15} stroke={2.4} /></button>
      </div>
    </article>
  );
}

// Dos cintas de embajadores que avanzan en sentidos opuestos (se pausan al pasar el cursor).
export function Ambassadors({ onShopZone }) {
  const half = Math.ceil(AMBASSADORS.length / 2);
  const rows = [AMBASSADORS, [...AMBASSADORS.slice(half), ...AMBASSADORS.slice(0, half)]];
  return (
    <section id="embajadores" className="ambs">
      <div className="wrap sec-head split-head">
        <div>
          <span className="kicker" data-anim="up">Embajadores activos</span>
          <h2 data-anim="up">Las manos detrás de cada producto</h2>
        </div>
        <div className="ambs-cta" data-anim="up">
          <p>17 familias, fincas y talleres del Huila con historia propia.</p>
          <a className="btn btn-outline" href="#unete">Quiero ser embajador</a>
        </div>
      </div>
      <div className="amb-lanes">
        {rows.map((r, i) => (
          <div className={`amb-lane${i ? ' rev' : ''}`} key={i}>
            <div className="amb-track">
              {[...r, ...r].map((a, j) => <AmbCard key={`${a.name}${j}`} a={a} onShop={onShopZone} />)}
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
          <figure className="c1" data-speed="0.08"><img src="/img/sanjuanero.jpg" alt="Pareja bailando el Sanjuanero huilense" loading="lazy" /></figure>
          <figure className="c2" data-speed="0.22"><img src="/img/found/iglesia-villavieja.jpg" alt="Iglesia de Villavieja, junto al desierto de la Tatacoa" loading="lazy" /></figure>
          <figure className="c3" data-speed="-0.12"><img src="/img/found/san-agustin-mesita-a.jpg" alt="Estatuas del Parque Arqueológico de San Agustín" loading="lazy" /></figure>
          <div className="c-badge" data-speed="0.35"><b>5.364</b><span>m.s.n.m.<br />Nevado del Huila</span></div>
        </div>
      </div>
    </section>
  );
}
