# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-REV-01` | Consultar reseñas por vino y orden. | Se pagina por recientes/populares y se muestra autor, rating, texto, fecha y contadores disponibles. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | `RF-WEB-REVIEW-001` |
| `RF-WEB-REV-02` | Mantener visibilidad por publicación y bloqueo. | Pendientes/rechazados se exponen sólo a actores autorizados; exclusión por bloqueo no se convierte en ausencia global de reseñas. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | `RF-WEB-REVIEW-010` |
| `RF-WEB-REV-03` | Crear una reseña con valoración. | Una reseña por vino/usuario; UI elige 0.1–5.0 con el control de la botella y API admite 0.1–5.0 con un decimal; título y comentario son opcionales en el contrato de creación. | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | `RF-WEB-REVIEW-002` |
| `RF-WEB-REV-04` | Publicar nuevas reseñas y ediciones directamente. | Crear la publica como APPROVED; editar mantiene publicada una reseña aprobada y devuelve a PENDING una pendiente o rechazada; el promedio del vino se recalcula. | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | `RF-WEB-REVIEW-003` |
| `RF-WEB-REV-05` | Editar la reseña autorizada. | Autor o ADMIN puede editar; MODERATOR no adquiere permiso para reescribir contenido ajeno por moderarlo. | [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | `RF-WEB-REVIEW-004` |
| `RF-WEB-REV-06` | Eliminar reseña autorizada y actualizar agregados. | Autor o permiso REVIEW_DELETE permite retirar; rating/count se recalculan y bodega permanece independiente. | [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | `RF-WEB-REVIEW-005` |
| `RF-WEB-REV-07` | Marcar o desmarcar like. | Un usuario aporta como máximo un like por reseña; interacción bloqueada/invisible no se permite. | [`UC-REV-05`](use-cases/uc-rev-05-like-review.md) | `RF-WEB-REVIEW-006` |
| `RF-WEB-REV-08` | Abrir comentarios de una reseña. | Consulta por reviewId; distingue contenido visible, vacío y fallo; el autor también ve sus comentarios pendientes o rechazados anteriores. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-WEB-REVIEW-007` |
| `RF-WEB-REV-09` | Publicar un comentario. | Texto recortado entre 1 y 2000 caracteres se publica al instante como APPROVED; el mensaje de éxito confirma la publicación. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-WEB-REVIEW-008` |
| `RF-WEB-REV-10` | Eliminar comentario propio o con permiso de moderación. | Se verifica commentId, autoría y permiso; no habilita editar cualquier comentario ajeno. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-WEB-REVIEW-009` |
| `RF-WEB-REV-11` | Identificar al autor de cada reseña. | Cada reseña muestra la foto del autor (o un reemplazo si falta o no carga), su nombre con el sello y su `@usuario` debajo, más chico y en gris; sin usuario no se muestra la línea; foto y nombre abren su perfil público. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | — |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-REV-01` | Consultar reseñas por vino y orden. | Se pagina por recientes/populares y se muestra autor, rating, texto, fecha y contadores disponibles. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | `RF-APK-REVIEW-001` |
| `RF-APK-REV-02` | Mantener visibilidad por publicación y bloqueo. | Pendientes/rechazados se exponen sólo a actores autorizados; exclusión por bloqueo no se convierte en ausencia global de reseñas. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | `RF-APK-REVIEW-010` |
| `RF-APK-REV-03` | Crear una reseña con valoración. | Una reseña por vino/usuario; UI elige 0.1–5.0 con el control de la botella y API admite 0.1–5.0 con un decimal; título y comentario son opcionales en el contrato de creación. | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | `RF-APK-REVIEW-002` |
| `RF-APK-REV-04` | Publicar nuevas reseñas y ediciones directamente. | Crear la publica como APPROVED; editar mantiene publicada una reseña aprobada y devuelve a PENDING una pendiente o rechazada; el promedio del vino se recalcula. | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | `RF-APK-REVIEW-003` |
| `RF-APK-REV-05` | Editar la reseña autorizada. | Autor o ADMIN puede editar; MODERATOR no adquiere permiso para reescribir contenido ajeno por moderarlo. | [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | `RF-APK-REVIEW-004` |
| `RF-APK-REV-06` | Eliminar reseña autorizada y actualizar agregados. | Autor o permiso REVIEW_DELETE permite retirar; rating/count se recalculan y bodega permanece independiente. | [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | `RF-APK-REVIEW-005` |
| `RF-APK-REV-07` | Marcar o desmarcar like. | Un usuario aporta como máximo un like por reseña; interacción bloqueada/invisible no se permite. | [`UC-REV-05`](use-cases/uc-rev-05-like-review.md) | `RF-APK-REVIEW-006` |
| `RF-APK-REV-08` | Abrir comentarios de una reseña. | Consulta por reviewId; distingue contenido visible, vacío y fallo; el autor también ve sus comentarios pendientes o rechazados anteriores. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-APK-REVIEW-007` |
| `RF-APK-REV-09` | Publicar un comentario. | Texto recortado entre 1 y 2000 caracteres se publica al instante como APPROVED; el mensaje de éxito confirma la publicación. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-APK-REVIEW-008` |
| `RF-APK-REV-10` | Eliminar comentario propio o con permiso de moderación. | Se verifica commentId, autoría y permiso; no habilita editar cualquier comentario ajeno. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-APK-REVIEW-009` |
| `RF-APK-REV-11` | Identificar al autor de cada reseña. | Cada reseña muestra la foto del autor (o un reemplazo si falta o no carga), su nombre con el sello y su `@usuario` debajo, más chico y en gris; sin usuario no se muestra la línea; foto y nombre abren su perfil público. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | — |
