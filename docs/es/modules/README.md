# Módulos

Cada módulo del producto es un capítulo completo: qué hace, casos de uso,
requisitos, arquitectura, diagramas, pruebas y trazabilidad. El backend organiza
el código con los mismos límites (`backend/src/main/java/com/vinnot/<módulo>`).

| Módulo | Código | Qué cubre |
|---|---|---|
| [Usuarios y cuenta](users/README.md) | `USR` | Registro, inicio de sesión con email y redes sociales, verificación, perfil, privacidad, reautenticación y ciclo de vida de la cuenta. |
| [Legal](legal/README.md) | `LEG` | Centro legal, términos de uso versionados, su aceptación y la evidencia que se guarda de cada una. |
| [Vinos](wines/README.md) | `WIN` | Catálogo, búsqueda y detalle de vinos, envíos de vinos por usuarios con su revisión, cepas y escaneo de etiquetas en la app. |
| [Bodegas y regiones](wineries/README.md) | `WRY` | Bodegas con su detalle, mapa, contacto y vinos, y las regiones vitivinícolas. |
| [Reseñas](reviews/README.md) | `REV` | Reseñas de vinos, comentarios y likes. |
| [Cava](cellar/README.md) | `CEL` | Cava personal: los vinos que guarda cada usuario. |
| [Comunidad](community/README.md) | `COM` | Denuncias de contenido, bloqueos entre usuarios y la actividad de comunidad de cada persona. |
| [Eventos y entradas](events/README.md) | `EVT` | Descubrimiento de eventos, inscripciones, entradas y eventos cerca del usuario. |
| [Pagos](payments/README.md) | `PAY` | Cobro de inscripciones con Mercado Pago, cuentas de cobro de organizadores y reembolsos. |
| [Rutas del vino](wine-routes/README.md) | `RTE` | Rutas del vino con sus paradas y mapa. |
| [Compartir](sharing/README.md) | `SHR` | Enlaces públicos para compartir vinos, eventos y rutas, y su apertura en la app. |
| [Notificaciones](notifications/README.md) | `NOT` | Notificaciones push y por email, preferencias del usuario y anuncios enviados por administración. |
| [Actividad](activity/README.md) | `ACT` | Señales de interacción (detalles abiertos, aperturas de la app y de push) que personalizan sugerencias y horarios de envío. |
| [Puntos y sellos](gamification/README.md) | `GAM` | Puntos por la actividad real, topes diarios, sellos de lacre por nivel, celebraciones y el aviso `TIER_REACHED`. |
| [Perfiles y comparaciones IA](ai/README.md) | `AI` | Perfiles de vino generados con IA y comparaciones entre vinos. |
| [Marketing en redes](marketing/README.md) | `MKT` | Calendario de días del vino, planificador semanal de publicaciones, redacción con IA en español e inglés, ilustración y placas para Instagram y TikTok por idioma y cola de aprobación para redes sociales. |
| [Soporte e información pública](support/README.md) | `SUP` | Contacto, centro de ayuda y páginas públicas de información. |
| [Partners](partner/README.md) | `PAR` | Organizadores que publican y gestionan sus propios eventos e inscripciones. |
| [Administración y moderación](admin/README.md) | `ADM` | Panel del equipo: gestión del catálogo, moderación, usuarios, anuncios, control de push y resumen de trabajo para el equipo de moderación. |

## Identificadores

| Elemento | Formato | Ejemplo |
|---|---|---|
| Caso de uso | `UC-<código>-NN`, uno por caso, compartido entre web y APK | `UC-WIN-01` |
| Requisito funcional web | `RF-WEB-<código>-NN` | `RF-WEB-WIN-01` |
| Requisito funcional APK | `RF-APK-<código>-NN` | `RF-APK-WIN-01` |
| Caso de prueba | `CP-<código>-NN` | `CP-WIN-01` |

«APK» designa la app móvil, que es la misma para iOS y Android. Los IDs existentes conservan
ese nombre, que viene del entregable original y de Lucidchart; el contenido nuevo usa «app».

Cada caso de uso indica en qué plataformas aplica y su ID anterior en Lucidchart
(`WEB UC-…`, `APK UC-…`).

## Trazabilidad

La [matriz de trazabilidad global](traceability.md) une cada caso de uso de todos los
módulos con sus requisitos, casos de prueba y tests automáticos.
