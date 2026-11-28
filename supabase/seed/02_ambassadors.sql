-- Generado por scripts/build-ambassador-seed.mjs. No editar a mano: corre el script de nuevo.
-- Datos públicos de los embajadores (vitrina). Los datos personales están en seed/private/.

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0001', 'La Petit Huila', m.id, 'Achiras tradicionales y una versión con café especial, horneadas como en casa.',
  'En La Petit Huila decidimos iniciar debido a la necesidad manifiesta de conocidos y de nosotros mismos de poder disfrutar un buen cafecito en diferentes partes del país (especialmente cuando viajamos), acompañados de un snack perfecto, ligero y transportable; siempre nos costaba y cuesta encontrar unas deliciosas achiras tradicionales (no industriales) con alguna variedad de café especial por fuera del Huila.',
  'Actualmente, y tras poner a prueba nuestra extensa experiencia cafetera y achirera (abuelos, padres y ahora nosotros), tenemos para el encanto de nuestros clientes y visitantes el casamiento más representativo y gustoso de nuestro departamento: achiras con cafecito especial 100 % opita. Contamos con instalaciones adecuadas y certificadas para la producción de las achiras y en nuestras fincas (familiares de nuestros abuelos, padres y tíos) procesamos los cafés especiales.',
  'La mejora continua es el pilar básico de La Petit Huila. Nuestro objetivo siempre seguirá siendo conquistar a las personas amantes del café y de snacks saludables. Numerosos coffee shops, brunchs, hoteles, restaurantes y coffee lovers conquistados con nuestros sabores seguirán creciendo y manteniéndonos en una bonita y extensa relación recíproca de alegría y compromiso con la comunidad cafetera y de productos de origen.',
  'https://www.instagram.com/lapetithuila', 'https://www.facebook.com/profile.php?id=61553258546966', null, 'activo'
from public.municipalities m where m.name = 'Neiva';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0002', 'ADAMES Resortwear', m.id, 'Trajes de baño y resortwear diseñados en Neiva para cuerpos reales, con soporte y elegancia.',
  'ADAMES nació en Neiva antes de un viaje a la costa, por una frustración personal: el mercado solo ofrecía lo mismo de siempre y no había trajes de baño hermosos, diferentes y discretos que respetaran el deseo de cubrir ciertas partes del cuerpo. Al ver que yo estaba "bregando", entendí que las mujeres de tallas grandes y mayores de 50 años vivían la misma exclusión. Decidí crear la solución.',
  'Nuestro viaje ha sido una evolución constante: nacimos con el deseo de transformar la moda playera tradicional y hoy logramos crear colecciones completas que fusionan la moldería anatómica con el minimalismo orgánico. En el camino hemos aprendido que la verdadera belleza requiere estructura; por eso, cada uno de nuestros trajes de baño está diseñado para brindar soporte, seguridad y elegancia a los cuerpos reales. Hoy no te ofrecemos solo una prenda, te entregamos un negocio honesto, piezas de alta calidad y el respaldo de una marca real que celebra tu silueta en cada detalle.',
  'Mañana nos proyectamos consolidando a ADAMES como un referente de lujo relajado y sofisticación, con la meta clara de abrir las puertas de nuestro primer "Santuario" físico en Neiva para el 2027. Nuestros sueños más cercanos están enfocados en expandir este Universo de Vestuario, llevando la fusión del Swimwear técnico, el Resortwear de linos y el arte del upcycling artesanal a vitrinas nacionales. Queremos seguir escalando el negocio de forma estructurada para demostrar que el diseño consciente, la innovación y la empatía pueden transformar la moda, logrando que cada vez más mujeres recuperen la soberanía y la confianza sobre su propio cuerpo.',
  'https://www.instagram.com/adames.oficial/', 'https://www.facebook.com/Adames.oficial', null, 'activo'
from public.municipalities m where m.name = 'Neiva';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0003', 'BRIED Chocolatería', m.id, 'Chocolatería familiar que convierte el cacao de su finca en Palermo en bombones, trufas y tabletas.',
  'Nuestra historia comenzó en 2021 con la idea de dar valor agregado a nuestro cultivo de cacao en la finca San Rafael en Palermo, Huila; tras iniciar con chocolate de mesa y participar en ferias, consolidamos una alianza con el Hotel Ecoturístico Los Nogales, donde durante tres años ofrecimos experiencias y relatos alrededor del cacao. En ese proceso nos formamos con el SENA, aprendiendo a elaborar bombones, trufas y tabletas, lo que nos permitió estandarizar nuestros productos y elevar su calidad. Hoy nuestra marca registrada Bried Chocolatería, unión de Briyid y Eduardo, refleja el espíritu de una empresa familiar que produce cacao y lo convierte en experiencias de sabor.',
  'Hoy somos una chocolatería pequeña pero amena en el municipio de Palermo, Huila, donde transformamos el cacao de nuestra finca San Rafael en experiencias de sabor. Desde hace año y medio ofrecemos nuestro portafolio completo en un espacio acogedor que mezcla tradición con innovación. Nos caracteriza la creatividad: combinamos el chocolate con sabores de nuestra tierra y del mundo, y hacia finales de 2025 lanzamos nuestro bombón de asado huilense, una locura de sabor que refleja nuestra capacidad de sorprender. Siempre estamos innovando en nuevos sabores con chocolate, buscando que cada creación sea única y memorable.

En este recorrido hemos participado en ferias a nivel nacional e incluso en una internacional, lo que nos ha permitido dar a conocer nuestra propuesta y obtener reconocimiento regional por la calidad de nuestro chocolate. Aunque seguimos enfrentando retos de formalización y recursos limitados, nuestras victorias son la confianza de los clientes y la consolidación de nuestra marca registrada Bried Chocolatería, unión de Briyid y Eduardo.',
  'Nuestros sueños y metas más cercanas están enfocados en seguir creciendo con nuestra chocolatería, consolidándonos como un referente del Huila y expandiéndonos a nivel local y nacional. Queremos lograr la formalización completa, cumpliendo con todos los requisitos legales que nos permitan abrir nuevos mercados y llegar a más clientes.

Buscamos ampliar nuestra producción con maquinaria adecuada y empaques artesanales que mantengan nuestra identidad. Nuestro propósito es que Bried Chocolatería sea reconocida como una de las mejores chocolaterías del departamento del Huila, destacándonos por la creatividad y por ofrecer chocolates que mezclan sabores de nuestra tierra y del mundo.',
  'https://www.instagram.com/briedchocolateria', 'https://www.facebook.com/share/1Auvp1cBoX/', null, 'activo'
