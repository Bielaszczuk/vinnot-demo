# Backend

API REST en Spring Boot: monolito modular con arquitectura hexagonal y CQRS lógico sobre PostgreSQL.

## Arquitectura

- [Visión general](architecture/overview.md)
- [Límites de módulos y dependencias](architecture/module-boundaries.md)
- [Catálogo y contratos API](architecture/api.md)
- [Autenticación e identidad](architecture/authentication-and-identity.md)
- [Seguridad y autorización](architecture/security-and-authorization.md)
- [Errores, transacciones y consistencia](architecture/errors-transactions-and-consistency.md)
- [Sesiones, publicación y efectos externos](architecture/session-and-data-integrity.md)
- [Notificaciones](../modules/notifications/architecture.md#backend) (en el capítulo del módulo)
- [Observabilidad](architecture/observability.md)
- [Protección de recursos y transportes externos](architecture/resource-protection.md)

## Datos y pruebas

- [Modelo de base de datos](data/database-model.md)
- [Rendimiento de consultas e índices](data/query-performance.md)
- [Estrategia de pruebas y cobertura](testing/strategy.md)

## Casos de uso

- [Escaneo backend de etiquetas](../modules/wines/architecture.md#reconocimiento-de-etiquetas) (en el capítulo del módulo)
- [Búsqueda y detalle de vinos](../modules/wines/architecture.md#búsqueda-y-detalle) (en el capítulo del módulo)
- [Gestión de vinos desde administración](../modules/admin/architecture.md#gestión-de-vinos) (en el capítulo del módulo)
- [Perfiles y comparaciones IA](../modules/ai/architecture.md#backend) (en el capítulo del módulo)
- [Submissions y moderación](../modules/wines/submissions.md) (en el capítulo del módulo)
- [Cava](../modules/cellar/architecture.md#backend) (en el capítulo del módulo)
- [Reseñas, comentarios y likes](../modules/reviews/architecture.md#backend) (en el capítulo del módulo)
- [Denuncias, bloqueo y revisión de comunidad](../modules/community/architecture.md#backend) (en el capítulo del módulo)
- [Eventos e inscripciones](../modules/events/architecture.md#backend) (en el capítulo del módulo)
- [Pagos](../modules/payments/architecture.md#backend) (en el capítulo del módulo)
- [Operación de partners y editor de eventos](../modules/partner/architecture.md#backend) (en el capítulo del módulo)
- [Bodegas y regiones](../modules/wineries/architecture.md#backend) (en el capítulo del módulo)
- [Rutas del vino](../modules/wine-routes/architecture.md#backend) (en el capítulo del módulo)
- [Administración y moderación](../modules/admin/architecture.md#backend) (en el capítulo del módulo)
- [Usuarios y cuenta](../modules/users/architecture.md#backend) (en el capítulo del módulo)
- [Uploads y datos de referencia](use-cases/uploads-and-reference-data.md)
- [Aceptación contractual, versiones y evidencia](../modules/legal/architecture.md#backend) (en el capítulo del módulo)
- [Consultas públicas y entrega de soporte](../modules/support/architecture.md#backend) (en el capítulo del módulo)
## Diagramas

- [Mapa del sistema](diagrams/system-map.md)
- [Modelo de dominio UML](diagrams/domain-class-model.md)
- [DER detallado por contexto](diagrams/relational-model.md)
- [DER y modelo relacional](data/database-model.md)
- [Lifecycle de requests](diagrams/request-lifecycle.md)
- [Máquinas de estado](diagrams/domain-state-machines.md)
- [Consistencia de datos](diagrams/data-consistency.md)

## Compartir

- [Compartir vinos, eventos y rutas](../modules/sharing/architecture.md#backend) (en el capítulo del módulo)
