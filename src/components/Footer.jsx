import { Link } from 'react-router';
import { useSite } from '../features/site/SiteProvider.jsx';
import { whatsappLink } from '../lib/format.js';
import { HashLink } from './HashLink.jsx';
import { LogoHat, XMAS } from '../features/xmas/Christmas.jsx';
import { Icon, Tricolor } from './ui.jsx';

export function Footer() {
  const { contact } = useSite();
  const wa = contact.whatsapp || '+57 314 239 8821';
  const mail = contact.email || 'mercadoorigen.57@gmail.com';
  return (
    <footer className="foot">
      <Tricolor />
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <span className="foot-logo">
              <img src="/brand/logo-vertical.svg" width="120" height="137" alt="Mercado Origen, productos de origen del Huila" loading="lazy" />
              <LogoHat />
            </span>
            <p>Plataforma para la promoción de la cultura, el agro y el emprendimiento del Huila. <b>Auténtico, cercano, orgulloso y de origen.</b></p>
            <div className="social">
              <a href={contact.instagram || 'https://www.instagram.com/mercadoorigen.57/'} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="instagram" size={20} /></a>
              <a href={contact.facebook || 'https://www.facebook.com/'} target="_blank" rel="noreferrer" aria-label="Facebook"><Icon name="facebook" size={20} /></a>
              <a href={contact.tiktok || 'https://www.tiktok.com/@mercadoorigen'} target="_blank" rel="noreferrer" aria-label="TikTok"><Icon name="tiktok" size={20} /></a>
            </div>
          </div>
          <div>
            <h2 className="foot-h">Tienda</h2>
            <ul><li><Link to="/tienda">Catálogo</Link></li><li><Link to="/kits">Kits y regalos</Link></li><li><HashLink to="#territorio">Comprar por zona</HashLink></li><li><Link to="/embajadores">Embajadores</Link></li></ul>
          </div>
          <div>
            <h2 className="foot-h">Ayuda</h2>
            <ul>
              <li><HashLink to="#faq">Envíos y tiempos</HashLink></li>
              <li><HashLink to="#faq">Cambios y garantía</HashLink></li>
              <li><Link to="/quiero-ser-embajador">Quiero ser embajador</Link></li>
              <li><a href={whatsappLink('Hola, tengo una pregunta sobre Mercado Origen')} target="_blank" rel="noreferrer">Contáctenos</a></li>
            </ul>
          </div>
          <div>
            <h2 className="foot-h">Contacto</h2>
            <ul className="contact">
              <li><Icon name="whatsapp" size={16} />{wa}</li>
              <li><Icon name="pin" size={16} />Huila, Colombia</li>
              <li className="mail"><a href={`mailto:${mail}`}>{mail}</a></li>
            </ul>
            <div className="foot-gov"><span>Con el apoyo de</span><img src="/img/gobernacion-320.webp" alt="Gobernación del Huila" width="320" height="116" loading="lazy" /></div>
          </div>
        </div>
        <div className="foot-pay">
          {['PSE', 'Nequi', 'Daviplata', 'Visa', 'Mastercard'].map((m) => <span key={m}>{m}</span>)}
        </div>
        <div className="foot-bottom">
          <span>© 2026 Mercado Origen · Huila, Colombia{XMAS && <> · <span className="xm-greet">¡Feliz Navidad y próspero 2027!</span></>}</span>
          <span><Link to="/tratamiento-de-datos">Tratamiento de datos</Link> · <Link to="/tratamiento-de-datos">Privacidad</Link> · <a href="https://www.sic.gov.co" target="_blank" rel="noreferrer">SIC</a></span>
        </div>
      </div>
    </footer>
  );
}
