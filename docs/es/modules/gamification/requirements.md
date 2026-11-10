# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. Son requisitos nuevos, sin un identificador anterior en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso |
|---|---|---|---|
| `RF-WEB-GAM-01` | Sumar puntos por la actividad real. | Cada fuente da sus puntos: reseña aprobada 3, comentario de 80 caracteres o más 2, like recibido 1, comentario en una reseña ajena 1, vino nuevo aprobado 8, escaneo con coincidencia exacta 1, alta manual en la cava 1, inscripción confirmada 4 y perfil completo 5; una sola vez por persona, fuente y clave de origen. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-WEB-GAM-02` | Aplicar los límites diarios y el tope global. | Por día: 5 likes, 3 comentarios, 3 escaneos y 3 altas en la cava; tope global de 40 en la zona horaria de la persona, sin contar los vinos aprobados; dos premios simultáneos nunca lo superan. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-WEB-GAM-03` | Revocar los puntos del contenido retirado. | Borrar, retirar o devolver a pendiente quita exactamente lo otorgado, likes recibidos incluidos; los puntos nunca bajan de cero; volver a crear o aprobar premia otra vez con la misma clave. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-WEB-GAM-04` | Consultar puntos, nivel y movimientos. | Se muestran los puntos, el sello y el nombre del nivel, el progreso al siguiente, los sumados hoy con el tope, cómo sumar, los últimos 20 movimientos con signo y la escalera completa; un fallo ofrece reintentar. | [`UC-GAM-02`](use-cases/uc-gam-02-view-my-points.md) |
| `RF-WEB-GAM-05` | Celebrar cada nivel nuevo una sola vez. | Al alcanzar un nivel por primera vez se muestra la revelación del sello; al continuar ese nivel y los inferiores quedan celebrados; bajar y volver a subir no repite la celebración. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |
| `RF-WEB-GAM-06` | Mostrar y descartar la bienvenida. | Tras el cálculo histórico, la tarjeta de bienvenida aparece una sola vez y descartarla vale para todos los dispositivos. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |
| `RF-WEB-GAM-07` | Mostrar el sello junto al nombre. | Listas de reseñas, reseñas propias, comentarios y usuarios de administración muestran el sello del autor; una cuenta bloqueada o inactiva, o un nivel desconocido, no muestra sello. | [`UC-GAM-04`](use-cases/uc-gam-04-seal-next-to-name.md) |
| `RF-WEB-GAM-08` | Animar el sello sin distraer. | En listas se anima una vez al aparecer y otra cada 8 a 16 segundos; en el perfil, de forma continua; sin destellos por debajo de 40 px; con movimiento reducido queda quieto con un reflejo fijo. | [`UC-GAM-04`](use-cases/uc-gam-04-seal-next-to-name.md) |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso |
|---|---|---|---|
| `RF-APK-GAM-01` | Sumar puntos por la actividad real. | Cada fuente da sus puntos: reseña aprobada 3, comentario de 80 caracteres o más 2, like recibido 1, comentario en una reseña ajena 1, vino nuevo aprobado 8, escaneo con coincidencia exacta 1, alta manual en la cava 1, inscripción confirmada 4 y perfil completo 5; una sola vez por persona, fuente y clave de origen. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-APK-GAM-02` | Aplicar los límites diarios y el tope global. | Por día: 5 likes, 3 comentarios, 3 escaneos y 3 altas en la cava; tope global de 40 en la zona horaria de la persona, sin contar los vinos aprobados; dos premios simultáneos nunca lo superan. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-APK-GAM-03` | Revocar los puntos del contenido retirado. | Borrar, retirar o devolver a pendiente quita exactamente lo otorgado, likes recibidos incluidos; los puntos nunca bajan de cero; volver a crear o aprobar premia otra vez con la misma clave. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-APK-GAM-04` | Consultar puntos, nivel y movimientos. | Se muestran los puntos, el sello y el nombre del nivel, el progreso al siguiente, los sumados hoy con el tope, cómo sumar, los últimos 20 movimientos con signo y la escalera completa; un fallo ofrece reintentar. | [`UC-GAM-02`](use-cases/uc-gam-02-view-my-points.md) |
| `RF-APK-GAM-05` | Celebrar cada nivel nuevo una sola vez. | Al alcanzar un nivel por primera vez se muestra la revelación del sello; al continuar ese nivel y los inferiores quedan celebrados; bajar y volver a subir no repite la celebración. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |
| `RF-APK-GAM-06` | Mostrar y descartar la bienvenida. | Tras el cálculo histórico, la tarjeta de bienvenida aparece una sola vez y descartarla vale para todos los dispositivos. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |
| `RF-APK-GAM-07` | Mostrar el sello junto al nombre. | Listas de reseñas, reseñas propias, comentarios y usuarios de administración muestran el sello del autor; una cuenta bloqueada o inactiva, o un nivel desconocido, no muestra sello. | [`UC-GAM-04`](use-cases/uc-gam-04-seal-next-to-name.md) |
| `RF-APK-GAM-08` | Animar el sello sin distraer. | En listas se anima una vez al aparecer y otra cada 8 a 16 segundos; en el perfil, de forma continua; sin destellos por debajo de 40 px; con movimiento reducido queda quieto con un reflejo fijo. | [`UC-GAM-04`](use-cases/uc-gam-04-seal-next-to-name.md) |
| `RF-APK-GAM-09` | Recibir el aviso push de nivel alcanzado. | `TIER_REACHED` llega una sola vez por persona y nivel, con el nombre del nivel en su idioma, solo si la preferencia de Comunidad está activa, y nunca durante el cálculo histórico. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |
