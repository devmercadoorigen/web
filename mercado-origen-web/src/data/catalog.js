// Datos del catálogo. Productos, precios, municipios y embajadores vienen del sitio actual.
// Los precios de los kits son ejemplos de la propuesta y deben confirmarse.

export const FREE_SHIPPING = 150000;

export const ZONES = {
  norte: {
    name: 'Zona Norte',
    land: 'Desierto de la Tatacoa',
    fact: 'Neiva · 442 m.s.n.m. · bosque seco tropical',
    image: '/img/tatacoa.jpg',
    fill: '#F2B705',
    label: '#2F3A33',
    desc: 'Tierra caliente de cacao, achiras y cerveza artesanal. Aquí están la capital y el desierto ocre que inspira los colores de la marca.',
    munis: ['Neiva', 'Aipe', 'Algeciras', 'Baraya', 'Campoalegre', 'Colombia', 'Hobo', 'Íquira', 'Palermo', 'Rivera', 'Santa María', 'Tello', 'Teruel', 'Villavieja', 'Yaguará'],
  },
  occidente: {
    name: 'Zona Occidente',
    land: 'Nevado del Huila',
    fact: 'Nevado del Huila · 5.364 m.s.n.m.',
    image: '/img/nevado.jpg',
    fill: '#6BA539',
    label: '#0E1813',
    desc: 'Cordillera Central, páramo y tradición nasa. Cafés de altura y tejidos que todavía no tienen embajador en la tienda.',
    munis: ['La Plata', 'La Argentina', 'Nátaga', 'Paicol', 'Tesalia'],
  },
  oriente: {
    name: 'Zona Oriente',
    land: 'Paisaje Cafetero',
    fact: 'Garzón · 828 m.s.n.m. · capital diocesana',
    image: '/img/cafe.jpg',
    fill: '#0B7A3B',
    label: '#FFFFFF',
    desc: 'Laderas de café a la sombra y chocolate de mesa de receta familiar. Aquí nació el chocolate ganador de FICCA 2024.',
    munis: ['Garzón', 'Agrado', 'Altamira', 'Gigante', 'Guadalupe', 'Pital', 'Suaza', 'Tarqui', 'Acevedo'],
  },
  sur: {
    name: 'Zona Sur',
    land: 'San Agustín Ancestral',
    fact: 'San Agustín · Patrimonio de la Humanidad UNESCO',
    image: '/img/san-agustin.jpg',
    fill: '#F39200',
    label: '#2F3A33',
    desc: 'Estatuaria agustiniana, el Macizo Colombiano y la mayor producción cafetera del Huila. Miel, souvenirs y café de Pitalito.',
    munis: ['Pitalito', 'Elías', 'Isnos', 'Oporapa', 'Palestina', 'Saladoblanco', 'San Agustín', 'Timaná'],
  },
};

export const CATEGORIES = [
  { id: 'cacao', name: 'Chocolate y cacao', color: '#6B3A24' },
  { id: 'cafe', name: 'Café de especialidad', color: '#3B2A20' },
  { id: 'miel', name: 'Miel y colmena', color: '#F2B705' },
  { id: 'snacks', name: 'Achiras y snacks', color: '#F39200' },
  { id: 'bebidas', name: 'Té y bebidas', color: '#6BA539' },
  { id: 'artesanias', name: 'Artesanías', color: '#B14A3A' },
  { id: 'moda', name: 'Moda y accesorios', color: '#0B7A3B' },
  { id: 'cuidado', name: 'Cuidado personal', color: '#5E6B62' },
];

// `image` queda listo para la foto real del producto; si está vacío se usa la ilustración.
export const PRODUCTS = [
  { id: 'susana', name: 'Chocolate de mesa artesanal tradicional · 1 kg en bolitas', maker: 'Chocolate Mamá Susana', town: 'Altamira', zone: 'oriente', cat: 'cacao', price: 79000, badge: 'Ganador FICCA 2024', art: 'ball', colors: ['#F6E7C9', '#5A2E1E'], rating: 4.9, reviews: 128, image: '' },
  { id: 'bried', name: 'Chocolate de mesa 100% cacao con cardamomo y canela', maker: 'BRIED Chocolatería', town: 'Palermo', zone: 'norte', cat: 'cacao', price: 25000, badge: 'Más vendido', art: 'bar', colors: ['#FCEFC2', '#6B2F22'], rating: 4.8, reviews: 96, image: '' },
  { id: 'miel', name: 'Miel de abejas natural 450 g', maker: 'APIFIT', town: 'Pitalito', zone: 'sur', cat: 'miel', price: 29990, art: 'jar', colors: ['#FFF4CC', '#E59A00'], rating: 4.9, reviews: 74, image: '' },
  { id: 'achiras', name: 'Achiras tradicionales huilenses, 100% artesanales', maker: 'La Petit Huila', town: 'Neiva', zone: 'norte', cat: 'snacks', price: 19000, badge: 'Típico', art: 'achira', colors: ['#FDEBD0', '#D98A1F'], rating: 4.7, reviews: 152, image: '' },
  { id: 'shalena', name: 'Chocolate de consumo directo: 55%, amazónico, enchilado', maker: 'Chocolatería Shalena', town: 'Íquira', zone: 'norte', cat: 'cacao', price: 15000, art: 'bar', colors: ['#E8EFE2', '#3E2418'], rating: 4.8, reviews: 61, image: '' },
  { id: 'tachacoa', name: 'Chocolate de mesa en bola 40% con nuez moscada, canela y clavos', maker: 'TACHACOA', town: 'Colombia (Huila)', zone: 'norte', cat: 'cacao', price: 35000, art: 'ball', colors: ['#FBE3C4', '#8E3B22'], rating: 4.7, reviews: 43, image: '' },
  { id: 'acacias', name: 'Acacias Fit · té natural', maker: 'Acacias Fit', town: 'Neiva', zone: 'norte', cat: 'bebidas', price: 35000, art: 'tea', colors: ['#E8EFE2', '#0B7A3B'], rating: 4.6, reviews: 38, image: '' },
  { id: 'adames', name: 'Vestido de baño Boyacá', maker: 'ADAMES Resortwear', town: 'Neiva', zone: 'norte', cat: 'moda', price: 350000, badge: 'Diseño huilense', art: 'swim', colors: ['#DDF0F2', '#0B7A3B'], rating: 5.0, reviews: 19, image: '' },
];