from public.municipalities m where m.name = 'Palermo';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0004', 'Chocolate Mamá Susana', m.id, 'Receta familiar de chocolate de mesa y la “Casa del Chocolate”, abierta a quien quiera conocer el proceso.',
  'Chocolate Mamá Susana nació del amor por las tradiciones de nuestra tierra y del deseo de que la costumbre de compartir una taza de chocolate nunca desapareciera. La inspiración lleva el nombre de mi mamá, Susana, quien durante toda su vida nos enseñó que alrededor del chocolate siempre había un espacio para la conversación, la unión familiar y el cariño.

Como microbiólogo y apasionado por la innovación, entendí que la mejor forma de preservar esa tradición era transformándola en una empresa que uniera conocimiento, calidad y cultura. Así comenzó este sueño: investigando, aprendiendo sobre el cacao, desarrollando recetas, participando en procesos de formación, concursos y proyectos de innovación, hasta lograr crear productos que respetan la esencia del chocolate artesanal, pero con una propuesta diferente.

Los primeros pasos no fueron fáciles. Fueron años de trabajo, de tocar puertas, de buscar oportunidades, de creer en una idea incluso cuando parecía lejana. Cada ensayo, cada error y cada aprendizaje fortalecieron la convicción de que el chocolate podía contar la historia de nuestro territorio y convertirse en un orgullo para Altamira y para el Huila.',
  'Hoy Chocolate Mamá Susana es mucho más que una fábrica de chocolate: es un proyecto que preserva la tradición, impulsa el turismo, promueve la cultura del cacao y genera valor para nuestro territorio.

Contamos con una planta de producción especializada, con registro INVIMA, donde elaboramos chocolates artesanales con altos estándares de calidad. También abrimos las puertas de nuestra Casa del Chocolate, un espacio donde visitantes y habitantes pueden vivir experiencias alrededor del cacao, conocer su historia y descubrir los sabores que hacen único al Huila.

En el camino hemos vivido grandes satisfacciones, como obtener el reconocimiento a la Mejor Taza de Chocolate en FICCA 2024, consolidar alianzas con instituciones y emprendedores, y ver cómo cada vez más personas se enamoran de nuestra marca. Pero también hemos enfrentado desafíos, momentos de incertidumbre y obstáculos propios de emprender. Cada uno de ellos nos enseñó que el crecimiento se construye con disciplina, paciencia y perseverancia.

Hoy seguimos convencidos de nuestra propuesta de valor: hacer que la tradición sea lo innovador, demostrando que el patrimonio gastronómico puede convertirse en una experiencia moderna, auténtica y memorable.',
  'Nuestro mayor sueño es que Chocolate Mamá Susana se convierta en un referente nacional e internacional del chocolate artesanal colombiano y que Altamira y el Huila sean reconocidos como un destino donde el cacao, la cultura y el turismo se encuentren.

Queremos seguir desarrollando productos innovadores con identidad regional, fortalecer nuestra Casa del Chocolate como un espacio de aprendizaje y experiencias, abrir nuevos mercados dentro y fuera del país y continuar trabajando de la mano con productores de cacao, artesanos y emprendedores que hacen parte de esta cadena de valor.

Más allá de crecer como empresa, queremos dejar un legado: demostrar que las tradiciones pueden convertirse en oportunidades de desarrollo, que los sueños construidos con esfuerzo sí son posibles y que una taza de chocolate puede contar la historia de una familia, de un pueblo y de toda una región.',
  'https://www.instagram.com/chocolatemamasusana', 'https://www.facebook.com/share/1JCxrQVjNo/', null, 'activo'
from public.municipalities m where m.name = 'Altamira';

insert into public.ambassador_badges (ambassador_id, label, type, year, sort_order)
select id, 'FICCA 2024', 'premio', 2024, 0 from public.ambassadors where code = 'EM0004';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0005', 'ARTBACU', m.id, 'Artesanías y souvenirs que cuentan el Huila en piezas hechas a mano.',
  'Observamos la necesidad de un souvenir que resaltara la cultura y el turismo del Huila, y ante la situación de desempleo y la falta de oportunidades para mi hija en condición de discapacidad auditiva, nace el emprendimiento familiar ArtBaCu ARTE-BARR´-CULTURA. Iniciamos dándonos a conocer de feria en feria.',
  'Actualmente estamos posicionados en el mercado regional, con gran recorrido en eventos locales y nacionales, cada día mejoramos con cada aporte que nos realizan nuestros clientes. En algunas ocasiones también hemos estado con los ánimos caídos debido a circunstancias del mercado, pero acá estamos listos para que cada colombiano y extranjero tenga un pedacito del Huila en su hogar, en su oficina y en su corazón.',
  'Nuestro sueño es asistir a ferias internacionales, y la meta más cercana es ser la empresa de artesanías más reconocida del Huila y sus alrededores.',
  'https://www.instagram.com/artbacucasartesanalycultural', 'https://www.facebook.com/ArtBaCuCasArtesanal', 'https://artbacu.com.co/', 'activo'
from public.municipalities m where m.name = 'Rivera';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0006', 'APIFIT', m.id, 'Productos de la colmena y servicios de polinización que cuidan los cultivos del sur del Huila.',
  'Apifit fue fundada en 2018 en Pitalito, Huila, por Leonardo Aguilera y Diana Méndez. Nació como un acto de amor y responsabilidad ambiental ante la alarmante pérdida global de abejas. Impulsados por el deseo de proteger la polinización local y la seguridad alimentaria, iniciamos un sueño con solo tres colmenas y un gran proceso de aprendizaje autónomo y rescate amigable de enjambres.
