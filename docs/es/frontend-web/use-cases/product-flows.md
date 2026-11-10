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