export const productById = (id) => PRODUCTS.find((p) => p.id === id);

export const KITS = [
  { id: 'kit-cacao', name: 'Ruta del Cacao', note: '3 embajadores · 3 municipios', items: ['susana', 'bried', 'shalena'], price: 109000, bg: '#0B7A3B', fg: '#FFFFFF', art: 'ball', popular: true },
  { id: 'kit-tatacoa', name: 'Tarde en la Tatacoa', note: 'Onces huilenses para compartir', items: ['achiras', 'tachacoa', 'acacias'], price: 82000, bg: '#F2B705', fg: '#2F3A33', art: 'achira' },
  { id: 'kit-sur', name: 'Dulce del Sur', note: 'Del macizo a tu mesa', items: ['miel', 'achiras', 'shalena'], price: 58000, bg: '#F39200', fg: '#2F3A33', art: 'jar' },
].map((k) => ({ ...k, was: k.items.reduce((s, id) => s + productById(id).price, 0) }));

export const kitById = (id) => KITS.find((k) => k.id === id);

export const AMBASSADORS = [
  { name: 'Chocolate Mamá Susana', town: 'Altamira', zone: 'oriente', story: 'Receta familiar de chocolate de mesa y la “Casa del Chocolate”, abierta a quien quiera conocer el proceso.', award: 'FICCA 2024' },
  { name: 'Café Horizonte FC', town: 'Palermo', zone: 'norte', story: 'Café tostado en grano o molido de fincas huilenses, reconocido en FICCA 2022.', award: 'FICCA 2022' },
  { name: 'APIFIT', town: 'Pitalito', zone: 'sur', story: 'Productos de la colmena y servicios de polinización que cuidan los cultivos del sur del Huila.' },
  { name: 'La Petit Huila', town: 'Neiva', zone: 'norte', story: 'Achiras tradicionales y una versión con café especial, horneadas como en casa.' },
  { name: 'Chocolatería Shalena', town: 'Íquira', zone: 'norte', story: 'Chocolate de origen en barras de consumo directo, del amazónico al enchilado.' },
  { name: 'ARTBACU', town: 'Rivera', zone: 'norte', story: 'Artesanías y souvenirs que cuentan el Huila en piezas hechas a mano.' },
  { name: 'Macchi Infinite', town: 'Neiva', zone: 'norte', story: 'Abanicos artesanales transformables, diseñados y hechos en Neiva.' },
];

// Posición aproximada de municipios con embajadores en el mapa (viewBox 800x810). Tercer valor: lado de la etiqueta.
export const MAP_DOTS = {
  Neiva: [482, 326], Palermo: [440, 346, 'end'], 'Íquira': [378, 414, 'end'], Colombia: [640, 186],
  Rivera: [494, 376], Altamira: [336, 616, 'end'], Pitalito: [218, 690, 'end'],
};

export const FAQS = [
  ['¿Cuánto tarda el envío?', 'Entre 2 y 5 días hábiles a ciudades principales. Al pagar ves la fecha estimada exacta para tu dirección.'],
  ['Si compro a varios productores, ¿pago varios envíos?', 'No. Consolidamos todo en el Huila y pagas un solo envío. Desde $150.000 el envío es gratis.'],
  ['¿Qué medios de pago aceptan?', 'PSE, Nequi, Daviplata y tarjetas débito y crédito. El pago se procesa en una pasarela certificada.'],
  ['¿Qué pasa si un producto llega dañado?', 'Envíanos una foto en las 48 horas siguientes y te lo reponemos o te devolvemos el dinero.'],
  ['¿Los productos son realmente del Huila?', 'Sí. Cada embajador produce en uno de los 37 municipios del departamento y revisamos su origen antes de publicar sus productos.'],
  ['¿Hacen pedidos para empresas?', 'Sí. Armamos kits corporativos con tarjeta personalizada desde 20 unidades.'],
];