En el año 2020, en medio de la pandemia y con la llegada de nuevos socios estratégicos, nos estructuramos para responder a la creciente demanda de productos naturales y terapéuticos de la colmena. Hoy en día, somos un Negocio Verde en proceso de certificación que cuenta con cuatro líneas de acción que abarcan la nutrición saludable, insumos para apicultores, servicios de polinización dirigida a cultivos y educación ambiental.
Guiados por la convicción de que trabajar con las abejas requiere pasión antes que interés económico, ofrecemos productos y servicios con el valor de estar "hechos por abejas y cuidados con el amor de nuestros campesinos colombianos para tu bienestar". Nos proyectamos con firmeza para ser líderes nacionales, demostrando que una apicultura económicamente sustentable, socialmente incluyente y ambientalmente sostenible es el camino para un planeta feliz.',
  'Hoy, ApiFit se encuentra en una emocionante fase de despegue y crecimiento continuo. Si miramos hacia atrás, el viaje ha sido una escuela constante de resistencia, amor y aprendizaje.
Empezamos en 2018 de forma totalmente autogestionada, aprendiendo sobre la marcha mediante cursos, videos y pruebas de campo con apenas tres colmenas. Al principio, el camino fue físicamente exigente: el rescate amigable de enjambres nos tomaba largas jornadas que se extendían hasta la madrugada. El gran reto inicial fue aprender a estructurar administrativamente una pasión para convertirla en una empresa organizada, algo que logramos consolidar con la llegada de socios estratégicos en 2020.
Lo que comenzó como un sueño de conservación hoy es una realidad diversa y sólida. Actualmente contamos con 4 líneas de acción activas: nutrición saludable (con un catálogo de 26 productos nutracéuticos derivados de la colmena), insumos y asesoría para nuevos apicultores (37 productos), servicios de polinización dirigida que aumentan hasta un 24% el rendimiento de los cultivos locales, y jornadas de educación ambiental con comunidades y universidades.
Hoy somos una compañía confiable, madura y con un alto estándar de calidad. Ya estamos certificados como Negocio Verde ante el Ministerio de Medio Ambiente y la CAM. Mantenemos intacta la filosofía de que a las abejas se les cuida con amor, y nos proyectamos con total firmeza para ser una empresa líder de la apicultura en Colombia.',
  'En ApiFit miramos al futuro con la firme convicción de que el crecimiento económico debe ir de la mano con la preservación del planeta. Con la gran satisfacción de ser oficialmente un Negocio Verde certificado, nuestras metas y sueños más cercanos se centran en tres grandes hitos:
- Liderazgo Nacional: Nuestra meta principal a corto y mediano plazo es consolidarnos como una de las tres empresas líderes en Colombia en la producción y comercialización de productos auténticos y servicios apícolas, destacando siempre por nuestro alto nivel de calidad y confiabilidad.
- Potenciar nuestro impacto como Negocio Verde: Ahora que contamos con este sello ambiental, nuestro propósito es maximizar el impacto positivo en los ecosistemas y la sociedad. Queremos ser el referente nacional de cómo una empresa sostenible puede ofrecer bienestar real, garantizando productos 100% auténticos y naturales de la más alta calidad.
- Transformación del campo y seguridad alimentaria: Soñamos con expandir nuestras líneas de acción para seguir tecnificando a más familias campesinas (generándoles ingresos adicionales) y masificar los servicios de polinización dirigida. Queremos llevar los servicios ecosistémicos de las abejas a más regiones, demostrando a los agricultores que protegerlas incrementa notablemente el rendimiento y calidad de sus cosechas.
En definitiva, mañana nos vemos como el principal ejemplo en Colombia de que es posible tener una actividad altamente competitiva en el mercado, manteniendo intacto el amor por la naturaleza y nuestra esencia: entregar salud "hecha por abejas y cuidada con el amor de nuestros campesinos".',
  'https://www.instagram.com/apifitcolombia', 'https://www.facebook.com/Apifitcolombia', null, 'activo'
from public.municipalities m where m.name = 'Pitalito';

insert into public.ambassador_badges (ambassador_id, label, type, year, sort_order)
select id, 'Negocio Verde', 'certificacion', null, 0 from public.ambassadors where code = 'EM0006';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0007', 'Bambuqueras', m.id, 'Achiras huilenses con la misma receta de la Bizcochería La Especial desde 1988.',
  'La empresa Bambuqueras inició en el año 1988 bajo el nombre Bizcochería La Especial, con 2 personas al frente del negocio. Con el pasar de los años y el aumento de las ventas y el éxito de la empresa, nos vimos en la obligación de registrar nuestra marca. Al estar ya ocupado ese nombre con otra empresa, tuvimos que cambiar y renovar nuestro nombre. Actualmente somos Bambuqueras, un legado muy especial: somos los mismos de hace 38 años, con la misma receta y la misma tradición.',
  'Hoy Bambuqueras, antes conocida como Bizcochería La Especial, es una empresa más organizada, comprometida y enfocada en la calidad. A lo largo de este camino hemos aprendido que crecer no es solo vender más, sino mejorar cada proceso para ofrecer un producto seguro, auténtico y de excelente calidad.

Hemos tenido retos importantes. En nuestros inicios muchos procesos eran empíricos y no contábamos con la documentación ni los estándares que hoy tenemos. Gracias al acompañamiento de entidades como el INVIMA, entendimos la importancia de implementar buenas prácticas, fortalecer nuestros procesos y trabajar con una visión de mejora continua.

Hoy nos sentimos orgullosos de lo que hemos logrado: hemos fortalecido nuestra empresa, ganado la confianza de nuestros clientes y mantenido el compromiso de preservar la tradición de las auténticas achiras huilenses, sin perder nuestra esencia artesanal.

Sabemos que aún hay mucho por recorrer, pero cada desafío nos ha dejado una enseñanza y cada logro nos motiva a seguir creciendo, innovando y llevando productos de calidad a más hogares colombianos.',
  'Nuestro sueño es consolidar a Bambuqueras como un referente nacional de las auténticas achiras huilenses, llevando un producto que represente la tradición, la calidad y el orgullo de nuestra región.

En el corto plazo queremos seguir fortaleciendo nuestros procesos, ampliar nuestra presencia en nuevos mercados y puntos de venta, y continuar innovando sin perder la esencia artesanal que nos caracteriza. También queremos generar más oportunidades de empleo y seguir creciendo de manera responsable, siempre de la mano de las buenas prácticas y el mejoramiento continuo.

Más que crecer en tamaño, queremos crecer en confianza, para que cada cliente que pruebe nuestros productos reconozca en Bambuqueras una empresa comprometida con la calidad, la tradición y el desarrollo de Colombia.',
  'https://www.instagram.com/bambuqueras', 'https://www.facebook.com/share/18B4PmvCeJ/', null, 'activo'
