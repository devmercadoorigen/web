import { useTitle } from '../lib/useTitle.js';

// BORRADOR: el texto debe revisarlo un abogado antes de producción (Ley 1581 de 2012 y Decreto 1377 de 2013).
export default function DataPolicyPage() {
  useTitle('Tratamiento de datos personales');
  return (
    <section className="legal">
      <div className="wrap legal-wrap">
        <span className="kicker">Habeas data</span>
        <h1>Política de tratamiento de datos personales</h1>
        <p className="muted">Ley 1581 de 2012 · Decreto 1377 de 2013</p>

        <h2>Responsable</h2>
        <p>Mercado Origen, con domicilio en el departamento del Huila, Colombia. Contacto: mercadoorigen.57@gmail.com · WhatsApp +57 314 239 8821.</p>

        <h2>Qué datos recogemos</h2>
        <p>Nombre, correo, celular, direcciones de entrega, historial de pedidos y, si lo autorizas, tus preferencias para recibir comunicaciones. Los pagos los procesa una pasarela certificada: Mercado Origen no guarda datos de tarjetas.</p>

        <h2>Para qué los usamos</h2>
        <ul>
          <li>Gestionar tu cuenta, tus pedidos, el envío consolidado y la atención posventa.</li>
          <li>Compartir con cada embajador solo lo necesario para preparar tus productos (nunca tus datos de contacto ni de pago).</li>
          <li>Enviarte novedades y cosechas de temporada, solo si lo autorizaste. Puedes retirarlo cuando quieras desde tu cuenta.</li>
          <li>Recomendarte productos: registramos qué productos ves, guardas o agregas al carrito, ligado a tu cuenta o a un identificador aleatorio de tu navegador (sin nombre ni contacto). Estos registros se borran a los 12 meses. Si tu navegador tiene activada la opción "No rastrear" o Global Privacy Control, no registramos nada.</li>
          <li>Cumplir obligaciones legales, contables y tributarias.</li>
        </ul>

        <h2>Tus derechos</h2>
        <p>Puedes conocer, actualizar, rectificar y pedir la supresión de tus datos, revocar la autorización, pedir prueba de ella y presentar quejas ante la Superintendencia de Industria y Comercio (SIC). Escríbenos al correo de contacto: respondemos consultas en máximo 10 días hábiles y reclamos en máximo 15.</p>

        <h2>Seguridad</h2>
        <p>Tus datos se guardan con controles de acceso por rol y conexiones cifradas. Solo el equipo de Mercado Origen accede a la información necesaria para cada tarea.</p>
      </div>
    </section>
  );
}
