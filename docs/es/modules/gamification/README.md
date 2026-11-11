# Puntos y sellos

Recompensa la actividad real de cada persona con puntos y muestra un sello de lacre
(emblema) que cambia con ellos. Los módulos donde ocurre la actividad (reseñas, cava,
vinos, eventos y usuarios) le informan cada acción; este módulo decide cuántos puntos
corresponden, aplica los topes, guarda cada movimiento, calcula el nivel y avisa
cuando se alcanza uno nuevo. La guía para personas usuarias es
[Puntos y sellos](../../manuals/points-and-seals.mdx).

- Código del módulo: `GAM`.
- Backend: paquete [`gamification`](../../../../backend/src/main/java/com/vinnot/gamification/), con los puertos de entrada que llaman los demás módulos.
- [Casos de uso](use-cases/README.md) · [Requisitos](requirements.md) ·
  [Arquitectura](architecture.md) · [Pruebas](testing.md)
- Fuera de alcance: ranking entre personas, mostrar puntos en perfiles públicos e insignia verificada. «Sommelier» queda reservado para esa insignia futura. Los perfiles públicos ([Comunidad](../community/README.md)) muestran el sello actual (`tier`), nunca los puntos.

## Niveles

Once niveles según los puntos **actuales**: el nivel baja si se revocan puntos. La
celebración y el push se disparan solo la primera vez que se alcanza cada nivel.

| Clave | Nombre (es) | Nombre (en) | Desde | Arte (`<slug>.webp`) |
|---|---|---|---|---|
| `BROTE` | Brote | Bud | 0 | `brote` |
| `PARRA` | Parra | Vine Leaf | 30 | `parra` |
| `RACIMO` | Racimo | Cluster | 80 | `racimo` |
| `VENDIMIA` | Vendimia | Harvest | 160 | `vendimia` |
| `LAGAR` | Lagar | Wine Press | 280 | `lagar` |
| `BARRICA` | Barrica | Barrel | 450 | `barrica` |
| `CRIANZA` | Crianza | Aging | 700 | `crianza` |
| `RESERVA` | Reserva | Reserve | 1000 | `reserva` |
| `GRAN_RESERVA` | Gran Reserva | Grand Reserve | 1600 | `gran-reserva` |
| `GRAN_ENOFILO` | Gran Enófilo | Connoisseur | 2600 | `gran-enofilo` |
| `VINNOT` | Vinnot | Vinnot | 5000 | `vinnot` |

El slug es la clave en minúsculas con `_` cambiado por `-`. El arte vive en
`frontend-mobile/assets/images/emblems/` y `frontend-react/public/images/emblems/`.

## Puntos por acción

| Fuente (`source`) | Acción | Puntos | Regla |
|---|---|---|---|
| `REVIEW` | Reseña aprobada | +3 | Una vez por vino |
| `REVIEW_NOTE` | Reseña con comentario de 80 caracteres o más | +2 | Una vez por vino |
| `LIKE_RECEIVED` | Like recibido | +1 | Hasta 5 por día; los likes propios están permitidos y cuentan |
| `COMMENT` | Comentario en la reseña de otra persona | +1 | Hasta 3 por día |
| `WINE_APPROVED` | Propuesta de vino NUEVO aprobada | +8 | Fuera del tope diario |
| `SCAN_MATCH` | Escaneo de etiqueta con coincidencia exacta | +1 | Una vez por vino, hasta 3 por día; usa un registro nuevo de escaneos por persona, sin historial previo |
| `CELLAR_ADD` | Alta manual en la cava | +1 | Una vez por vino para siempre, hasta 3 por día; una entrada creada por una reseña da 0 |
| `EVENT_REGISTRATION` | Inscripción a un evento confirmada | +4 | Se revoca al cancelarse, rechazarse o vencer |
| `PROFILE_COMPLETE` | Perfil completo: foto, nombre, apellido y teléfono | +5 | Una vez |
| `FOLLOWER_GAINED` | Nuevo seguidor con email verificado y al menos una reseña aprobada | +1 | Una vez por seguidor (clave: el ID del seguidor), hasta 10 por día, dentro del tope global |

- **Tope global:** 40 puntos por día en la zona horaria de la persona (`users.timezone`); las propuestas de vino aprobadas quedan fuera.
- Dar likes no suma.
- **Idempotencia:** cada premio es único por (persona, fuente, clave de origen); las revocaciones también son idempotentes.