from public.municipalities m where m.name = 'Neiva';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0008', 'Macchi Infinite', m.id, 'Abanicos artesanales transformables, diseñados y hechos en Neiva.',
  'Macchi Infinite nace en Neiva como respuesta al clima, reinterpretando el abanico desde una mirada contemporánea que dialoga con la identidad del territorio huilense, donde el calor, la elegancia y las dinámicas sociales han hecho del abanico un objeto cotidiano que hoy se transforma en símbolo de estilo y expresión.

El ensamblaje y los acabados se realizan manualmente, garantizando precisión, detalle y carácter artesanal en cada pieza.

Macchi Infinite introduce un sistema de abanico transformable mediante forros intercambiables y uso manos libres, proponiendo una evolución del objeto tradicional hacia un accesorio adaptable, funcional y contemporáneo.',
  'Hoy Macchi Infinite es una marca más sólida, con una identidad clara y una propuesta diferenciadora. En el camino seguimos aprendiendo que emprender implica adaptarse, escuchar, mejorar continuamente y ser resilientes. Hemos enfrentado retos propios del crecimiento, pero cada uno nos ha dejado aprendizajes valiosos. Nos llena de orgullo haber llegado a nuevos espacios comerciales, participar en importantes vitrinas y, sobre todo, construir una comunidad de clientes que valora nuestro trabajo. Seguimos creciendo con la misma pasión con la que empezamos y con la convicción de que aún queda mucho camino por recorrer.',
  'Nuestro sueño es consolidar a Macchi Infinite como una marca colombiana de referencia en accesorios artesanales de diseño, llevando nuestras creaciones a más ciudades, fortaleciendo nuestra presencia en marketplaces y canales digitales, y abriendo oportunidades en mercados internacionales. Queremos seguir innovando, generar empleo, trabajar de la mano con más artesanos y demostrar que desde el Huila es posible crear productos con identidad, calidad y proyección global.',
  null, 'https://www.facebook.com/share/r/1CE9rYbFXx/', null, 'activo'
from public.municipalities m where m.name = 'Neiva';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0009', 'Chocolatería Shalena', m.id, 'Chocolate de origen en barras de consumo directo, del amazónico al enchilado.',
  'Chocolatería Shalena nació en 2018 como una iniciativa empresarial creada por su fundadora como parte de su proyecto para la obtención del título profesional. Desde sus inicios, la visión fue clara: transformar el cacao huilense en productos de alta calidad que resaltaran el potencial de una de las regiones cacaoteras más importantes de Colombia.

En 2019, Shalena presentó su proyecto al programa Fondo Emprender, con el propósito de construir una fábrica de chocolate en el municipio de Íquira, Huila. Gracias a la solidez de su propuesta y al componente innovador que representaba para la región, en 2020 fue beneficiaria de un capital semilla de $150 millones de pesos, destinados a la construcción de la planta de producción, la adquisición de materia prima, la generación de empleo y la puesta en marcha de la industria chocolatera.

Ese mismo año se ejecutó exitosamente el proyecto, consolidando una empresa pionera en la transformación de cacao en el municipio de Íquira. Sin embargo, el camino no estuvo exento de desafíos. La pandemia de COVID-19 y posteriormente las movilizaciones sociales que afectaron al país impactaron significativamente los procesos de comercialización. Ante este panorama, Shalena decidió reinventarse, adaptando sus estrategias comerciales y fortaleciendo su visión empresarial para responder a las nuevas dinámicas del mercado.

Como parte de este proceso de crecimiento, la empresa profundizó su conocimiento en cacao y chocolatería fina, especializándose en la elaboración de chocolates de consumo directo con altos estándares de calidad. Esta apuesta por la formación, la innovación y el desarrollo de productos permitió fortalecer la identidad de la marca y diferenciarla dentro del sector.

En 2022 se vinculó como socio Jaime Tique, aportando su experiencia para la estandarización de procesos y formulaciones. Gracias a este trabajo conjunto, Chocolatería Shalena consolidó una línea de producción más eficiente y desarrolló un amplio portafolio de productos innovadores, alcanzando actualmente más de 60 referencias comerciales entre chocolates de origen, barras especiales, bebidas, productos de cacao y experiencias gastronómicas.

Hoy, Chocolatería Shalena es una empresa comprometida con la excelencia, la innovación y la transformación del cacao colombiano, llevando a sus clientes productos que reflejan la riqueza de nuestro territorio, el trabajo de los productores y la pasión por el chocolate de alta calidad.',
  'Hoy, Chocolatería Shalena es una empresa que continúa fortaleciendo el sector cacaotero colombiano mediante el trabajo conjunto con productores de cacao del departamento del Huila y de diversas regiones del país. Su compromiso con la calidad, la innovación y el desarrollo del cacao la ha llevado a invertir constantemente en formación especializada, particularmente en análisis sensorial y catación de cacao y chocolate, con el propósito de perfeccionar las técnicas de transformación y resaltar los perfiles sensoriales únicos del cacao huilense.

Gracias a este proceso de aprendizaje y mejora continua, Shalena ha logrado consolidar una propuesta de valor basada en la excelencia, la trazabilidad y la creación de productos que reflejan la riqueza y diversidad del cacao colombiano.

Actualmente, la empresa cuenta con una planta de transformación ubicada en el municipio de Íquira, Huila, donde desarrolla gran parte de sus procesos productivos. Asimismo, avanza en una nueva etapa de crecimiento con la apertura y fortalecimiento de su tienda física en la ciudad de Neiva, un espacio diseñado para acercar a los consumidores a la cultura del cacao y ofrecer experiencias alrededor del chocolate de origen.

