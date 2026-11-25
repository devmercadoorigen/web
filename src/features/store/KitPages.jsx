import { Link, useParams } from 'react-router';
import { money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon, ProductArt } from '../../components/ui.jsx';
import { AddButton } from '../catalog/Catalog.jsx';
import { KitCard } from '../../components/Kits.jsx';
import { useCatalog } from '../catalog/CatalogProvider.jsx';

export function KitsPage() {
  useTitle('Kits y regalos del Huila');
  const { kits, ready } = useCatalog();
  const active = kits.filter((k) => k.items.length);
  return (
    <section className="store kits-page">
      <div className="wrap">
        <nav className="crumbs" aria-label="Ruta"><Link to="/">Inicio</Link><span>/</span><span aria-current="page">Kits y regalos</span></nav>
        <header className="store-head">
          <div>
            <span className="kicker">Kits y regalos</span>
            <h1>El Huila en una caja</h1>
            <p className="muted">Combinaciones de varios embajadores con empaque de regalo. Cuestan menos que por separado. ¿Pedido para tu empresa? Armamos kits con tarjeta personalizada desde 20 unidades.</p>
          </div>
        </header>
        {!ready ? <div className="skeleton" style={{ height: 400 }} /> : active.length ? (
          <div className="kit-grid">{active.map((k) => <KitCard key={k.id} k={k} />)}</div>
        ) : (
          <div className="empty"><Icon name="gift" size={40} stroke={1.6} /><b>Muy pronto, nuevos kits</b><p>Estamos armando combinaciones de varios embajadores para regalar.</p></div>
        )}
      </div>
    </section>
  );
}

export function KitPage() {
  const { slug } = useParams();
  const { kitBySlug, productById, ready } = useCatalog();
  const k = kitBySlug(slug);
  useTitle(k ? `Kit ${k.name}` : 'Kit', k && { description: `${k.note || ''}. Productos de varios embajadores del Huila en un solo envío.` });
  if (!ready) return <section className="store"><div className="wrap"><div className="skeleton" style={{ height: 420 }} /></div></section>;
  if (!k) {
    return (
      <section className="page-state"><div className="wrap"><div className="empty">
        <Icon name="gift" size={40} stroke={1.6} /><b>Este kit ya no está disponible</b>
        <Link to="/kits" className="btn btn-green">Ver todos los kits</Link>
      </div></div></section>
    );
  }
  const items = k.items.map(productById).filter(Boolean);
  const makers = new Set(items.map((p) => p.maker));
  const towns = new Set(items.map((p) => p.town));
  return (
    <section className="store">
      <div className="wrap">
        <nav className="crumbs" aria-label="Ruta"><Link to="/">Inicio</Link><span>/</span><Link to="/kits">Kits y regalos</Link><span>/</span><span aria-current="page">{k.name}</span></nav>
        <div className="pdp kit-pdp">
          <div className="kit kit-solo">
            {k.popular && <span className="kit-ribbon">{k.badge}</span>}
            <div className="kit-stage" style={{ background: k.bg }}>
              <span className="kit-name" style={{ color: k.fg }}>{k.name}</span>
              <div className="fan open">{items.map((p, j) => <div key={p.id} className={`fan-item f${j}`}><ProductArt {...p} alt={p.name} /></div>)}</div>
            </div>
          </div>
          <div className="pdp-info">
            <span className="kicker">Kit de regalo · <span className="sku">{k.sku}</span></span>
            <h1>{k.name}</h1>
            <p className="pdp-lead">{k.note || `${makers.size} embajadores · ${towns.size} municipios`}</p>
            <div className="pdp-price"><s>{money(k.was)}</s><b>{money(k.price)}</b><span className="save">Ahorras {money(k.was - k.price)}</span></div>
            <ul className="kit-contents">
              {items.map((p) => (
                <li key={p.id}>
                  <Link to={`/producto/${p.slug}`} className="kit-thumb"><ProductArt {...p} alt="" /></Link>
                  <div><Link to={`/producto/${p.slug}`} className="link-plain"><b>{p.name}</b></Link><span className="muted small">{p.maker} · {p.town}</span></div>
                  <span className="muted">{money(p.price)}</span>
                </li>
              ))}
            </ul>
            {k.available ? <AddButton id={k.cartKey} label="Añadir kit al carrito" className="btn btn-green btn-lg btn-block" /> : <p className="pdp-stock out">Este kit se agotó por ahora.</p>}
            <ul className="pdp-promise">
              <li><Icon name="gift" size={18} />Empaque de regalo y tarjeta con la historia de cada embajador</li>
              <li><Icon name="truck" size={18} />Todo llega en una sola caja desde el Huila</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
