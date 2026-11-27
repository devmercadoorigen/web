-- =====================================================================
-- Semilla 01 · Territorio, categorías, contenido y cliente de prueba.
-- Todo sale del sitio actual (src/data/catalog.js y componentes).
-- Los datos marcados "REVISAR" no estaban en el sitio y conviene confirmarlos.
-- =====================================================================

insert into public.subregions (name, slug, landmark, capital, altitude, ecosystem, facts, description, image_url, fill_color, label_color, sort_order) values
  ('Norte', 'norte', 'Desierto de la Tatacoa', 'Neiva', 442, 'Bosque seco tropical',
   array['Neiva', '442 m.s.n.m.', 'bosque seco tropical'],
   'Tierra caliente de cacao, achiras y cerveza artesanal. Aquí están la capital y el desierto ocre que inspira los colores de la marca.',
   '/img/tatacoa.jpg', '#F2B705', '#2F3A33', 1),
  ('Oriente', 'oriente', 'Paisaje Cafetero', 'Garzón', 828, 'Bosque húmedo premontano',            -- ecosistema: REVISAR
   array['Garzón', '828 m.s.n.m.', 'capital diocesana'],
   'Laderas de café a la sombra y chocolate de mesa de receta familiar. Aquí nació el chocolate ganador de FICCA 2024.',
   '/img/cafe.jpg', '#0B7A3B', '#FFFFFF', 2),
  ('Sur', 'sur', 'San Agustín Ancestral', 'Pitalito', 1318, 'Macizo Colombiano y bosque andino',     -- altitud y ecosistema: REVISAR
   array['San Agustín', 'Patrimonio de la Humanidad UNESCO'],
   'Estatuaria agustiniana, el Macizo Colombiano y la mayor producción cafetera del Huila. Miel, souvenirs y café de Pitalito.',
   '/img/san-agustin.jpg', '#F39200', '#2F3A33', 3),
  ('Occidente', 'occidente', 'Nevado del Huila', 'La Plata', 1050, 'Páramo y bosque andino',          -- altitud y ecosistema: REVISAR
   array['Nevado del Huila', '5.364 m.s.n.m.'],
   'Cordillera Central, páramo y tradición nasa. Cafés de altura y tejidos que todavía no tienen embajador en la tienda.',
   '/img/nevado.jpg', '#6BA539', '#0E1813', 4);

-- 37 municipios, en el mismo orden y agrupación del sitio. Coordenadas del
-- mapa solo para los que hoy tienen embajador (el resto se ubica desde /admin).
insert into public.municipalities (subregion_id, name, slug, sort_order, map_x, map_y, label_anchor)
select s.id, m.name, public.slugify(m.name), m.ord, m.x, m.y, coalesce(m.anchor, 'start')
from (values
  ('norte', 'Neiva', 1, 482, 326, null), ('norte', 'Aipe', 2, null, null, null), ('norte', 'Algeciras', 3, null, null, null),
  ('norte', 'Baraya', 4, null, null, null), ('norte', 'Campoalegre', 5, null, null, null), ('norte', 'Colombia', 6, 640, 186, null),
  ('norte', 'Hobo', 7, null, null, null), ('norte', 'Íquira', 8, 378, 414, 'end'), ('norte', 'Palermo', 9, 440, 346, 'end'),
  ('norte', 'Rivera', 10, 494, 376, null), ('norte', 'Santa María', 11, null, null, null), ('norte', 'Tello', 12, null, null, null),
  ('norte', 'Teruel', 13, null, null, null), ('norte', 'Villavieja', 14, null, null, null), ('norte', 'Yaguará', 15, null, null, null),
  ('occidente', 'La Plata', 1, null, null, null), ('occidente', 'La Argentina', 2, null, null, null), ('occidente', 'Nátaga', 3, null, null, null),
  ('occidente', 'Paicol', 4, null, null, null), ('occidente', 'Tesalia', 5, null, null, null),
  ('oriente', 'Garzón', 1, null, null, null), ('oriente', 'Agrado', 2, null, null, null), ('oriente', 'Altamira', 3, 336, 616, 'end'),
  ('oriente', 'Gigante', 4, null, null, null), ('oriente', 'Guadalupe', 5, null, null, null), ('oriente', 'Pital', 6, null, null, null),
  ('oriente', 'Suaza', 7, null, null, null), ('oriente', 'Tarqui', 8, null, null, null), ('oriente', 'Acevedo', 9, null, null, null),
  ('sur', 'Pitalito', 1, 218, 690, 'end'), ('sur', 'Elías', 2, null, null, null), ('sur', 'Isnos', 3, null, null, null),
  ('sur', 'Oporapa', 4, null, null, null), ('sur', 'Palestina', 5, null, null, null), ('sur', 'Saladoblanco', 6, null, null, null),
  ('sur', 'San Agustín', 7, null, null, null), ('sur', 'Timaná', 8, null, null, null)
) as m(zone, name, ord, x, y, anchor)
join public.subregions s on s.slug = m.zone;

