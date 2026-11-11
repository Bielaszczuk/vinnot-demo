# Mapa funcional web

## Propósito y alcance

Este mapa permite navegar a los circuitos detallados. Cada documento distingue
actor, entrada, estado de presentación, operación de aplicación y autoridad
backend. La presencia de un servicio no implica que todas sus operaciones estén
expuestas en todas las pantallas.

## Circuitos

- [Información pública, políticas y soporte](../../modules/support/architecture.md)

| Área | Documento | Contenido |
|---|---|---|
| Identidad | [Autenticación y cuenta](../../modules/users/architecture.md) | Login, social, bootstrap, renovación, enlaces y perfil |
| Descubrimiento | [Catálogo y detalle](../../modules/wines/architecture.md) | Texto, filtros, paginación, navegación y consultas relacionadas |
| IA | [Perfiles y comparaciones](../../modules/ai/architecture.md) | Lectura/generación, idioma, selección y caché |
| Usuario | [Cava](../../modules/cellar/architecture.md#web) y [reseñas](../../modules/reviews/architecture.md#web) | Entrada personal, reseñas, likes y comentarios |
| Geografía | [Eventos](../../modules/events/architecture.md#web), [bodegas](../../modules/wineries/architecture.md#web) y [rutas](../../modules/wine-routes/architecture.md#web) | Descubrimiento, inscripción, checkout de Mercado Pago → retorno/recibo, mis entradas, mapas y paradas |
| Gestión | [Administración y moderación](../../modules/admin/architecture.md#web) | Roles, catálogo y moderación |

## Escaneo: límite de plataforma

El reconocimiento de etiquetas es exclusivo de mobile.
`WineScanPage` presenta una invitación a descargar la app. No solicita cámara,
no analiza una foto ni invoca `/wines/scan`. El panel web sí puede moderar las
submissions creadas desde mobile.

## Lectura transversal

- [Estado remoto y transporte](../architecture/remote-state-and-transport.md)
- [Plataforma, idioma y persistencia](../architecture/platform-and-localization.md)
- [Secuencias y estados de producto](../diagrams/product-processes.md)
- [Estrategia de pruebas](../testing/strategy.md)

Carga, vacío, fallo, éxito y cancelación se documentan por operación. La matriz
de pruebas enumera criterios de verificación sin declarar cobertura inexistente.
Los defectos y propuestas de cambio se mantienen fuera del corpus canónico.

## Comunidad y moderación

Las reseñas y comentarios ofrecen denuncia contextual, denuncia del autor y bloqueo con confirmación. Los eventos/rutas ofrecen denuncia. Desde perfil se consultan casos propios y se desbloquean usuarios; el panel administrativo permite revisar y retirar reseñas/comentarios con motivo obligatorio. Ver el [contrato de comunidad](../../modules/community/architecture.md).

## Perfiles sociales y seguimiento

- **Perfil público** (`/users/:id`): foto, nombre, @usuario, biografía, sello actual, contadores (seguidores, siguiendo, reseñas, vinos en cava), botón Seguir/Siguiendo, afinidad de gustos con quien mira, perfil de gustos ilustrado y las secciones Reseñas y Cava. La cava muestra un estado bloqueado cuando su dueño no la comparte con quien mira; nunca muestra notas privadas ni precios. En el perfil propio el botón es «Editar perfil».
- **Perfil de gustos** (tarjeta del perfil público, estilo acuarela de Vinnot): la rueda de gustos animada: una flor de pétalos en acuarela sobre un escenario de papel crema, con el racimo de uvas en un disco central (respeta movimiento reducido). Cada entrada es un pétalo pintado, con la punta hacia el centro, en ángulos iguales desde las doce; es más largo cuanto mayor es el puntaje (72% del largo total en 0, el largo total en 5), tan ancho como hasta 1,15 veces la ilustración pero nunca más que el espacio hasta sus vecinos, así los pétalos casi se tocan, alterna tres formas de pétalo con una leve inclinación y empieza justo fuera del disco central, así nunca toca el texto del centro. Cada pétalo es su color visto a través de una aguada de pétalo en grises (un tinte enmascarado con la aguada multiplicada encima); la leyenda lo repite en un pétalo diminuto. Un selector arriba («Uvas», por defecto; «Estilos»; «Regiones») muestra un solo tipo por vez y oculta la vista sin datos (si no hay uvas, abre la primera con datos). Los colores tienen sentido: cada uva toma el tono de sus vinos (`tone`: tintas en granate, rubí, violeta y ciruela; blancas en dorado, paja y verde amarillento; rosadas en rosas; el resto neutro), agrupada por tono y alternando matices para que dos vecinas nunca se parezcan; los estilos usan el color de cada tipo de vino, con su nombre traducido, y las regiones ocho tonos distintos. Tocar un pétalo (en cualquier punto de su sector) o su fila de la leyenda lo resalta (crece un 8% y sale unos 6 px hacia afuera mientras el resto se atenúa) y el centro muestra el nombre, el puntaje promedio con un decimal y los vinos calificados («N vinos»), siempre dentro del disco: dos líneas como máximo, un tamaño de letra menor para los nombres largos y puntos suspensivos solo como último recurso; tocarlo otra vez, Escape o cambiar de vista lo limpia. Pétalos y filas son botones accesibles por teclado; debajo, o a la derecha en pantallas grandes, «Estructura» con cuatro escalas (Acidez, Cuerpo, Taninos y Dulzor), cada una con su ilustración, una palabra de nivel (baja, media o alta; el dulzor como seco, semiseco o dulce) y un marcador en el puntaje 0-100; y «Aromas que prefiere» («Aromas que preferís» en el perfil propio) con las familias Frutado, Floral, Herbal, Especiado, Madera y Mineral como chips ilustrados con su porcentaje, de mayor a menor. Cada sección se oculta cuando no tiene datos; sin rasgos (`tasteTraits` nulo) solo aparece la rueda. Por debajo de 5 vinos calificados la tarjeta muestra un estado bloqueado con una explicación; si la persona completó el test de gustos, muestra sus rasgos junto a un aviso compacto de que la rueda se completa con 5 vinos calificados. Cuando algún valor viene del test (`tasteTraits.fromQuiz`), una nota dice «Según tu test de gustos» en el perfil propio y «Según su test de gustos» en el de otra persona. En el perfil propio la tarjeta ofrece «Hacé tu test de gustos» o, si ya lo completó, «Repetir el test». Las ilustraciones son decorativas: el texto lleva el significado.
- **Ajustar el paladar** (solo en el perfil propio; quien visita nunca ve los controles): «Ajustar», en el encabezado de «Estructura», convierte las cuatro barras en deslizadores de 0 a 100. La persona arrastra el marcador o toca la barra para llenarla o vaciarla; con el teclado, las flechas mueven de a 5, Re Pág/Av Pág de a 10 e Inicio/Fin llevan a los extremos. Cada deslizador es accesible (`role="slider"`, con el nombre del rasgo y la palabra de nivel como valor anunciado) y la palabra de nivel cambia en vivo. Un rasgo sin datos arranca en 50 y solo se guarda si la persona lo mueve. «Guardar» envía únicamente los rasgos que cambiaron (`PUT /users/me/taste-traits` con `{"structure":{"ACIDITY":80}}`) y, cuando llega el perfil actualizado, vuelve a las barras; «Cancelar» restaura los valores sin guardar. Un valor manual prevalece sobre el calculado y su rasgo muestra la etiqueta «Ajustado»; «Volver a lo calculado», visible solo si hay algún rasgo ajustado, borra todos los ajustes (`DELETE /users/me/taste-traits`). Si guardar falla, las barras siguen abiertas con un aviso. En el perfil propio sin estructura, la sección aparece con una invitación a ajustarla.
- **Test de gustos** (`/taste-quiz`, con sesión): cinco preguntas ilustradas, una por pantalla, que arman un perfil de gustos inicial: un día de lluvia, la fruta favorita, el postre, una cena especial y el aroma preferido. Cada respuesta es una tarjeta con su acuarela sobre un escenario crema y su texto; la persona ve solo las opciones, nunca cómo se traducen en rasgos. Un indicador muestra el avance (1 de 5); al tocar una opción se resalta y, tras un instante, pasa a la siguiente pregunta; «Anterior» vuelve con la respuesta conservada. «Saltear», en cada paso, registra que la persona lo salteó (`POST /users/me/taste-quiz/skip`) y vuelve a donde estaba (Inicio si no hay origen); al repetir un test completado solo sale, sin borrarlo. Tras la quinta respuesta se envían las cinco (`PUT /users/me/taste-quiz`) mientras «Definiendo tu perfil de gustos» cuenta, con el mismo motor de escenas en acuarela que el perfil IA pero con escenas propias, cómo nace el perfil a partir de las opciones elegidas: «Reuniendo tus elecciones» (una pluma dibuja cada una de las cinco opciones elegidas dentro de una libreta de cata abierta, entintadas en la página con una nota manuscrita al lado), «Llenando tu copa» (una copa vacía se llena de vino tinto y sus aromas suben en volutas), «Mezclando tus sabores» (un pincel moja dos pocillos de la paleta y mezcla los colores) y «Dando forma a tu perfil de gustos» (el pincel da forma a la rueda pétalo a pétalo alrededor de una copa de vino tinto vista desde arriba, y repite mientras se guarda). Cada escena se mueve a un ritmo calmo, con movimientos suaves, y descansa un instante en su pose final antes de la siguiente; la animación dura al menos 13,4 segundos, para que se vean las cuatro escenas; con movimiento reducido cada escena muestra su pose final. Después abre el perfil público propio. Si falla, ofrece reintentar sin perder las respuestas. Las opciones son botones accesibles por teclado que anuncian cuál está elegida, y la página respeta el movimiento reducido.
- **Invitación al test**: después de iniciar sesión, si `GET /users/me/taste-quiz` responde `shouldPrompt: true` (test pendiente y menos de 5 vinos calificados), la app lleva una sola vez al test y recuerda la página de origen. No vuelve a interrumpir en la misma sesión del navegador; entre sesiones lo evita el estado del servidor (salteado o completado). Nunca redirige desde páginas públicas, legales, de error ni desde la verificación de correo, y solo actúa después de aceptar los términos y completar el alta.
- **Listas** (`/users/:id/followers`, `/users/:id/following`): se abren desde los contadores; cada fila abre el perfil y tiene su botón Seguir, salvo la propia.
- **Inicio** (sesión iniciada): «De gente que seguís» muestra las últimas reseñas y «Ver todo» abre el feed completo (`/feed`, paginado); «Personas para seguir» sugiere gente con gustos parecidos, con su afinidad y un botón Seguir. No hay entrada nueva en la navegación.
- **Autor de reseñas**: en las reseñas de un vino y sus comentarios, en el feed y en las tarjetas de Inicio, la foto y el nombre del autor abren su perfil, y el @usuario aparece debajo del nombre en un texto más chico y gris (no se muestra nada si no hay usuario). Una foto ausente o rota muestra el ícono de persona.
- **Fotos en administración**: la lista de usuarios y el diálogo de la cuenta (`/admin/users`) muestran la foto de cada usuario, con la inicial del usuario cuando no hay foto o no carga; la lista de reseñas (`/admin/reviews`) muestra la foto del autor con el ícono de persona como respaldo. Toda ruta de foto que devuelve la API (reseñas, comentarios, usuarios y reseñas de administración, listas sociales, sesión y perfiles) se resuelve contra el origen de la API, y las URL absolutas pasan sin cambios.
- **Perfil propio** (`/profile`, pestaña Perfil): tarjeta «Perfil público» para editar la biografía (hasta 160 caracteres, con contador) y quién ve la cava (Pública, Solo seguidores, Privada); guarda con `PATCH /users/me`.

Contrato: [comunidad](../../modules/community/architecture.md) y [usuarios](../../modules/users/architecture.md).
