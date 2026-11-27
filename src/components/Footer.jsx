import { Link } from 'react-router';
import { useSite } from '../features/site/SiteProvider.jsx';
import { whatsappLink } from '../lib/format.js';
import { HashLink } from './HashLink.jsx';
import { XMAS } from '../features/xmas/Christmas.jsx';
import { Icon, Tricolor } from './ui.jsx';

// Métodos de pago (logos simplificados, 52×34). El nombre aparece al pasar el cursor.
const T = { fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 900, textAnchor: 'middle' };
const PAYMENTS = [
  { name: 'PSE', art: <><rect width="52" height="34" rx="7" fill="#fff" /><circle cx="26" cy="17" r="12.5" fill="#0F4C9A" /><text x="26" y="20.6" fontSize="10" fill="#fff" {...T}>pse</text></> },
  { name: 'Nequi', art: <><rect width="52" height="34" rx="7" fill="#200020" /><text x="24" y="21" fontSize="12" fill="#fff" {...T}>nequi</text><rect x="38.5" y="9" width="4" height="4" rx="1" fill="#DA0081" /></> },
  { name: 'Daviplata', art: <><rect width="52" height="34" rx="7" fill="#E30613" /><text x="26" y="15.5" fontSize="8" fill="#fff" {...T}>Davi</text><text x="26" y="25" fontSize="8" fill="#fff" {...T}>Plata</text></> },
  { name: 'Visa', art: <><rect width="52" height="34" rx="7" fill="#fff" /><text x="26" y="21.5" fontSize="14" fill="#1A1F71" fontStyle="italic" {...T}>VISA</text></> },
  { name: 'Mastercard', art: <><rect width="52" height="34" rx="7" fill="#fff" /><circle cx="21" cy="17" r="9" fill="#EB001B" /><circle cx="31" cy="17" r="9" fill="#F79E1B" /><path d="M26 9.5a9 9 0 0 1 0 15 9 9 0 0 1 0-15z" fill="#FF5F00" /></> },
];

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
              <img src="/brand/logo-vertical-navidad.webp" width="120" height="182" alt="Mercado Origen, productos de origen del Huila" loading="lazy" />
            </span>
            <p>Plataforma para la promoción de la cultura, el agro y el emprendimiento del Huila. <b>Auténtico, cercano, orgulloso y de origen.</b></p>
            <div className="social">
              <a href={contact.instagram || 'https://www.instagram.com/mercadoorigen.col/'} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="instagram" size={20} /></a>
              <a href={contact.facebook || 'https://www.facebook.com/profile.php?id=61594564100205'} target="_blank" rel="noreferrer" aria-label="Facebook"><Icon name="facebook" size={20} /></a>
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
          {PAYMENTS.map(({ name, art }) => (
            <span key={name} className="pay-ico" role="img" aria-label={name} data-label={name} tabIndex={0}>
              <svg width="52" height="34" viewBox="0 0 52 34" aria-hidden="true">{art}</svg>
            </span>
          ))}
        </div>
        <div className="foot-bottom">
          <span>© 2026 Mercado Origen · Huila, Colombia{XMAS && <> · <span className="xm-greet">¡Feliz Navidad y próspero 2027!</span></>}</span>
          <span><Link to="/tratamiento-de-datos">Tratamiento de datos</Link> · <Link to="/tratamiento-de-datos">Privacidad</Link> · <a href="https://www.sic.gov.co" target="_blank" rel="noreferrer">SIC</a></span>
        </div>
      </div>
    </footer>
  );
}