-- Categorías: nombres y código SKU acordados; foto, nota y forma del mosaico como en el home.
insert into public.categories (name, slug, code, tagline, image_url, color, tile, tint, is_consumable, sort_order) values
  ('Chocolate y cacao',       'chocolate-y-cacao',       'CHO', 'De mesa, en barra y en bolitas',             '/img/found/mazorca-cacao.jpg',           '#6B3A24', 'big',  null,                 true,  1),
  ('Café de especialidad',    'cafe-de-especialidad',    'CAF', 'Fincas de altura',                           '/img/found/finca-cafetera-pitalito.jpg', '#3B2A20', 'sq',   null,                 true,  2),
  ('Sabores típicos',         'sabores-tipicos',         'TIP', 'Achiras y antojos',                          '/img/found/surabastos-neiva.jpg',        '#F39200', 'sq',   null,                 true,  3),
  ('Artesanías y souvenirs',  'artesanias-y-souvenirs',  'ART', 'Piezas hechas a mano que cuentan el Huila',  '/img/san-agustin.jpg',                   '#B14A3A', 'wide', null,                 false, 4),
  ('Miel y colmena',          'miel-y-colmena',          'MIE', 'Miel natural de Pitalito',                   null,                                     '#F2B705', 'mini', 'var(--ocre-50)',     true,  5),
  ('Té y bebidas',            'te-y-bebidas',            'TEB', 'Infusiones y cerveza artesanal',             null,                                     '#6BA539', 'mini', 'var(--verde-50)',    true,  6),
  ('Moda y accesorios',       'moda-y-accesorios',       'MOD', 'Resortwear y joyas',                         null,                                     '#0B7A3B', 'mini', '#E9F3F6',            false, 7),
  ('Cuidado personal',        'cuidado-personal',        'CUI', 'Botánicos del Huila',                        null,                                     '#5E6B62', 'mini', 'var(--naranja-50)',  false, 8),
  ('Hogar',                   'hogar',                   'HOG', 'Limpieza y cuidado para la casa',            null,                                     '#3E7C8C', 'mini', '#EAF2F3',            true,  9);

insert into public.faqs (question, answer, sort_order) values
  ('¿Cuánto tarda el envío?', 'Entre 2 y 5 días hábiles a ciudades principales. Al pagar ves la fecha estimada exacta para tu dirección.', 1),
  ('Si compro a varios productores, ¿pago varios envíos?', 'No. Consolidamos todo en el Huila y pagas un solo envío. Desde $150.000 el envío es gratis.', 2),
  ('¿Qué medios de pago aceptan?', 'PSE, Nequi, Daviplata y tarjetas débito y crédito. El pago se procesa en una pasarela certificada.', 3),
  ('¿Qué pasa si un producto llega dañado?', 'Envíanos una foto en las 48 horas siguientes y te lo reponemos o te devolvemos el dinero.', 4),
  ('¿Los productos son realmente del Huila?', 'Sí. Cada embajador produce en uno de los 37 municipios del departamento y revisamos su origen antes de publicar sus productos.', 5),
  ('¿Hacen pedidos para empresas?', 'Sí. Armamos kits corporativos con tarjeta personalizada desde 20 unidades.', 6);

insert into public.shipping_settings (id, free_shipping_threshold, flat_rate, base_rates)
values (true, 150000, 12000, '{}'::jsonb);   -- PROVISIONAL: tarifa general de $12.000 hasta configurar la transportadora

-- Textos del sitio editables desde /admin. **texto** = negrita.
insert into public.site_settings (key, value) values
  ('contact', jsonb_build_object(
     'whatsapp', '+57 314 239 8821',
     'email', 'mercadoorigen.57@gmail.com',
     'instagram', 'https://www.instagram.com/mercadoorigen.col/',
     'facebook', 'https://www.facebook.com/profile.php?id=61594564100205',
     'tiktok', 'https://www.tiktok.com/@mercadoorigen')),
  ('announcements', jsonb_build_array(
     jsonb_build_object('icon', 'truck', 'text', 'Envío **gratis** desde $150.000'),
     jsonb_build_object('icon', 'box',   'text', 'Varios productores, **una sola caja**'),
     jsonb_build_object('icon', 'gift',  'text', '10% en tu primera compra: **{welcome_coupon}**', 'requires', 'welcome_coupon'),
     jsonb_build_object('icon', 'pin',   'text', 'Despachamos desde el Huila a **toda Colombia**'))),
  -- Sin cupón de bienvenida por ahora: el anuncio y el mensaje del boletín que lo usan quedan ocultos.
  ('welcome_coupon', jsonb_build_object('code', null)),
  ('hero', jsonb_build_object(
     'pill', 'Vitrina digital del Huila · 37 municipios',
     'title', 'Del Nevado a la Tatacoa,',
     'accent', 'un solo origen.',
     'lead', 'Café, cacao, miel y artesanías de los productores del Huila. Juntas varios municipios en un solo carrito, pagas una vez y lo recibes todo en un mismo envío.',
     'image', '/img/tatacoa.jpg')),
  ('marquee', jsonb_build_object(
     'words', jsonb_build_array('Café de especialidad', 'Cacao de origen', 'Miel de abejas', 'Achiras', 'Artesanías', 'Chocolate de mesa', 'Cerveza artesanal', 'Té natural'),
     'towns', jsonb_build_array('Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Palermo', 'Altamira', 'San Agustín', 'Íquira', 'Rivera', 'Villavieja', 'Gigante', 'Timaná')));

-- ---------------------------------------------------------------------
-- Cliente de prueba (solo local): cliente@mercadoorigen.test / Cliente123*
-- ---------------------------------------------------------------------
do $$
declare uid uuid := '00000000-0000-4000-8000-00000000c11e';
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'cliente@mercadoorigen.test',
    extensions.crypt('Cliente123*', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Cliente de Prueba","phone":"3001234567","data_policy_accepted":true}',
    now(), now(), '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', 'cliente@mercadoorigen.test', 'email_verified', true),
    'email', now(), now(), now());
end $$;