Con una visión enfocada en la sostenibilidad, la innovación y el desarrollo regional, Chocolatería Shalena continúa trabajando para posicionar el cacao huilense y colombiano como un referente de calidad en los mercados nacionales e internacionales.',
  'La Chocolatería Shalena proyecta consolidarse como una de las empresas líderes en la transformación de cacao fino de aroma en Colombia, fortaleciendo su modelo de negocio desde el origen del cacao hasta la experiencia final del consumidor. Convertirse en un referente nacional en chocolates de origen, destacándose por la calidad de sus productos, la innovación en formulaciones y la valorización de los perfiles sensoriales únicos del cacao huilense. Expandir su presencia comercial, consolidando la tienda física en la ciudad de Neiva y desarrollando nuevos canales de comercialización a nivel regional, nacional e internacional. Incrementar el portafolio de productos y experiencias, incorporando nuevas líneas de chocolate premium, bebidas a base de cacao, productos funcionales y experiencias de turismo gastronómico y sensorial alrededor del chocolate. Posicionar al Huila como una región reconocida por la excelencia de su cacao y chocolate, participando en concursos, ferias nacionales e internacionales y generando valor agregado a la producción regional. Generar empleo y desarrollo económico local, ampliando la capacidad productiva de la empresa y creando nuevas oportunidades para jóvenes, mujeres y comunidades rurales vinculadas a la cadena del cacao.',
  'https://www.instagram.com/chocolateriashalena/', 'https://www.facebook.com/chocolateriashalenagourmet', 'https://shalena.principalwebsite.com/', 'activo'
from public.municipalities m where m.name = 'Íquira';

insert into public.ambassador_badges (ambassador_id, label, type, year, sort_order)
select id, 'Fondo Emprender SENA', 'programa', 2020, 0 from public.ambassadors where code = 'EM0009';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0010', 'TACHACOA', m.id, 'Chocolate de mesa con la receta de la abuela Tacha y cacao de origen de la Tatacoa.',
  'Tachacoa nació de un sueño, de una familia y de una tradición.

Hace más de diez años, Nando, un joven soñador apasionado por el cacao colombiano, imaginó la posibilidad de crear chocolates elaborados con cacao 100% natural y de origen. Compartió esa visión con su hermano Víctor, sembrando una idea que con el tiempo se convertiría en mucho más que un proyecto.

Una década después, Víctor retomó ese sueño familiar y lideró la creación de la fábrica, transformando aquella conversación entre hermanos en una realidad. Junto con toda la familia, dieron vida a la marca, diseñaron su identidad y definieron el primer producto: un chocolate de mesa elaborado con la receta tradicional de su abuela Tacha.

El nombre Tachacoa surge de la unión de tres elementos que representan su esencia: Tacha, la abuela que inspiró la receta; Tatacoa, la ecorregión donde se cultiva el cacao que da origen al producto; y la cocoa, el alma de cada taza de chocolate.

Hoy, Tachacoa transforma cacao de origen en chocolate artesanal, preservando el legado familiar y llevando a cada hogar el sabor auténtico de una historia construida con pasión, tradición y sueños compartidos.

Tachacoa: tradición familiar, cacao de origen y chocolate artesanal con historia.',
  'Hoy, Tachacoa es una empresa familiar que participa en toda la cadena de valor del cacao, desde el cultivo, la cosecha y la poscosecha hasta la transformación del grano en productos de chocolate artesanal de alta calidad. Cada etapa del proceso es cuidada con dedicación para garantizar un producto auténtico que conserve la esencia y riqueza del cacao colombiano.

El camino ha estado lleno de aprendizajes, desafíos y satisfacciones. Como todo emprendimiento, ha implicado superar obstáculos relacionados con la construcción de la marca, el desarrollo de los productos y la apertura de nuevos mercados. Sin embargo, cada reto ha fortalecido la convicción de ofrecer un chocolate artesanal elaborado con pasión, tradición y compromiso con la calidad.

Uno de los mayores logros ha sido posicionar a Tachacoa en Bogotá y los municipios de la Sabana, logrando que establecimientos locales de municipios como Tabio y Cajicá incluyan sus productos dentro de su oferta. Más allá de las ventas, la mayor satisfacción ha sido recibir la aceptación y el reconocimiento de los clientes, quienes disfrutan y valoran la calidad, el sabor y la historia que hay detrás de cada producto.

Hoy, Tachacoa continúa creciendo con la misma esencia que le dio origen: un sueño familiar que se convirtió en una realidad, impulsado por el amor al cacao, el respeto por las tradiciones y el deseo de compartir con más personas una experiencia auténticamente colombiana.',
  'Tachacoa proyecta su futuro con una visión clara: crecer y llegar a más personas, sin perder la esencia artesanal que le da identidad. Su principal compromiso es preservar el sabor tradicional que inspira cada uno de sus productos, al tiempo que fortalece y moderniza sus procesos productivos, comerciales y de distribución.

En los próximos años, la empresa busca consolidar su presencia en Bogotá y los municipios de la Sabana, llevando sus productos a más hogares colombianos y posicionándose como una marca reconocida por la calidad, el origen y la autenticidad de su chocolate.

A largo plazo, Tachacoa sueña con expandir su portafolio más allá del tradicional chocolate de mesa, incorporando nuevas líneas de productos como chocolates para repostería, chocolatinas y otras alternativas que permitan llevar el sabor de su cacao a diferentes momentos de consumo.

Asimismo, la empresa aspira a crear espacios propios donde los consumidores puedan vivir una experiencia alrededor del cacao y el chocolate artesanal, conocer su historia, degustar sus productos y conectar con la tradición y el origen que representan la marca.

Dentro de esta visión de crecimiento, también se proyecta participar en ferias nacionales e internacionales, llevando el nombre de Tachacoa y el sabor del cacao colombiano a nuevos escenarios. El objetivo final es abrir caminos hacia mercados internacionales y convertir a la marca en un referente de chocolate artesanal de origen colombiano.',
  'https://www.instagram.com/tachacoa', null, null, 'activo'
from public.municipalities m where m.name = 'Colombia';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0011', 'Café Horizonte FC', m.id, 'Café tostado en grano o molido de fincas huilenses, reconocido en FICCA 2022.',
  'Café Horizonte FC nació en 2019, tostando café en una vasija de barro, trillándolo en un pilón y empacándolo en bolsas transparentes. Yo, Miguel, conocía el café desde el cultivo, mientras Mariana, mi esposa, ya se había formado en tostión, catación y barismo. Al unir nuestros conocimientos nació el sueño de llevar el sabor de nuestra tierra a otros hogares.

Comenzamos vendiendo café a nuestros vecinos, en presentaciones de libra, media libra y cuarto. Tiempo después supe que habían abierto un hotel en Palermo. Fui a ofrecer nuestro producto y me compraron dos libras. Quince días después regresé con otras dos y, cuando iba saliendo, el dueño me ofreció trabajo. Allí realizaba diferentes labores y, en mis tiempos libres, les hablaba a los turistas sobre nuestro café.

