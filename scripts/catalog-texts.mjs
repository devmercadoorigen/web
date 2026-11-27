/**
 * Textos de vitrina del catálogo (fuente: "Catalogo_Mercado_Origen.pdf", 57 referencias).
 * Clave = key del producto en GROUPS de build-product-seed.mjs.
 *  · description: reemplaza la descripción cruda de la hoja.
 *  · name / short: solo cuando cambian frente a GROUPS.
 * Los productos con presentaciones usan un texto que sirve para todas.
 */
export const TEXTS = {
  // EM0001 · La Petit Huila
  'petit-achiras': { description: 'Achiras tradicionales del Huila, elaboradas de manera artesanal con ingredientes 100 % naturales. Un bocado tradicional para compartir y disfrutar en cualquier momento.' },
  'petit-geisha': { description: 'Café exótico de origen Pitalito, Huila, cultivado a 1.850 m s. n. m. Su variedad Geisha, proceso honey y secado natural dan vida a una experiencia de café de origen cuidadosamente seleccionada.' },
  'petit-pacamara': { description: 'Café exótico de Pitalito, Huila, cultivado a 1.800 m s. n. m. en variedad Pacamara, con proceso honey y secado natural. Una presentación en grano para quienes prefieren moler el café al momento de prepararlo.' },
  'petit-bourbon': { description: 'Café especial de Pitalito, Huila, variedad Bourbon Rosado, cultivado a 1.800 m s. n. m. y elaborado mediante proceso honey y secado natural. Ideal para preparar y disfrutar una taza de café de origen.' },

  // EM0003 · BRIED Chocolatería
  'bried-100': { description: 'Chocolate de mesa artesanal elaborado con cacao de cultivo propio. No contiene endulzantes y se produce con respeto por el medio ambiente, para disfrutar el sabor auténtico del cacao.' },
  'bried-cardamomo': { description: 'Chocolate de mesa artesanal 100 % cacao, sin endulzantes, elaborado con cacao de cultivo propio. Su combinación de cardamomo y canela aporta un perfil especiado y aromático.' },
  'bried-nuez': { description: 'Chocolate de mesa artesanal 100 % cacao, sin endulzantes, elaborado con cacao de cultivo propio. La nuez moscada y los clavos aportan notas especiadas a esta preparación tradicional.' },
  'bried-nibs': { description: 'Trozos de cacao tostado 100 % natural, crujientes y llenos de sabor. Una opción versátil para disfrutar como snack o incorporar en postres y bebidas.' },
  'bried-almendra': { description: 'Granos de cacao tostados con su cascarilla natural, que conservan el aroma y la esencia propios del cacao. Una presentación para quienes disfrutan su sabor en estado natural.' },

  // EM0004 · Chocolate Mamá Susana
  'susana-tradicional': { description: 'Chocolate artesanal elaborado con cacao huilense de alta calidad, endulzado con panela y sazonado con canela y clavos. Viene en bolitas para preparar una auténtica taza de chocolate colombiano.' },
  'susana-100': { description: 'Chocolate artesanal 100 % cacao, sin azúcar añadida, con clavos y canela. Su presentación en bolitas permite preparar una bebida de sabor intenso y carácter natural.' },
  'susana-nibs': { description: 'Nibs tostados y triturados a partir de granos de cacao de alta calidad. Producto 100 % cacao, de textura crujiente y sabor y aroma intensos, característicos del cacao tostado.' },
  'susana-nibs-choco': { description: 'Nibs de cacao tostados y triturados, recubiertos con chocolate al 60 %. Un snack crujiente elaborado a partir de cacao de alta calidad, con sabor y aroma característicos.' },

  // EM0005 · ARTBACU
  'artbacu-pocillo': { name: 'Pocillo chocolatero tallado huilense', description: 'Pocillo para servir a la mesa, con diseño alusivo al Huila. Una pieza artesanal que lleva la identidad regional a los momentos de compartir una bebida caliente.' },

  // EM0006 · APIFIT
  'apifit-miel': { description: 'Miel de abejas natural, en botella de 500 g o envase de vidrio de 450 g. Un producto versátil para tener en casa y acompañar bebidas, desayunos y diferentes recetas.' },
  'apifit-jengibre': { description: 'Combinación de miel, jengibre y limón en envase de vidrio. Una mezcla de sabores para disfrutar sola o como complemento de bebidas y preparaciones.' },
  'apifit-propoleo': { description: 'Preparación que reúne propóleo, miel, eucalipto y extracto de marañón en un práctico envase de vidrio. Una combinación de ingredientes en una sola presentación.' },
  'apifit-cacao': { description: 'Una combinación de miel y cacao en envase de vidrio. Una propuesta para disfrutar nuevos matices de sabor en desayunos, bebidas y preparaciones dulces.' },

  // EM0007 · Bambuqueras
  'bambuqueras-achiras': { description: 'Achiras tradicionales en presentación de caja. Un producto de sabor regional, ideal para compartir o llevar como detalle representativo del Huila.' },

  // EM0008 · Macchi Infinite
  'macchi-ecru': { description: 'Abanico de la línea Macchi Infinite con estructura en madera de cedro achapo, en formato Compact (24 cm) o Standard (28 cm). Un accesorio funcional y de estilo que ofrece amplitud al abanicar sin perder ligereza.' },
  'macchi-noche': { description: 'La versión más imponente de la línea Macchi Infinite. Su apertura generosa y estructura en madera de cedro achapo hacen de este abanico un accesorio que combina funcionalidad y estilo.' },
  'macchi-panthere': { description: 'Un abanico de formato compacto, versátil y sofisticado. Su tamaño ofrece una buena amplitud al abanicar, manteniendo la ligereza que caracteriza a Macchi Infinite.' },

  // EM0009 · Chocolatería Shalena
  'shalena-barra': { description: 'Chocolate de mesa en barra, elaborado con 100 % cacao. Una presentación de 250 gramos para preparar bebidas y disfrutar el carácter propio del cacao.' },
  'shalena-sabores': { description: 'Chocolate amazónico y mexicano, además de variedades enchiladas y con sal y pimienta. Elaborado con 55 % de cacao, en una presentación práctica para disfrutar directamente.' },
  'shalena-chocolatinas': { description: 'Chocolatina disponible en diferentes porcentajes de cacao: 55 %, 70 % y 75 %. Una opción para elegir la intensidad de chocolate que prefieras.' },
  'shalena-intenso': { description: 'Chocolate de consumo directo en variedades de 80 % y 90 % de cacao, para quienes prefieren un perfil de sabor más intenso.' },
  'shalena-nibs': { description: 'Nibs de cacao caramelizados en una presentación práctica. Una alternativa crujiente para disfrutar como snack o acompañar otras preparaciones.' },

  // EM0010 · TACHACOA
  'tachacoa-100': { description: 'Chocolate de mesa en bola elaborado con 100 % cacao y una mezcla de nuez moscada, canela y clavos. Una preparación de sabor profundo con notas especiadas.' },
  'tachacoa-40': { description: 'Chocolate de mesa en bola con 40 % de cacao, acompañado de nuez moscada, canela y clavos. Una opción para preparar una bebida tradicional y aromática.' },

  // EM0011 · Café Horizonte FC
  'horizonte-cafe': { description: 'Café especial elaborado a partir de granos seleccionados de alta calidad. Presenta notas sensoriales cítricas, achocolatadas y apaneladas, que ofrecen una taza balanceada, aromática y de excelente sabor.' },

  // EM0012 · Cervecería Indian
  'indian-pureza': { description: 'Cerveza elaborada siguiendo prácticas tradicionales y los principios de la ley alemana de pureza Reinheitsgebot, que establece malta, lúpulo, levadura y agua como ingredientes principales permitidos.' },
  'indian-gaitana': { description: 'Una cerveza que rinde homenaje a la cacica Gaitana, figura que representa identidad, soberanía, fortaleza y liderazgo de las mujeres huilenses y colombianas.' },
  'indian-serrania': { name: 'Cerveza Serranía Rojas · caja x 24', description: 'Una cerveza inspirada en la Serranía de Chiribiquete, uno de los tesoros naturales de Colombia. Su nombre evoca la grandeza de este territorio entre Guaviare y Caquetá.' },

  // EM0014 · Maca Joyas
  'maca-cafe': { description: 'Dije elaborado en zamak con baño de oro de 24 quilates y laca cataforética. Inspirado en el grano de café y en las raíces del territorio. Se entrega en caja tipo libro con mensaje de inspiración, protegida por una bolsa.' },
  'maca-cholupa': { description: 'Pieza inspirada en la flor de la cholupa, símbolo de la tierra huilense. Elaborada en zamak con baño de oro de 24 quilates y laca cataforética; se presenta en caja tipo libro con mensaje de inspiración.' },
  'maca-chiva': { description: 'Candongas inspiradas en la chiva, ícono de la cultura y los caminos de nuestra tierra. Elaboradas en zamak con baño de oro de 24 quilates y laca cataforética, evocan la identidad huilense.' },
  'maca-sanjuanero': { description: 'Una joya inspirada en la pareja del Sanjuanero Huilense, símbolo de cultura, danza y tradición. Elaborada en zamak con baño de oro de 24 quilates y laca cataforética, se entrega en caja tipo libro.' },
  'maca-collar': { description: 'Collar que reúne símbolos emblemáticos del Huila: la chiva, la flor de cholupa, la pareja del Sanjuanero, el grano de café y el Águila de San Agustín. Elaborado en zamak con baño de oro de 24 quilates y laca cataforética.' },

  // EM0002 · Adames Resortwear
  'adames-boyaca': { description: 'Vestido de baño enterizo con escote cuadrado tejido y panty anudado. Una pieza de diseño resortwear pensada para destacar en días de sol y descanso.' },

  // EM0016 · María Rivas
  'acacias-fit': { description: 'Té natural en presentación de bolsitas. Una opción práctica para preparar en casa y disfrutar en cualquier momento del día.' },

  // EM0015 · María Victoria Alarcón
  'mva-shampoo': { short: 'Fortalece la raíz y aporta brillo. 450 ml.', description: 'Fórmula capilar que combina romero y extracto de café. La descripción del productor destaca su uso para fortalecer la raíz y aportar brillo al cabello.' },
  'mva-acondicionador': { short: 'Suavidad y desenredo fácil. 450 ml.', description: 'Acondicionador con aceite de coco, rico en ácido láurico. Su fórmula ayuda a proteger la fibra capilar durante el lavado, aportar suavidad y facilitar el desenredo.' },
  'mva-coctel': { short: 'Nutrición para el cabello. 300 ml.', description: 'Mezcla capilar de frutas y aceites vegetales que reúne vitaminas, antioxidantes y ácidos grasos esenciales. Diseñada como tratamiento cosmético para nutrir y cuidar el cabello.' },
};