## Revocaciones y casos borde

| Caso | Regla |
|---|---|
| Borrar una reseña y volver a crearla | Neto cero: el borrado revoca y la nueva reseña vuelve a premiar con la misma clave |
| Moderación | Retirar un contenido quita solo los puntos de ese contenido; rechazar una reseña también revoca los likes que recibió |
| Reseña borrada con comentarios | Quienes comentaron conservan sus puntos |
| Cuenta de quien dio un like eliminada | No revoca el punto del like |
| Reseña rechazada o pendiente | No suma hasta aprobarse, likes incluidos; editarla de vuelta a `PENDING` revoca sus puntos y los de sus likes, y la aprobación vuelve a premiar la reseña, la nota y un punto por cada like actual con las mismas claves, de forma idempotente y dentro de los topes diarios de ese momento |
| Inscripción cancelada, rechazada o vencida | Revoca los 4 puntos |
| El seguidor deja de seguir, o un bloqueo termina el seguimiento | Revoca el punto de ese seguidor; volver a seguir el mismo día vuelve a contar para el límite de 10 por día |
| El seguidor cumple los requisitos después de seguir | No suma de forma retroactiva; solo premia un seguimiento hecho mientras los cumple |
| Cuenta bloqueada o inactiva | Oculta el sello (`badgeTier` es `null`) |
| Eliminación definitiva de la cuenta | Borra los puntos de esa persona |

## API

Aditiva: la app 0.2.0 sigue funcionando. Ambos endpoints están bajo la misma base y
autenticación que el resto de `/users/me`.

| Método | Ruta | Resultado |
|---|---|---|
| `GET` | `/users/me/points` | Puntos, nivel, progreso, tope diario, celebraciones pendientes y últimos movimientos |
| `POST` | `/users/me/points/celebrations` | `{ tier }` marca ese nivel (y los inferiores) como celebrado; `{ welcome: true }` descarta la tarjeta de bienvenida. Responde `204` |

Respuesta de `GET /users/me/points`:

| Campo | Contenido |
|---|---|
| `points` | Puntos actuales |
| `tier` | Clave del nivel actual |
| `nextTier`, `nextTierAt` | Siguiente nivel y su umbral; `null` en `VINNOT` |
| `tierFloor` | Umbral del nivel actual |
| `todayEarned`, `dailyCap` | Puntos sumados hoy y el tope diario (40) |
| `pendingCelebration` | El nivel más alto alcanzado y todavía no celebrado, o `null` |
| `showWelcome` | `true` mientras la tarjeta de bienvenida posterior al cálculo histórico no se descartó |
| `recent` | Últimos 20 movimientos `{ id, source, points, createdAt, label }`; las revocaciones son movimientos negativos y `label` es el nombre del vino o evento relacionado, o `null` |

Las fechas son instantes ISO-8601. Además:

- `badgeTier` (clave de nivel, puede ser `null`) se agrega a cada objeto de autor: listas de reseñas (`ReviewResponse.ReviewerInfo`, cargado en lote, nunca una consulta por reseña), comentarios de reseñas y reseñas de administración. Es `null` cuando la cuenta está bloqueada o inactiva.
- El listado de usuarios de administración suma `points` y `badgeTier`.
- Se quita `UserBadgeDto`, que no se usaba, de `users.dto.ts` en la web y en la app.

El catálogo completo está en la [referencia de la API](../../backend/architecture/api.md).

## Push

Tipo nuevo `TIER_REACHED` («Alcanzaste <nivel>»; en inglés «Reached <tier>»), con el
nombre del nivel en el idioma de la persona («Alcanzaste Parra», «Reached Vine Leaf»).
Lo gobierna la preferencia opcional de **Comunidad**, sale por la cola durable de
efectos una sola vez por nivel y persona, y nunca durante el cálculo histórico. Ver
[Notificaciones](../notifications/README.md).

## Datos y cálculo histórico (V70)

La migración de Flyway `V70` crea el almacenamiento de puntos: un registro de
movimientos por persona (fuente, clave de origen, puntos y fecha; las revocaciones son
movimientos negativos) y el estado de cada persona (nivel celebrado y tarjeta de
bienvenida):

