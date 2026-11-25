import { Link } from 'react-router';
import { Icon } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <section className="page-state">
      <div className="wrap">
        <div className="empty">
          <Icon name="leaf" size={40} stroke={1.6} />
          <b>Esta página se perdió entre los cafetales</b>
          <p>Puede que el enlace haya cambiado. Vuelve al inicio y sigue recorriendo el Huila.</p>
          <Link className="btn btn-green" to="/">Volver al inicio</Link>
        </div>
      </div>
    </section>
  );
}