El producto gustó tanto que nos permitieron utilizar un pequeño espacio para prepararlo y venderlo. Mariana y yo unimos fuerzas, mejoramos los procesos y nuestras hijas comenzaron a acompañarnos en esta aventura familiar.

Nuestros empaques también evolucionaron: pasamos de las bolsas transparentes a empaques comerciales y luego a una bolsa artesanal semibiodegradable que lleva una semilla de café en su interior. Así nació nuestro lema: “Adopta tu árbol de café”.

Al principio utilizábamos frases en inglés porque soñábamos con cruzar fronteras. Después comprendimos que queríamos que cada cliente llevara un pedacito de nuestra tierra, por eso nuestros empaques comenzaron a hablar como nuestra gente y a llevar un mensaje muy especial: “Gracias por apoyar nuestro proyecto”.

También tuvimos que transformar la producción. Intentamos obtener el registro sanitario conservando la tostión en vasija de barro, pero el material no contaba con la certificación requerida. En lugar de rendirnos, buscamos otra alternativa, formalizamos el proceso y obtuvimos una extensión del registro INVIMA mediante maquila para comercializar nuestro café tostado en grano o molido.

Así comenzó Café Horizonte FC: vendiendo a los vecinos, con una vasija de barro, dos libras que abrieron una oportunidad y una familia decidida a salir adelante.',
  'Hoy Café Horizonte FC es una empresa familiar dedicada a comercializar café tostado en grano o molido, en presentaciones de libra, media libra y cuarto. Contamos con nuestra tienda en Palermo y puntos de distribución en Neiva y Villavieja.

El camino nos ha enseñado que emprender también significa equivocarse, corregir y volver a comenzar. Hemos enfrentado dificultades económicas, enfermedades y momentos que pusieron a prueba nuestra fortaleza, pero cada caída nos hizo aprender y trabajar más unidos.

También hemos vivido grandes victorias. Participamos en ferias y eventos como Huila Fest, La Placita, Expo Agrofuturo y Expo Cafés Especiales en Bogotá. Obtuvimos el segundo lugar como mejor emprendimiento en FICCA 2022 y un reconocimiento al mejor diseño y empaque en La Placita.

Cada integrante de la familia aporta desde sus fortalezas: Mariana conecta con las personas y transmite nuestra esencia; yo presento el producto y cierro los negocios; Madeline nos ayuda con las redes sociales, la administración y las nuevas ideas, y Melany representa la alegría y espontaneidad de la marca.

Hoy no ofrecemos solamente café. Cada bolsa lleva nuestras raíces, el esfuerzo de nuestra familia y la gratitud hacia quienes deciden apoyar este sueño.',
  'Nuestro sueño es que Café Horizonte FC llegue a más hogares, tiendas y ciudades, sin perder la esencia familiar y regional que nos hace diferentes.

Queremos fortalecer la venta de café tostado en grano o molido, aumentar nuestros puntos de distribución, mejorar la capacidad de producción y continuar desarrollando empaques cada vez más sostenibles.

Actualmente realizamos seguimiento técnico a fincas productoras de cafés especiales de la región. Más adelante queremos comercializar diferentes variedades que representen la riqueza de nuestro territorio y reconozcan el trabajo de las familias caficultoras.

Soñamos con cruzar fronteras, pero llevando siempre nuestra identidad. Queremos que, al abrir una bolsa de Café Horizonte FC, cada persona encuentre un café de calidad, una semilla para sembrar y un pedacito de nuestra tierra.

Nuestro mayor propósito es dejarles a Madeline y Melany más que una empresa: un ejemplo de unión, perseverancia y amor por nuestras raíces.',
  'https://www.instagram.com/cafehorizontefc/', 'https://www.facebook.com/CafeHorizonteFC', null, 'activo'
from public.municipalities m where m.name = 'Palermo';

insert into public.ambassador_badges (ambassador_id, label, type, year, sort_order)
select id, 'FICCA 2022', 'premio', 2022, 0 from public.ambassadors where code = 'EM0011';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0012', 'Cervecería Indian', m.id, 'Cerveza artesanal elaborada en Palermo, Huila.',
  'Esta historia comienza un día cualquiera, con la idea de adentrarnos en el mundo de la destilación de licores, específicamente el whisky. Sin embargo, los costos y los largos tiempos de producción asociados rápidamente desbarataron el proyecto. Fue entonces cuando recordamos que durante nuestros años universitarios habíamos llevado a cabo un estudio sobre la industria cervecera artesanal. Estos análisis revelaban que la juventud, a nivel global, valora y tiene una afinidad extraordinaria por esta preciada bebida dorada, extraída de la malta de cebada. Siguiendo este nuevo rumbo, emprendimos una intensa formación en la elaboración de cerveza.

Después de un tiempo, armados con amplios conocimientos en la industria cervecera y un sencillo kit de cervecería, empezamos a elaborar cerveza en nuestro apartamento. La valiosa contribución de familiares y amigos, quienes generosamente prestaron sus paladares en numerosas catas de cerveza y con sus comentarios, permitió perfeccionar nuestras recetas, las cuales, con el transcurso de los días, se volvieron populares y capturaron el interés de amigos y compradores dispuestos a pagar por ellas.

Nos encontrarás aquí, forjando esta historia en la tierra que vio nacer a mi madre. Estamos llevando a cabo nuestro proyecto de vida soñado en el municipio de Palermo, Huila, con una convicción inquebrantable de desafiar las creencias establecidas.',
  'En Cervecería INDIAN nos enorgullece decir que somos la cervecería artesanal más grande del departamento del Huila, con un amplio reconocimiento y con proyecciones de ingresar al Putumayo y al Caquetá.',
  'Ser la empresa de cervecería artesanal más grande de Colombia en 10 años.',
  'https://www.instagram.com/indian_brewing_co', null, 'https://indianbeer-co.webnode.com.co', 'activo'
from public.municipalities m where m.name = 'Palermo';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0013', 'Ecoproser', m.id, 'Productos de limpieza para el hogar fabricados en Palermo, con recargas y envases reutilizables.',
  'Ecoproser fue fundada en el año 2018 por las hermanas Daniela y María Alejandra Sánchez Solano, quienes, a partir de una necesidad identificada en la industria de alimentos, decidieron emprender con el desarrollo y fabricación de productos de higiene doméstica orientados a brindar soluciones efectivas a las necesidades de limpieza y desinfección de diferentes sectores.

