# Auditoría de cobertura documental

## Resultado

La documentación canónica cubre las capas y módulos implementados: monolito
modular con arquitectura hexagonal por módulo y CQRS lógico sobre una única
PostgreSQL, persistencia y búsqueda, web, mobile, infraestructura low-cost,
seguridad, pruebas y operaciones. Esta matriz mide únicamente alcance y
profundidad documental; no funciona como roadmap ni registro de incidencias.

## Backend

| Área implementada | Documento principal | Cobertura |
|---|---|---|
| límites, puertos y CQRS | [Límites de módulos](../backend/architecture/module-boundaries.md) | profunda |
| API y errores | [Catálogo API](../backend/architecture/api.md), [consistencia](../backend/architecture/errors-transactions-and-consistency.md) | profunda |
| auth, sesiones y acciones | [Autenticación](../backend/architecture/authentication-and-identity.md) | profunda |
| RBAC, ownership y rate limits | [Seguridad](../backend/architecture/security-and-authorization.md) | profunda |
| límites de paginación y transportes externos | [Protección de recursos](../backend/architecture/resource-protection.md) | profunda |
| sesiones, publicación y efectos externos | [Integridad](../backend/architecture/session-and-data-integrity.md) | profunda |
| esquema/Flyway/relaciones | [Modelo de datos](../backend/data/database-model.md) | profunda |
| búsqueda/índices/timeouts | [Rendimiento](../backend/data/query-performance.md) | profunda |
| wine search/detail | [Búsqueda y detalle](../modules/wines/architecture.md) | cubierta; ampliar ejemplos si cambia ranking |
| scan/submissions | [Submissions](../modules/wines/submissions.md), [mobile scan](../modules/wines/architecture.md) | profunda |
| IA profile/compare | [IA](../modules/ai/architecture.md) | profunda |
| cellar | [Cava](../modules/cellar/architecture.md) | profunda |
| documentos y aceptación versionada | [Legal](../modules/legal/architecture.md) | profunda |
| soporte y entrega durable | [Soporte](../modules/support/architecture.md) | profunda |
| revisión previa, denuncias y bloqueo | [Comunidad](../modules/community/architecture.md) | profunda |
| reviews/comments/likes | [Reseñas](../modules/reviews/architecture.md) | profunda |
| events/registrations | [Eventos](../modules/events/README.md) | cubierta; estados detallados en diagramas |
| pagos (módulo `payment`): checkout, webhooks, conciliación y reembolsos | [Pagos](../modules/payments/README.md) | cubierta en su capítulo de módulo |
| enlaces públicos (módulo `sharing`) | [Compartir](../modules/sharing/architecture.md#backend), [activación](../infra/guides/public-sharing.md) | profunda |
| wineries/regions | [Bodegas y regiones](../modules/wineries/architecture.md) | profunda |
| wine routes | [Rutas](../modules/wine-routes/architecture.md) | profunda |
| administración | [Administración y moderación](../modules/admin/architecture.md#backend) | profunda |
| catálogo de vinos admin | [Gestión de vinos](../modules/admin/architecture.md#gestión-de-vinos) | profunda |
| profile/account | [Perfil y cuenta](../modules/users/architecture.md) | profunda |
| uploads/reference data | [Uploads y referencias](../backend/use-cases/uploads-and-reference-data.md) | profunda |
| logging/metrics/health | [Observabilidad](../backend/architecture/observability.md) | profunda |
| tests/coverage | [Testing](../backend/testing/strategy.md) | profunda |

## Clientes

El inventario distingue cobertura documental de cobertura automatizada y no
certifica aceptación productiva. Cada fila enlaza el comportamiento específico
de la plataforma, con contratos y evidencia de código.

| Área | Web | Mobile |
|---|---|---|
| Capas y composición | [Web](../frontend-web/architecture/overview.md) | [Mobile](../frontend-mobile/architecture/overview.md) |
| Navegación y acceso | [Web](../frontend-web/architecture/navigation-and-state.md) | [Mobile](../frontend-mobile/architecture/navigation-and-state.md) |
| Estado remoto e invalidación | [Web](../frontend-web/architecture/remote-state-and-transport.md) | [Mobile](../frontend-mobile/architecture/remote-state-and-transport.md) |
| Plataforma, idioma y persistencia | [Web](../frontend-web/architecture/platform-and-localization.md) | [Mobile](../frontend-mobile/architecture/platform-and-localization.md) |
| Autenticación y cuenta | [Web](../modules/users/architecture.md) | [Mobile](../modules/users/architecture.md) |
| Catálogo y detalle | [Web](../modules/wines/architecture.md) | [Mobile](../modules/wines/architecture.md) |
| Perfiles y comparaciones | [Web](../modules/ai/architecture.md) | [Mobile](../modules/ai/architecture.md) |
| Cava | [Web](../modules/cellar/architecture.md#web) | [Mobile](../modules/cellar/architecture.md#app) |
| Gestión de eventos del organizador | [Web](../modules/partner/architecture.md#web) | [Mobile](../modules/partner/architecture.md#app) |
| Administración y moderación | [Web](../modules/admin/architecture.md#web) | [Mobile](../modules/admin/architecture.md#app) |
| Secuencias funcionales | [Web](../frontend-web/diagrams/product-processes.md) | [Mobile](../frontend-mobile/diagrams/product-processes.md) |
| Pruebas y alcance de cobertura | [Web](../frontend-web/testing/strategy.md) | [Mobile](../frontend-mobile/testing/strategy.md) |

El escaneo es exclusivo de mobile:

- [Captura, OCR y resultado](../modules/wines/architecture.md)
- [Diagramas de escaneo](../frontend-mobile/diagrams/wine-label-scan.md)
- [Lifecycle, cancelación y recuperación](../frontend-mobile/diagrams/scan-lifecycle.md)

En web, scan es una invitación a descargar la aplicación; la moderación de
submissions sí tiene panel web. Los índices ES/EN enumeran todos los documentos
y diagramas, sin deducir cobertura por cantidad de archivos.

## Infraestructura

| Área | Documento | Cobertura documental |
|---|---|---|
| topología AWS low-cost | [arquitectura](../infra/architecture/aws-deployment.md) | profunda |
| env/secrets | [entornos y secretos](../infra/architecture/environments-and-secrets.md) | profunda |
| deployment | [guía](../infra/guides/deployment.md), [CI/CD](../infra/guides/ci-cd.md) | profunda |
| activación de enlaces públicos | [compartir públicamente](../infra/guides/public-sharing.md) | profunda |
| start/stop/costo | [bajo costo](../infra/operations/low-cost-dev.md), [pausa](../infra/operations/pause-and-recovery.md) | profunda |
| backup/restore | [DR](../infra/operations/backup-and-disaster-recovery.md) | profunda |
| incidentes/señales | [observabilidad infra](../infra/operations/observability-and-incidents.md) | profunda |

## Storage y contenido del repositorio

La cobertura incluye la migración V27 (almacenamiento administrado de imágenes) y las portadas administradas en el modelo/API, el
[contrato de uploads](../backend/use-cases/uploads-and-reference-data.md),
[catálogo R2](../infra/operations/catalog-images-r2.md),
[uploads R2](../infra/operations/user-images-r2.md) y
[contenido versionado/privado](repository-hygiene.md). Esta matriz no certifica
que un entorno remoto coincida con la punta de Git.

## Criterio de cierre documental

Una capacidad documentada debe tener espejo ES/EN, evidencia en código y
diagramas sólo donde reduzcan ambigüedad. Incidencias, deuda técnica y planes de
mejora se mantienen en los planes locales ignorados por Git.
`planning/LOCAL_PLANNING.md` es el índice que señala el plan responsable de cada
pendiente; no duplica sus registros ni forma parte de la documentación canónica.
