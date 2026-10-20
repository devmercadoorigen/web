import { Icon, Tricolor } from './ui.jsx';

export function Footer() {
  return (
    <footer className="foot">
      <Tricolor />
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <img src="/img/logo.png" alt="Mercado Origen, productos de origen del Huila" width="140" height="140" loading="lazy" />
            <p>Plataforma para la promoción de la cultura, el agro y el emprendimiento del Huila. <b>Auténtico, cercano, orgulloso y de origen.</b></p>
            <div className="social">
              <a href="https://www.instagram.com/mercadoorigen.57/" target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="instagram" size={20} /></a>
              <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook"><Icon name="facebook" size={20} /></a>
              <a href="https://www.tiktok.com/@mercadoorigen" target="_blank" rel="noreferrer" aria-label="TikTok"><Icon name="tiktok" size={20} /></a>
            </div>
          </div>
          <div>
            <h4>Tienda</h4>
            <ul><li><a href="#tienda">Catálogo</a></li><li><a href="#kits">Kits y regalos</a></li><li><a href="#territorio">Comprar por zona</a></li><li><a href="#embajadores">Embajadores</a></li></ul>
          </div>
          <div>
            <h4>Ayuda</h4>
            <ul><li><a href="#">Envíos y tiempos</a></li><li><a href="#">Cambios y garantía</a></li><li><a href="#unete">Soy embajador</a></li><li><a href="#">Contáctenos</a></li></ul>
          </div>
          <div>
            <h4>Contacto</h4>
            <ul className="contact">
              <li><Icon name="whatsapp" size={16} />+57 314 239 8821</li>
              <li><Icon name="pin" size={16} />Huila, Colombia</li>
              <li className="mail">mercadoorigen.57@gmail.com</li>
            </ul>
            <div className="foot-gov"><span>Con el apoyo de</span><img src="/img/gobernacion.webp" alt="Gobernación del Huila" width="150" height="54" loading="lazy" /></div>
          </div>
        </div>
        <div className="foot-pay">
          {['PSE', 'Nequi', 'Daviplata', 'Visa', 'Mastercard'].map((m) => <span key={m}>{m}</span>)}
        </div>
        <div className="foot-bottom">
          <span>© 2026 Mercado Origen · Huila, Colombia</span>
          <span><a href="#">Tratamiento de datos</a> · <a href="#">Términos</a> · <a href="#">Privacidad</a> · SIC</span>
        </div>
        <p className="credits">
          Fotos de colecciones abiertas vía Wikimedia Commons:{' '}
          <a href="https://commons.wikimedia.org/w/index.php?curid=56936008">Surabastos Neiva</a> (Javier Lopez, CC BY 3.0),{' '}
          <a href="https://commons.wikimedia.org/w/index.php?curid=182446190">Finca cafetera en Pitalito</a> (Jhysus, CC BY-SA 4.0),{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Parque_Arqueol%C3%B3gico_de_San_Agust%C3%ADn-Mesita_A_12.jpg">San Agustín, Mesita A</a> (Bernard Gagnon, CC BY-SA 4.0),{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Mazorca_de_cacao.jpg">Mazorca de cacao</a> (Chocolate Baure, CC BY-SA 4.0),{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Iglesia_de_Villavieja,_Huila_-_panoramio.jpg">Iglesia de Villavieja</a> (CarlosE Duarte, CC BY 3.0).
        </p>
      </div>
    </footer>
  );
}
