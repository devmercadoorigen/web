-- =====================================================================
-- Textos del catálogo (Catalogo_Mercado_Origen.pdf) en una base ya poblada.
-- GENERADO por: node scripts/build-product-seed.mjs --textos
-- Actualiza nombre, descripción corta y descripción. No toca precios, stock,
-- fotos ni slugs (el slug solo se fija al crear el producto).
-- Ejecútalo en Supabase > SQL Editor. Corre en una transacción.
-- =====================================================================
begin;
set local app.trusted = 'on';

create temporary table new_texts (key text primary key, codes text[] not null, name text not null,
                                  short_description text, description text not null) on commit drop;
insert into new_texts (key, codes, name, short_description, description) values
  ('petit-achiras', array['EM0001_4', 'EM0001_1'], 'Achiras tradicionales huilenses', '100% naturales y artesanales, en bolsa kraft con cierre hermético.', 'Achiras tradicionales del Huila, elaboradas de manera artesanal con ingredientes 100 % naturales. Un bocado tradicional para compartir y disfrutar en cualquier momento.'),
  ('petit-geisha', array['EM0001_11', 'EM0001_2', 'EM0001_10', 'EM0001_12'], 'Café exótico Geisha · tueste medio', 'Pitalito, 1.850 msnm. Proceso honey y secado natural.', 'Café exótico de origen Pitalito, Huila, cultivado a 1.850 m s. n. m. Su variedad Geisha, proceso honey y secado natural dan vida a una experiencia de café de origen cuidadosamente seleccionada.'),
  ('petit-pacamara', array['EM0001_3', 'EM0001_6'], 'Café exótico Pacamara en grano · 500 g', 'Pitalito, 1.800 msnm. Proceso honey y secado natural.', 'Café exótico de Pitalito, Huila, cultivado a 1.800 m s. n. m. en variedad Pacamara, con proceso honey y secado natural. Una presentación en grano para quienes prefieren moler el café al momento de prepararlo.'),
  ('petit-bourbon', array['EM0001_7', 'EM0001_9', 'EM0001_5', 'EM0001_8'], 'Café especial Bourbon Rosado · tueste medio', 'Pitalito, 1.800 msnm. Proceso honey y secado natural.', 'Café especial de Pitalito, Huila, variedad Bourbon Rosado, cultivado a 1.800 m s. n. m. y elaborado mediante proceso honey y secado natural. Ideal para preparar y disfrutar una taza de café de origen.'),
  ('bried-100', array['EM0003_1'], 'Chocolate de mesa 100% cacao', 'Sin endulzantes, desde nuestro cultivo. Caja de 250 g.', 'Chocolate de mesa artesanal elaborado con cacao de cultivo propio. No contiene endulzantes y se produce con respeto por el medio ambiente, para disfrutar el sabor auténtico del cacao.'),
  ('bried-cardamomo', array['EM0003_2'], 'Chocolate de mesa 100% cacao con cardamomo y canela', 'Sin endulzantes, con cardamomo y canela. Caja de 250 g.', 'Chocolate de mesa artesanal 100 % cacao, sin endulzantes, elaborado con cacao de cultivo propio. Su combinación de cardamomo y canela aporta un perfil especiado y aromático.'),
  ('bried-nuez', array['EM0003_3'], 'Chocolate de mesa 100% cacao con nuez moscada y clavos', 'Sin endulzantes, con nuez moscada y clavos. Bolsa de 250 g.', 'Chocolate de mesa artesanal 100 % cacao, sin endulzantes, elaborado con cacao de cultivo propio. La nuez moscada y los clavos aportan notas especiadas a esta preparación tradicional.'),
  ('bried-nibs', array['EM0003_4'], 'Nibs de cacao', 'Cacao tostado 100% natural y crujiente. 150 g.', 'Trozos de cacao tostado 100 % natural, crujientes y llenos de sabor. Una opción versátil para disfrutar como snack o incorporar en postres y bebidas.'),
  ('bried-almendra', array['EM0003_5'], 'Almendra de cacao tostada', 'Grano tostado con su cascarilla natural. 300 g.', 'Granos de cacao tostados con su cascarilla natural, que conservan el aroma y la esencia propios del cacao. Una presentación para quienes disfrutan su sabor en estado natural.'),
  ('susana-tradicional', array['EM0004_1', 'EM0004_2'], 'Chocolate de mesa artesanal tradicional en bolitas', 'Cacao huilense con panela, canela y clavos.', 'Chocolate artesanal elaborado con cacao huilense de alta calidad, endulzado con panela y sazonado con canela y clavos. Viene en bolitas para preparar una auténtica taza de chocolate colombiano.'),
  ('susana-100', array['EM0004_3'], 'Chocolate de mesa artesanal 100% cacao en bolitas', 'Sin azúcar añadida, con clavos y canela. 125 g.', 'Chocolate artesanal 100 % cacao, sin azúcar añadida, con clavos y canela. Su presentación en bolitas permite preparar una bebida de sabor intenso y carácter natural.'),
  ('susana-nibs', array['EM0004_4'], 'Nibs de cacao tostados', '100% cacao, textura crujiente. 125 g.', 'Nibs tostados y triturados a partir de granos de cacao de alta calidad. Producto 100 % cacao, de textura crujiente y sabor y aroma intensos, característicos del cacao tostado.'),
  ('susana-nibs-choco', array['EM0004_5'], 'Nibs de cacao cubiertos con chocolate al 60%', 'Un snack crujiente y lleno de energía. 125 g.', 'Nibs de cacao tostados y triturados, recubiertos con chocolate al 60 %. Un snack crujiente elaborado a partir de cacao de alta calidad, con sabor y aroma característicos.'),
  ('artbacu-pocillo', array['EM0005_1'], 'Pocillo chocolatero tallado huilense', 'Pocillo para servir a la mesa, alusivo al Huila.', 'Pocillo para servir a la mesa, con diseño alusivo al Huila. Una pieza artesanal que lleva la identidad regional a los momentos de compartir una bebida caliente.'),
  ('apifit-miel', array['EM0006_4', 'EM0006_1'], 'Miel de abejas natural', 'Miel pura de abejas del Huila.', 'Miel de abejas natural, en botella de 500 g o envase de vidrio de 450 g. Un producto versátil para tener en casa y acompañar bebidas, desayunos y diferentes recetas.'),
  ('apifit-jengibre', array['EM0006_2'], 'Miel con jengibre y limón', 'Frasco de vidrio de 250 g.', 'Combinación de miel, jengibre y limón en envase de vidrio. Una mezcla de sabores para disfrutar sola o como complemento de bebidas y preparaciones.'),
  ('apifit-propoleo', array['EM0006_3'], 'Propóleo con miel, eucalipto y extracto de marañón', 'Frasco de vidrio de 300 g.', 'Preparación que reúne propóleo, miel, eucalipto y extracto de marañón en un práctico envase de vidrio. Una combinación de ingredientes en una sola presentación.'),
  ('apifit-cacao', array['EM0006_5'], 'Miel con cacao', 'Frasco de vidrio de 250 g.', 'Una combinación de miel y cacao en envase de vidrio. Una propuesta para disfrutar nuevos matices de sabor en desayunos, bebidas y preparaciones dulces.'),
  ('bambuqueras-achiras', array['EM0007_1'], 'Achiras Bambuqueras', 'Achiras huilenses en caja de 75 g.', 'Achiras tradicionales en presentación de caja. Un producto de sabor regional, ideal para compartir o llevar como detalle representativo del Huila.'),
  ('macchi-ecru', array['EM0008_2', 'EM0008_1'], 'Abanico Écru en madera de cedro', 'Pieza de estilo con estructura en cedro achapo.', 'Abanico de la línea Macchi Infinite con estructura en madera de cedro achapo, en formato Compact (24 cm) o Standard (28 cm). Un accesorio funcional y de estilo que ofrece amplitud al abanicar sin perder ligereza.'),
  ('macchi-noche', array['EM0008_3'], 'Abanico Noche Standard · 28 cm', 'La versión más imponente, en cedro achapo.', 'La versión más imponente de la línea Macchi Infinite. Su apertura generosa y estructura en madera de cedro achapo hacen de este abanico un accesorio que combina funcionalidad y estilo.'),
  ('macchi-panthere', array['EM0008_4'], 'Abanico Panthère Compact · 24 cm', 'Versátil, cómodo y sofisticado.', 'Un abanico de formato compacto, versátil y sofisticado. Su tamaño ofrece una buena amplitud al abanicar, manteniendo la ligereza que caracteriza a Macchi Infinite.'),
  ('shalena-barra', array['EM0009_1'], 'Chocolate de mesa en barra 100% cacao · 250 g', 'Barra de chocolate de mesa 100% cacao.', 'Chocolate de mesa en barra, elaborado con 100 % cacao. Una presentación de 250 gramos para preparar bebidas y disfrutar el carácter propio del cacao.'),
  ('shalena-sabores', array['EM0009_2'], 'Chocolate al 55%: amazónico, mexicano, enchilado, sal y pimienta', 'Chocolate de consumo directo, 45 g.', 'Chocolate amazónico y mexicano, además de variedades enchiladas y con sal y pimienta. Elaborado con 55 % de cacao, en una presentación práctica para disfrutar directamente.'),
  ('shalena-chocolatinas', array['EM0009_3'], 'Chocolatinas al 55%, 70% y 75%', 'Chocolate de consumo directo, 90 g.', 'Chocolatina disponible en diferentes porcentajes de cacao: 55 %, 70 % y 75 %. Una opción para elegir la intensidad de chocolate que prefieras.'),
  ('shalena-intenso', array['EM0009_4'], 'Chocolate intenso al 80% y 90%', 'Chocolate de consumo directo, 90 g.', 'Chocolate de consumo directo en variedades de 80 % y 90 % de cacao, para quienes prefieren un perfil de sabor más intenso.'),
  ('shalena-nibs', array['EM0009_5'], 'Nibs de cacao caramelizados', 'Bolsa de 50 g.', 'Nibs de cacao caramelizados en una presentación práctica. Una alternativa crujiente para disfrutar como snack o acompañar otras preparaciones.'),
  ('tachacoa-100', array['EM0010_1'], 'Chocolate de mesa en bola 100% cacao con nuez moscada, canela y clavos', 'Bolsa de 20 bolas.', 'Chocolate de mesa en bola elaborado con 100 % cacao y una mezcla de nuez moscada, canela y clavos. Una preparación de sabor profundo con notas especiadas.'),
  ('tachacoa-40', array['EM0010_2', 'EM0010_3'], 'Chocolate de mesa en bola 40% con nuez moscada, canela y clavos', 'Receta tradicional del desierto de la Tatacoa.', 'Chocolate de mesa en bola con 40 % de cacao, acompañado de nuez moscada, canela y clavos. Una opción para preparar una bebida tradicional y aromática.'),
  ('horizonte-cafe', array['EM0011_3', 'EM0011_2', 'EM0011_1'], 'Café especial Café Horizonte', 'Notas cítricas, achocolatadas y apaneladas. Incluye una semilla para sembrar.', 'Café especial elaborado a partir de granos seleccionados de alta calidad. Presenta notas sensoriales cítricas, achocolatadas y apaneladas, que ofrecen una taza balanceada, aromática y de excelente sabor.'),
  ('indian-pureza', array['EM0012_1'], 'Cerveza artesanal INDIAN · Pureza Alemana', 'Malta, lúpulo, levadura y agua, según la ley de pureza alemana.', 'Cerveza elaborada siguiendo prácticas tradicionales y los principios de la ley alemana de pureza Reinheitsgebot, que establece malta, lúpulo, levadura y agua como ingredientes principales permitidos.'),
  ('indian-gaitana', array['EM0012_2'], 'Cerveza Gaitana Dorada · caja x 24', 'Tributo a la cacica Gaitana. 100% malta Pilsen, 5% a 5,5% de alcohol.', 'Una cerveza que rinde homenaje a la cacica Gaitana, figura que representa identidad, soberanía, fortaleza y liderazgo de las mujeres huilenses y colombianas.'),
  ('indian-serrania', array['EM0012_3'], 'Cerveza Serranía Rojas · caja x 24', 'Homenaje a la Serranía de Chiribiquete. 5% a 5,5% de alcohol.', 'Una cerveza inspirada en la Serranía de Chiribiquete, uno de los tesoros naturales de Colombia. Su nombre evoca la grandeza de este territorio entre Guaviare y Caquetá.'),
  ('maca-cafe', array['EM0014_1'], 'Candongas Grano de Café', 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', 'Dije elaborado en zamak con baño de oro de 24 quilates y laca cataforética. Inspirado en el grano de café y en las raíces del territorio. Se entrega en caja tipo libro con mensaje de inspiración, protegida por una bolsa.'),
  ('maca-cholupa', array['EM0014_2'], 'Candongas Flor de Cholupa', 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', 'Pieza inspirada en la flor de la cholupa, símbolo de la tierra huilense. Elaborada en zamak con baño de oro de 24 quilates y laca cataforética; se presenta en caja tipo libro con mensaje de inspiración.'),
  ('maca-chiva', array['EM0014_3'], 'Candongas Chiva', 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', 'Candongas inspiradas en la chiva, ícono de la cultura y los caminos de nuestra tierra. Elaboradas en zamak con baño de oro de 24 quilates y laca cataforética, evocan la identidad huilense.'),
  ('maca-sanjuanero', array['EM0014_4'], 'Candongas Pareja del Sanjuanero', 'Zamak con baño de oro de 24 K. Colección Raíces de mi Tierra.', 'Una joya inspirada en la pareja del Sanjuanero Huilense, símbolo de cultura, danza y tradición. Elaborada en zamak con baño de oro de 24 quilates y laca cataforética, se entrega en caja tipo libro.'),
  ('maca-collar', array['EM0014_5'], 'Collar Raíces', 'Chiva, cholupa, Sanjuanero, café y el Águila de San Agustín en una joya.', 'Collar que reúne símbolos emblemáticos del Huila: la chiva, la flor de cholupa, la pareja del Sanjuanero, el grano de café y el Águila de San Agustín. Elaborado en zamak con baño de oro de 24 quilates y laca cataforética.'),
  ('adames-boyaca', array['EM0002_1'], 'Vestido de baño Boyacá', 'Enterizo con escote cuadrado tejido y panty anudado.', 'Vestido de baño enterizo con escote cuadrado tejido y panty anudado. Una pieza de diseño resortwear pensada para destacar en días de sol y descanso.'),
  ('acacias-fit', array['EM0016_1'], 'Acacias Fit · té natural', 'Té natural en bolsitas.', 'Té natural en presentación de bolsitas. Una opción práctica para preparar en casa y disfrutar en cualquier momento del día.'),
  ('mva-shampoo', array['EM0015_1'], 'Shampoo de romero y extracto de café', 'Fortalece la raíz y aporta brillo. 450 ml.', 'Fórmula capilar que combina romero y extracto de café. La descripción del productor destaca su uso para fortalecer la raíz y aportar brillo al cabello.'),
  ('mva-acondicionador', array['EM0015_2'], 'Acondicionador de coco', 'Suavidad y desenredo fácil. 450 ml.', 'Acondicionador con aceite de coco, rico en ácido láurico. Su fórmula ayuda a proteger la fibra capilar durante el lavado, aportar suavidad y facilitar el desenredo.'),
  ('mva-coctel', array['EM0015_3'], 'Cóctel capilar de frutas y aceites vegetales', 'Nutrición para el cabello. 300 ml.', 'Mezcla capilar de frutas y aceites vegetales que reúne vitaminas, antioxidantes y ácidos grasos esenciales. Diseñada como tratamiento cosmético para nutrir y cuidar el cabello.');

-- Cada producto se ubica por su código del embajador (producto o presentación).
create temporary table targets on commit drop as
select distinct t.key, p.id as product_id
  from new_texts t
  join public.products p
    on p.supplier_code = any(t.codes)
    or p.id in (select v.product_id from public.product_variants v where v.attributes->>'supplier_code' = any(t.codes));

update public.products p
   set name = t.name, short_description = t.short_description, description = t.description
  from targets x join new_texts t on t.key = x.key
 where p.id = x.product_id
   and (p.name, p.short_description, p.description) is distinct from (t.name, t.short_description, t.description);

-- Revisión: textos que no encontraron su producto en la base
select t.key, t.codes from new_texts t where not exists (select 1 from targets x where x.key = t.key) order by 1;

commit;