Con el apoyo del Fondo Emprender del SENA, Ecoproser recibió capital semilla que permitió fortalecer su proyecto empresarial y avanzar en la construcción y puesta en marcha de su planta de producción de productos de higiene doméstica.

Gracias a este proceso de crecimiento y fortalecimiento técnico, la empresa logró consolidar su infraestructura productiva y obtener ante el INVIMA la autorización correspondiente para desarrollar sus actividades de fabricación, contando con capacidad de producción para atender las necesidades de sus clientes.

Desde entonces, Ecoproser ha trabajado bajo una visión de innovación, calidad y compromiso con sus clientes, buscando desarrollar soluciones de higiene que respondan a las necesidades reales del mercado y contribuyan al crecimiento sostenible de la región.',
  'Actualmente, Ecoproser es una empresa huilense dedicada a la fabricación y comercialización de productos de higiene doméstica, que ha logrado consolidarse como una alternativa regional para hogares, empresas y diferentes sectores productivos.

La empresa cuenta con una planta de producción ubicada en Palermo, Huila, dotada con la infraestructura y capacidad necesarias para la fabricación de sus productos, y trabaja bajo criterios de calidad, eficiencia e innovación.

Ecoproser ofrece un portafolio de soluciones para limpieza, desinfección y mantenimiento, buscando responder a las necesidades específicas de sus clientes. Además, mantiene un compromiso permanente con el desarrollo de productos más responsables con el medio ambiente, promoviendo prácticas como la reutilización de envases, los sistemas de recarga y el uso de materias primas que permitan reducir el impacto ambiental.

Hoy, Ecoproser continúa creciendo con una visión de fortalecimiento empresarial y generación de oportunidades en la región, apostándole al talento local, a la innovación y a la construcción de una empresa sostenible que pueda llevar productos de calidad desde Palermo, Huila, hacia nuevos mercados.',
  'En los próximos años, Ecoproser se proyecta como una empresa referente en el sector de productos de higiene doméstica en el Huila y con presencia progresiva en nuevos mercados a nivel nacional. Su propósito es continuar fortaleciendo su capacidad productiva, ampliar y diversificar su portafolio y desarrollar soluciones innovadoras que respondan a las necesidades de los consumidores y de los diferentes sectores económicos.

La empresa busca consolidar su crecimiento mediante la innovación, la calidad y la sostenibilidad, incorporando nuevas tecnologías y procesos que permitan mejorar la eficiencia de producción y desarrollar productos cada vez más responsables con el medio ambiente.

Asimismo, Ecoproser tiene como meta fortalecer su marca y ampliar sus canales de comercialización, llegando a más hogares, empresas y aliados estratégicos, sin perder el enfoque que la caracteriza: ofrecer soluciones de higiene accesibles, eficientes y de calidad, generando al mismo tiempo empleo y oportunidades para la comunidad local.

A futuro, Ecoproser busca pasar de ser una empresa regional a convertirse en una marca reconocida a nivel nacional, llevando el nombre de Palermo y del Huila a nuevos territorios y demostrando que desde las regiones también es posible construir empresas innovadoras, sostenibles y competitivas.',
  'https://www.instagram.com/ecoproser/', 'https://www.facebook.com/ecoperoser.eco/', null, 'activo'
from public.municipalities m where m.name = 'Palermo';

insert into public.ambassador_badges (ambassador_id, label, type, year, sort_order)
select id, 'Fondo Emprender SENA', 'programa', null, 0 from public.ambassadors where code = 'EM0013';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0014', 'Maca Joyas y Accesorios', m.id, 'Joyas y accesorios artesanales y personalizados, hechos en Neiva desde 2017.',
  'MACA nació en 2017 como un pequeño emprendimiento impulsado por mi gusto por los accesorios y las ganas de crear algo propio. Empezamos poco a poco, elaborando y comercializando piezas que conectaran con diferentes estilos y personalidades.

Con el tiempo fuimos creciendo, aprendiendo nuevas técnicas, participando en ferias y ampliando nuestro portafolio. Lo que comenzó como una idea se convirtió en una marca que hoy combina trabajo artesanal, diseño, personalización e innovación, siempre buscando que cada pieza tenga algo especial que la haga única.',
  'Hoy MACA es el resultado de años de aprendizaje, constancia y evolución. En el camino hemos tenido dificultades, errores y momentos en los que ha sido necesario reinventarnos, pero cada experiencia nos ha ayudado a crecer.
Entre nuestras mayores victorias está haber llevado nuestra marca a diferentes escenarios, participando en ferias en Pasto, Popayán y Bogotá, además de distintos eventos a nivel regional y departamental. Cada feria, cada cliente y cada nueva oportunidad nos han permitido aprender, mejorar y hacer que más personas conozcan nuestro trabajo.',
  'Nuestro sueño es seguir posicionando a MACA, llegar a nuevos mercados y lograr que cada vez más personas conozcan y conecten con nuestra marca. Queremos continuar innovando, fortaleciendo nuestras colecciones y llevando nuestros productos a más ciudades de Colombia, con la meta de que en un futuro MACA también pueda llegar a otros países.',
  'https://www.instagram.com/macajoyasyaccesorioss', 'https://www.facebook.com/share/19UoCeoTHQ/', null, 'activo'
from public.municipalities m where m.name = 'Neiva';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0015', 'Musas Victorianas', m.id, 'Cuidado capilar botánico con romero, quina, ortiga y aceite de coco.',
  'Existía ese deseo profundo de reconectar con el poder de la botánica, rescatando secretos ancestrales e ingredientes de la naturaleza —como el romero, la quina, la ortiga, la cola de caballo, el aceite de coco y frutos autóctonos— para dar respuesta a necesidades tan cotidianas como la caída del cabello, el crecimiento y la hidratación profunda.
La inspiración detrás del nombre y el concepto también vino del deseo de honrar a la mujer que me dio la vida, ya que sufrió una alopecia hace más de 10 años: crear una línea que no solo transformara la fibra capilar, sino que también invitara a cada mujer a convertirse en su propia musa, regalándose un momento diario de cuidado, amor propio y bienestar.',
  'Mirar el camino recorrido después de más de 10 años de historia con Musas Victorianas despierta una mezcla profunda de gratitud, orgullo y emoción. Lo que empezó como un sueño botánico y una búsqueda personal de cuidado consciente se ha convertido en un viaje de vida lleno de aprendizaje, evolución constante y una comunidad sólida que le da sentido a cada esfuerzo.