| Tabla | Contenido |
|---|---|
| `user_points` | Una fila por persona que tuvo puntos: `points` (nunca negativo), nivel actual, nivel más alto alcanzado, nivel más alto celebrado y `welcome_seen` |
| `user_point_awards` | Cada premio, único por (`user_id`, `source`, `source_key`); un premio revocado queda con `active = false` para poder volver a otorgarse sin contar dos veces |
| `user_point_movements` | El historial que ve la persona; las revocaciones son filas negativas. Índice `(user_id, created_at DESC)` |
| `wine_label_scans` | Un registro por escaneo de una persona con sesión (`wine_id` con `ON DELETE SET NULL`, `outcome`); sin historial previo |

Todas tienen `user_id` con borrado en cascada, así que la eliminación definitiva de la cuenta borra sus puntos.

En la misma migración:

1. Calcula los puntos históricos a partir de los datos existentes, con las mismas fuentes, claves de origen y topes diarios, así una acción posterior sobre contenido viejo nunca premia dos veces.
2. No envía push.
3. Deja a cada persona con puntos en su nivel calculado, marcado como ya celebrado, y con la tarjeta de bienvenida pendiente en lugar de una celebración.
4. No calcula escaneos: el registro de escaneos por persona empieza vacío.
5. Cuenta cada día en la `users.timezone` de la persona cuando PostgreSQL la conoce (`pg_timezone_names`) y, si no, en `America/Argentina/Buenos_Aires`, la zona que usa el backend como respaldo.

V71 agrega la puntuación de la cava con un decimal (0.1–5.0) en una nueva columna
`rating_decimal` y conserva el entero `rating` 1–5 para la revisión anterior del
backend; ver [Cava](../cellar/README.md).

## Arquitectura

Sigue el flujo hexagonal del backend:

1. Los manejadores de comandos de reseñas, cava, propuestas de vino, escaneo, inscripciones y perfil llaman al puerto de entrada de gamificación para premiar o revocar, con la fuente y la clave de origen.
2. El caso de uso toma un bloqueo por persona, de modo que dos premios simultáneos no superen los topes, y aplica las reglas de dominio: valor por fuente, límite diario por fuente, tope global en la zona horaria de la persona e idempotencia por clave.
3. Los puertos de salida guardan el movimiento y el estado de la persona; los adaptadores de persistencia viven en infraestructura.
4. Si el nivel actual supera el más alto alcanzado, encola `TIER_REACHED` en la cola durable de efectos.
5. `GET /users/me/points` es una consulta que proyecta el estado y los últimos movimientos; las listas de reseñas obtienen `badgeTier` con una sola consulta por página.

## Interfaz

| Parte | Comportamiento |
|---|---|
| `UserBadge` | Arte del nivel con su animación, que crece con el nivel. En la app usa Skia con relojes de Reanimated; en la web, CSS (máscaras, modos de mezcla y propiedades personalizadas animadas). Las capas de luz se recortan con la forma del sello |
| Animación por nivel | Brote se mece; Parra se mece y respira; Racimo madura sus uvas de verde a morado con rocío; Vendimia tiene un destello en el cuchillo; Lagar, un barrido ocasional; Barrica, un barrido metálico; Crianza, brillo y halo color vino; Reserva, brillo y halo dorados; Gran Reserva, oro constante, rayos lentos y destellos; Gran Enófilo, cromo giratorio y chispas; Vinnot, lámina holográfica que sigue el dedo o el puntero, brillos y partículas que suben |
| En listas | Se anima una vez al aparecer y otra cada 8 a 16 segundos; sin destellos por debajo de 40 px |
| En el perfil | Animación continua |
| Movimiento reducido | Sello quieto con un reflejo fijo |
| Encabezado del perfil propio | Sello, puntos, nombre del nivel y barra de progreso al siguiente; al tocar el sello se abre «Tus puntos»: cómo sumar, últimos movimientos y la escalera completa |
| Junto al nombre | Listas de reseñas, reseñas propias, comentarios de reseñas y usuarios de administración. No en organizadores, bloqueos, denuncias ni push |
| Celebración | Revelación del sello a pantalla completa, una vez por nivel; después, `POST /users/me/points/celebrations` |
| Bienvenida | Tarjeta única tras el cálculo histórico; se descarta con `{ welcome: true }` |

La puntuación con copas y el control de la botella son parte de
[Reseñas](../reviews/README.md) y [Cava](../cellar/README.md).
