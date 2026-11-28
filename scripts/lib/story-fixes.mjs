// Correcciones de ortografía y puntuación de las historias de los embajadores.
// La hoja "EMBAJADORES ACEPTADOS" se respeta tal cual: aquí van pares [texto original, texto corregido]
// que se aplican a story_origin, story_present y story_future. Si un texto original ya no aparece
// (porque la hoja cambió), el script falla para que la corrección se revise a mano.
export const STORY_FIXES = {
  EM0001: [
    ['En la Petit Huila, decidimos', 'En La Petit Huila decidimos'],
    ['(especialmente cuando viajamos) acompañados', '(especialmente cuando viajamos), acompañados'],
    ['Actualmente y tras poner', 'Actualmente, y tras poner'],
    ['(abuelos, padres y ahora nosotros) tenemos', '(abuelos, padres y ahora nosotros), tenemos'],
    ['el casamiento mas representativo', 'el casamiento más representativo'],
    ['(familiar de nuestros abuelos, padres y tíos) procesamos', '(familiares de nuestros abuelos, padres y tíos) procesamos'],
    ['seguiran creciendo', 'seguirán creciendo'],
    ['relación reciproca', 'relación recíproca'],
  ],
  EM0002: [
    ['una evolución constante, nacimos', 'una evolución constante: nacimos'],
    ['cada una de nuestros trajes de baño está diseñada', 'cada uno de nuestros trajes de baño está diseñado'],
    ['cuerpos reales.  Hoy', 'cuerpos reales. Hoy'],
  ],
  EM0004: [
    ['y que el Altamira y el Huila sea reconocido', 'y que Altamira y el Huila sean reconocidos'],
  ],
  EM0005: [
    ['la falta de oportunidad para mi hija en condición de discapacidad auditiva nace', 'la falta de oportunidades para mi hija en condición de discapacidad auditiva, nace'],
    ['ARTE-BARR´-CULTURA, iniciamos dándonos a conocer de feria en feria', 'ARTE-BARR´-CULTURA. Iniciamos dándonos a conocer de feria en feria.'],
    ['estamos posesionados en el mercado', 'estamos posicionados en el mercado'],
    ['nos realizan nuestro clientes, en algunas ocasiones también hemos estado un los ánimos caídos debido a circunstancias del mercado , pero',
     'nos realizan nuestros clientes. En algunas ocasiones también hemos estado con los ánimos caídos debido a circunstancias del mercado, pero'],
    ['en su hogar oficina y en su corazón', 'en su hogar, en su oficina y en su corazón.'],
    ['Los sueños son asistir a ferias internacionales, la metas mas cercana es ser la empresa de artesanías mas reconocida del Huila y sus alrededores',
     'Nuestro sueño es asistir a ferias internacionales, y la meta más cercana es ser la empresa de artesanías más reconocida del Huila y sus alrededores.'],
  ],
  EM0006: [
    ['en Pitalito - Huila por Leonardo Aguilera y Diana Méndez, nació', 'en Pitalito, Huila, por Leonardo Aguilera y Diana Méndez. Nació'],
    ['para ser una empresas líder', 'para ser una empresa líder'],
  ],
  EM0007: [
    ['bajo el nombre Bizcochería la Especial', 'bajo el nombre Bizcochería La Especial'],
    ['Actualmente somos Bambuqueras, Un legado muy Especial, somos los mismo de hace 38 años, con la misma receta y misma tradición.',
     'Actualmente somos Bambuqueras, un legado muy especial: somos los mismos de hace 38 años, con la misma receta y la misma tradición.'],
  ],
  EM0008: [
    ['adaptarse, escuchar, mejora continua y ser resilientes', 'adaptarse, escuchar, mejorar continuamente y ser resilientes'],
  ],
  EM0012: [
    ['los costos y largos tiempos de producción asociados; rápidamente desbarataron', 'los costos y los largos tiempos de producción asociados rápidamente desbarataron'],
    ['la juventud a nivel global, valora', 'la juventud, a nivel global, valora'],
    ['bebida dorada; extraída de la malta de cebada', 'bebida dorada, extraída de la malta de cebada'],
    ['en la elaboración de cerveza\n', 'en la elaboración de cerveza.\n'],
    ['en numerosas catas de cerveza y sus comentarios, permitieron perfeccionar nuestras recetas, las cuales, con el transcurso de los días se volvieron populares',
     'en numerosas catas de cerveza y con sus comentarios, permitió perfeccionar nuestras recetas, las cuales, con el transcurso de los días, se volvieron populares'],
    ['dispuestos a pagar por ellas\n', 'dispuestos a pagar por ellas.\n'],
    ['Cerveceria INDIAN, nos enorgullece decir que somos las Cerveceria Artesanal mas grande del departamento del Huila y con un amplio reconocimiento. Con proyecciones de ingresar al Putumayo y Caqueta',
     'En Cervecería INDIAN nos enorgullece decir que somos la cervecería artesanal más grande del departamento del Huila, con un amplio reconocimiento y con proyecciones de ingresar al Putumayo y al Caquetá.'],
    ['Ser las empresa de cerveceria artesanal mas de Colombia en 10 años', 'Ser la empresa de cervecería artesanal más grande de Colombia en 10 años.'],
  ],
  EM0015: [
    ['y frutos autóctonos como el romero para dar respuesta', 'y frutos autóctonos— para dar respuesta'],
    ['la mujer que me dió la vida ya que sufrió una alopecia hace más de 10 años, crear', 'la mujer que me dio la vida, ya que sufrió una alopecia hace más de 10 años: crear'],
  ],
  EM0016: [
    ['nació hace 6 años  como una Necesidad propia y al ver resultados en mi se vuelve un emprendimiento',
     'nació hace 6 años como una necesidad propia y, al ver resultados en mí, se volvió un emprendimiento'],
    ['y a crecido debido al aumento de la demanda .', 'y ha crecido debido al aumento de la demanda.'],
  ],
  EM0017: [
    ['Como una forma de ofrecer a turistas que visitaban San Agustín, souvenirs, livianos, resistentes, coloridos, y útiles que pudieran llevar como recuerdo de su viaje, luego se convirtió en la marca de los Huilenses',
     'Nació como una forma de ofrecer a los turistas que visitaban San Agustín souvenirs livianos, resistentes, coloridos y útiles que pudieran llevar como recuerdo de su viaje. Luego se convirtió en la marca de los huilenses'],
    ['la empresa esta un poco quieta, debido a mis ocupaciones laborales, pero mi deseo de continuar con el trabajo que traía, lo anterior ya que somos una marca reconocida en el departamento, con una comunidad fuerte, hacemos presencia con puntos aliados en Tiendas de promisión, aeropuerto de Neiva, aeropuerto de Pitalito y en el café la Meca en Pitalito.',
     'la empresa está un poco quieta debido a mis ocupaciones laborales, pero mi deseo es continuar con el trabajo que traía, ya que somos una marca reconocida en el departamento, con una comunidad fuerte. Hacemos presencia con puntos aliados en Tiendas de Promisión, el aeropuerto de Neiva, el aeropuerto de Pitalito y el café La Meca, en Pitalito.'],
  ],
};

/** Aplica las correcciones de un embajador a sus tres textos. Falla si alguna ya no coincide. */
export function fixStories(code, stories) {
  const out = { ...stories };
  for (const [from, to] of STORY_FIXES[code] || []) {
    const key = Object.keys(out).find((k) => out[k]?.includes(from));
    if (!key) throw new Error(`${code}: no se encontró el texto a corregir «${from.slice(0, 60)}…»`);
    out[key] = out[key].replace(from, to);
  }
  return out;
}