Hoy nos encontramos en un momento de plena madurez, donde la experiencia acumulada nos permite mirar hacia atrás, reconocer el camino andado y proyectar el futuro con total claridad.',
  'Consolidar la cobertura e innovación de línea: Seguir enriqueciendo el portafolio con nuevas fórmulas botánicas de alto desempeño, incorporando ingredientes naturales de vanguardia y llevando nuestros productos a nuevos canales de distribución para llegar a más rincones y hogares.

Fortalecer la presencia en ferias y eventos: Ampliar la participación en vitrinas comerciales y encuentros de emprendimiento a nivel regional y nacional, llevando la experiencia sensorial y educativa de la marca directamente a más personas.',
  'https://www.instagram.com/musas_victorianasoficial', null, null, 'activo'
from public.municipalities m where m.name = 'Neiva';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0016', 'Acacias Fit', m.id, 'Té 100% natural de fórmula propia, preparado de forma artesanal en Neiva.',
  'Acacias Fit nació hace 6 años como una necesidad propia y, al ver resultados en mí, se volvió un emprendimiento de María Rivas, quien creó un té 100% natural para aliviar problemas digestivos, hinchazón y ansiedad. Empezó de forma artesanal, con una fórmula propia, y ha crecido debido al aumento de la demanda.',
  'Acacias Fit nació de una necesidad propia. María Rivas, su fundadora, estaba subida de peso y buscaba una solución real. En ese camino descubrió un producto natural que no solo la ayudó a ella, sino que transformó su vida y la de muchas personas. Esa experiencia la motivó a emprender y a compartir los beneficios de ese té con más familias.

Al principio todo era muy artesanal. No había recursos suficientes para invertir, no había un espacio adecuado y la producción se hacía con lo que se tenía a la mano. A pesar de las limitaciones, la demanda empezó a crecer: llegaban pedidos, pero muchas veces no había cómo cubrirlos por falta de materia prima, de empaque o de capacidad para producir más rápido. Ese fue uno de los primeros grandes retos.

Luego llegó la pandemia. Fue un momento duro para todos, y para Acacias Fit también: los envíos se complicaron, las ventas bajaron y la incertidumbre creció. Hubo meses buenos y meses malos. Como todo emprendimiento, ha tenido altibajos: ventas que suben, ventas que caen, momentos de mucha esperanza y otros de preocupación.

También ha habido obstáculos que no tienen que ver con el mercado, sino con las personas: la envidia de quienes no quieren ver surgir un emprendimiento ajeno, las críticas, la desconfianza. Pero nada de eso ha detenido el proyecto.

Con constancia, esfuerzo y el respaldo de los clientes que ven resultados reales, Acacias Fit se ha sostenido. Hoy es reconocido a nivel nacional, con una buena aceptación porque la gente comprueba que el producto funciona, que ayuda de verdad y que mejora la calidad de vida. No ha sido un camino fácil, pero sí un camino auténtico, construido paso a paso, sin perder la esencia de lo natural y el compromiso con el bienestar de las familias.',
  'Acacias Fit se proyecta como una marca líder en bienestar natural a nivel nacional, reconocida por la efectividad de su fórmula, la calidad de sus productos y su compromiso con lo natural, lo accesible y lo sostenible.

En los próximos años, la visión es expandir la presencia más allá del Huila, llegando a ciudades como Ibagué, Popayán y Bogotá, y consolidando una red de distribución que permita que más familias colombianas conozcan y confíen en el té. Se proyecta ampliar la línea de productos, desarrollando nuevas presentaciones y variedades que respondan a las necesidades cambiantes del mercado, siempre manteniendo la esencia natural y multibeneficios que caracteriza a la marca.

A nivel productivo, se visualiza una planta propia con capacidad para producir a mayor escala, cumpliendo con todos los estándares sanitarios y de calidad, y generando más empleos formales para la región. Se espera también fortalecer el modelo asociativo, integrando a más personas y consolidando una estructura organizativa sólida que garantice la sostenibilidad del proyecto a largo plazo.

En el ámbito social y ambiental, Acacias Fit quiere ser un referente de emprendimiento consciente: apoyando a más productores locales de hierbas, promoviendo prácticas agrícolas limpias, reduciendo el impacto ambiental con empaques retornables y reciclables, y llevando bienestar a más hogares, incluyendo programas de educación en salud y prevención.

La meta final es que Acacias Fit sea sinónimo de bienestar natural en Colombia, un producto que la gente recomiende con confianza, que transforme vidas y que demuestre que se puede hacer empresa con propósito, desde lo local y para el mundo.',
  'https://www.instagram.com/acacias.fit', 'https://www.facebook.com/kmiiz.klaroz', null, 'activo'
from public.municipalities m where m.name = 'Neiva';

insert into public.ambassadors (code, brand_name, municipality_id, short_description, story_origin, story_present, story_future, instagram, facebook, website, status)
select 'EM0017', 'Herencia Obsequios Huilenses', m.id, 'Souvenirs livianos, coloridos y útiles para llevarse el Huila como recuerdo de viaje.',
  'Nació como una forma de ofrecer a los turistas que visitaban San Agustín souvenirs livianos, resistentes, coloridos y útiles que pudieran llevar como recuerdo de su viaje. Luego se convirtió en la marca de los huilenses y pasamos a atender a turistas de todo el departamento.',
  'Hoy en día, la empresa está un poco quieta debido a mis ocupaciones laborales, pero mi deseo es continuar con el trabajo que traía, ya que somos una marca reconocida en el departamento, con una comunidad fuerte. Hacemos presencia con puntos aliados en Tiendas de Promisión, el aeropuerto de Neiva, el aeropuerto de Pitalito y el café La Meca, en Pitalito.',
  'Volver a tener nuestro punto de venta propio.',
  'https://www.instagram.com/herenciaobsequioshuilenses', 'https://www.facebook.com/share/1BinrbqXAV/', null, 'activo'
from public.municipalities m where m.name = 'Pitalito';

-- El siguiente embajador creado desde /admin recibe EM0018.
insert into public.sku_counters (scope, last_value) values ('AMBASSADOR', 17)
on conflict (scope) do update set last_value = greatest(public.sku_counters.last_value, excluded.last_value);
