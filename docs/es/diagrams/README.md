# Diagramas

Los diagramas viven en la página que los explica. Este catálogo los lista por tipo, con la
sección donde está cada uno. Los diagramas de las páginas se dibujan con Mermaid; los de
componentes por caso de uso están en Lucidchart.

## Casos de uso

| Diagrama | Página |
|---|---|
| Actividad | [Actividad · Casos de uso](../modules/activity/use-cases/README.md) |
| Administración y moderación | [Administración y moderación · Casos de uso](../modules/admin/use-cases/README.md) |
| Perfiles y comparaciones IA | [Perfiles y comparaciones IA · Casos de uso](../modules/ai/use-cases/README.md) |
| Cava | [Cava · Casos de uso](../modules/cellar/use-cases/README.md) |
| Comunidad | [Comunidad · Casos de uso](../modules/community/use-cases/README.md) |
| Eventos y entradas | [Eventos y entradas · Casos de uso](../modules/events/use-cases/README.md) |
| Puntos y sellos | [Puntos y sellos · Casos de uso](../modules/gamification/use-cases/README.md) |
| Legal | [Legal · Casos de uso](../modules/legal/use-cases/README.md) |
| Marketing en redes | [Marketing en redes · Casos de uso](../modules/marketing/use-cases/README.md) |
| Notificaciones | [Notificaciones · Casos de uso](../modules/notifications/use-cases/README.md) |
| Partners | [Partners · Casos de uso](../modules/partner/use-cases/README.md) |
| Pagos | [Pagos · Casos de uso](../modules/payments/use-cases/README.md) |
| Reseñas · Lectores y autores | [Reseñas · Casos de uso](../modules/reviews/use-cases/README.md) |
| Reseñas · Moderación | [Reseñas · Casos de uso](../modules/reviews/use-cases/README.md) |
| Reseñas · Avisos de actividad | [Reseñas · Casos de uso](../modules/reviews/use-cases/README.md) |
| Compartir | [Compartir · Casos de uso](../modules/sharing/use-cases/README.md) |
| Soporte e información pública | [Soporte e información pública · Casos de uso](../modules/support/use-cases/README.md) |
| Usuarios y cuenta · Registro e ingreso | [Usuarios y cuenta · Casos de uso](../modules/users/use-cases/README.md) |
| Usuarios y cuenta · Sesión | [Usuarios y cuenta · Casos de uso](../modules/users/use-cases/README.md) |
| Usuarios y cuenta · Perfil y cuenta | [Usuarios y cuenta · Casos de uso](../modules/users/use-cases/README.md) |
| Usuarios y cuenta · Navegación | [Usuarios y cuenta · Casos de uso](../modules/users/use-cases/README.md) |
| Rutas del vino | [Rutas del vino · Casos de uso](../modules/wine-routes/use-cases/README.md) |
| Bodegas y regiones | [Bodegas y regiones · Casos de uso](../modules/wineries/use-cases/README.md) |
| Vinos | [Vinos · Casos de uso](../modules/wines/use-cases/README.md) |

## Secuencia

Cada caso de uso tiene su diagrama de secuencia en su página. Por módulo:

- [Actividad](../modules/activity/use-cases/README.md): 3 casos de uso
- [Administración y moderación](../modules/admin/use-cases/README.md): 15 casos de uso
- [Perfiles y comparaciones IA](../modules/ai/use-cases/README.md): 4 casos de uso
- [Cava](../modules/cellar/use-cases/README.md): 6 casos de uso
- [Comunidad](../modules/community/use-cases/README.md): 13 casos de uso
- [Eventos y entradas](../modules/events/use-cases/README.md): 9 casos de uso
- [Puntos y sellos](../modules/gamification/use-cases/README.md): 4 casos de uso
- [Legal](../modules/legal/use-cases/README.md): 8 casos de uso
- [Marketing en redes](../modules/marketing/use-cases/README.md): 12 casos de uso
- [Notificaciones](../modules/notifications/use-cases/README.md): 7 casos de uso
- [Partners](../modules/partner/use-cases/README.md): 6 casos de uso
- [Pagos](../modules/payments/use-cases/README.md): 6 casos de uso
- [Reseñas](../modules/reviews/use-cases/README.md): 7 casos de uso
- [Compartir](../modules/sharing/use-cases/README.md): 3 casos de uso
- [Soporte e información pública](../modules/support/use-cases/README.md): 3 casos de uso
- [Usuarios y cuenta](../modules/users/use-cases/README.md): 23 casos de uso
- [Rutas del vino](../modules/wine-routes/use-cases/README.md): 4 casos de uso
- [Bodegas y regiones](../modules/wineries/use-cases/README.md): 3 casos de uso
- [Vinos](../modules/wines/use-cases/README.md): 9 casos de uso

| Diagrama | Página |
|---|---|
| Recorrido de una petición | [Arquitectura del sistema](../architecture/README.md) |
| Confirmación reciente del administrador | [Autenticación, identidad y ciclo de cuenta](../backend/architecture/authentication-and-identity.md) |
| Registro con credenciales | [Autenticación, identidad y ciclo de cuenta](../backend/architecture/authentication-and-identity.md) |
| Renovación, rotación y logout | [Autenticación, identidad y ciclo de cuenta](../backend/architecture/authentication-and-identity.md) |
| Frontera HTTP | [Errores, transacciones y consistencia](../backend/architecture/errors-transactions-and-consistency.md) |
| Contratos entre módulos | [Límites modulares y dependencias del backend](../backend/architecture/module-boundaries.md) |
| Correlación HTTP | [Observabilidad del backend](../backend/architecture/observability.md) |
| Flujo de lectura representativo | [Arquitectura del backend](../backend/architecture/overview.md) |
| Flujo de escritura representativo | [Arquitectura del backend](../backend/architecture/overview.md) |
| Admisión, presupuesto y transporte IA | [Protección de recursos y transportes externos](../backend/architecture/resource-protection.md) |
| Sesiones versionadas | [Sesiones, publicación y efectos externos](../backend/architecture/session-and-data-integrity.md) |
| Publicación de perfiles y comparaciones | [Sesiones, publicación y efectos externos](../backend/architecture/session-and-data-integrity.md) |
| wine_catalog_search | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Capacidad de eventos bajo concurrencia | [Datos, locks y consistencia](../backend/diagrams/data-consistency.md) |
| Coordinación de identidad de submissions | [Datos, locks y consistencia](../backend/diagrams/data-consistency.md) |
| DB versus storage | [Datos, locks y consistencia](../backend/diagrams/data-consistency.md) |
| Lectura pública paginada | [Ciclo de vida de requests y casos de uso](../backend/diagrams/request-lifecycle.md) |
| Command transaccional | [Ciclo de vida de requests y casos de uso](../backend/diagrams/request-lifecycle.md) |
| Multipart de escaneo | [Ciclo de vida de requests y casos de uso](../backend/diagrams/request-lifecycle.md) |
| Generación cacheada distribuida | [Ciclo de vida de requests y casos de uso](../backend/diagrams/request-lifecycle.md) |
| Pipeline HTTP transversal | [Mapas del sistema backend](../backend/diagrams/system-map.md) |
| Catálogos de referencia | [Archivos públicos, cuarentena y datos de referencia](../backend/use-cases/uploads-and-reference-data.md) |
| Flujo del dinero de una venta | [Monetización y planes](../business/monetization.md) |
| Flujo de compra de la suscripción | [Monetización y planes](../business/monetization.md) |
| Arranque y restauración | [Navegación, sesión y estado mobile](../frontend-mobile/architecture/navigation-and-state.md) |
| Secuencia de lectura y escritura | [Estado remoto, operaciones y transporte mobile](../frontend-mobile/architecture/remote-state-and-transport.md) |
| Refresh concurrente | [Mapas de la aplicación mobile](../frontend-mobile/diagrams/application-map.md) |
| Reset de tab versus back contextual | [Diagramas de navegación y sesión mobile](../frontend-mobile/diagrams/navigation-and-session.md) |
| Login social | [Secuencias y estados de producto mobile](../frontend-mobile/diagrams/product-processes.md) |
| Perfil IA y representacion localizada | [Secuencias y estados de producto mobile](../frontend-mobile/diagrams/product-processes.md) |
| Cava o reseña: escritura y cache | [Secuencias y estados de producto mobile](../frontend-mobile/diagrams/product-processes.md) |
| Secuencia de cancelación | [Captura, cancelación y recuperación del escáner](../frontend-mobile/diagrams/scan-lifecycle.md) |
| Interaccion tecnica | [Diagramas del escaneo exclusivo mobile](../frontend-mobile/diagrams/wine-label-scan.md) |
| Mutaciones e invalidación | [Estado remoto y transporte web](../frontend-web/architecture/remote-state-and-transport.md) |
| Sesión concurrente | [Mapas de la aplicación web](../frontend-web/diagrams/application-map.md) |
| Mutación e invalidación | [Mapas de la aplicación web](../frontend-web/diagrams/application-map.md) |
| Login social | [Secuencias y estados de producto web](../frontend-web/diagrams/product-processes.md) |
| Perfil IA y representacion localizada | [Secuencias y estados de producto web](../frontend-web/diagrams/product-processes.md) |
| Cava o reseña: escritura y cache | [Secuencias y estados de producto web](../frontend-web/diagrams/product-processes.md) |
| Ownership partner | [Diagramas de routing y acceso web](../frontend-web/diagrams/routing-and-access.md) |
| Restauración con cookie y aislamiento de pestañas | [Diagramas de server state y HTTP web](../frontend-web/diagrams/server-state-and-http.md) |
| Cambio de identidad | [Diagramas de server state y HTTP web](../frontend-web/diagrams/server-state-and-http.md) |
| Migraciones fuera del runtime | [Arquitectura de despliegue AWS](../infra/architecture/aws-deployment.md) |
| Flujo runtime | [Entornos, configuración y secretos](../infra/architecture/environments-and-secrets.md) |
| Backend development deploy | [Diagramas de CI/CD](../infra/diagrams/ci-cd-pipeline.md) |
| Subida y referencia de portada | [Imágenes de usuarios: WebP y R2](../infra/operations/user-images-r2.md) |
| Alta: secuencia y validaciones | [Administración y moderación · Arquitectura](../modules/admin/architecture.md) |
| Edición segura y actualización de vistas | [Administración y moderación · Arquitectura](../modules/admin/architecture.md) |
| Edición segura y actualización de vistas | [Administración y moderación · Arquitectura](../modules/admin/architecture.md) |
| Ensure versus regeneración forzada | [Perfiles y comparaciones IA · Arquitectura](../modules/ai/architecture.md) |
| Alta | [Cava · Arquitectura](../modules/cellar/architecture.md) |
| Algoritmo de discovery | [Eventos y entradas · Arquitectura](../modules/events/architecture.md) |
| Flujo de aceptación | [Legal · Arquitectura](../modules/legal/architecture.md) |
| Publicación en las redes | [Marketing en redes · Arquitectura](../modules/marketing/architecture.md) |
| Cuentas y OAuth | [Marketing en redes · Arquitectura](../modules/marketing/architecture.md) |
| Crear y propagar métricas | [Reseñas · Arquitectura](../modules/reviews/architecture.md) |
| Secuencia | [Soporte e información pública · Arquitectura](../modules/support/architecture.md) |
| Actualización de perfil | [Usuarios y cuenta · Arquitectura](../modules/users/architecture.md) |
| Búsqueda y detalle | [Bodegas y regiones · Arquitectura](../modules/wineries/architecture.md) |
| Flujo de búsqueda | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Recuperación del catálogo y alias | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Publicación segura de una imagen faltante | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Ingreso end-to-end | [Vinos · Vinos propuestos: envío, moderación y publicación](../modules/wines/submissions.md) |
| Inicio de sesión | [Contraseñas y autenticación](../security/passwords-and-authentication.md) |
| Rotación del refresh token | [Contraseñas y autenticación](../security/passwords-and-authentication.md) |
| Reautenticación step-up | [Contraseñas y autenticación](../security/passwords-and-authentication.md) |

## Actividad

| Diagrama | Página |
|---|---|
| Diagrama de actividad: inscripción y cancelación | [Eventos y entradas · Arquitectura](../modules/events/architecture.md) |
| Diagrama de actividad: cobro y devolución | [Pagos · Arquitectura](../modules/payments/architecture.md) |
| Diagrama de actividad: registro, verificación e ingreso | [Usuarios y cuenta · Arquitectura](../modules/users/architecture.md) |
| Diagrama de actividad: escaneo de etiquetas | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Diagrama de actividad: de la propuesta a la publicación | [Vinos · Vinos propuestos: envío, moderación y publicación](../modules/wines/submissions.md) |

## Flujos y arquitectura

| Diagrama | Página |
|---|---|
| Mapa del sistema | [Arquitectura del sistema](../architecture/README.md) |
| Propósito y alcance | [Autenticación, identidad y ciclo de cuenta](../backend/architecture/authentication-and-identity.md) |
| Login social | [Autenticación, identidad y ciclo de cuenta](../backend/architecture/authentication-and-identity.md) |
| Topología de dependencias | [Límites modulares y dependencias del backend](../backend/architecture/module-boundaries.md) |
| Clasificación arquitectónica exacta | [Arquitectura del backend](../backend/architecture/overview.md) |
| Hexágono por módulo | [Arquitectura del backend](../backend/architecture/overview.md) |
| CQRS lógico | [Arquitectura del backend](../backend/architecture/overview.md) |
| Distribución de responsabilidades | [Protección de recursos y transportes externos](../backend/architecture/resource-protection.md) |
| Pipeline HTTP real | [Seguridad, autorización y protección de abuso](../backend/architecture/security-and-authorization.md) |
| Roles, permisos y propiedad | [Seguridad, autorización y protección de abuso](../backend/architecture/security-and-authorization.md) |
| Outbox de efectos externos | [Sesiones, publicación y efectos externos](../backend/architecture/session-and-data-integrity.md) |
| roles, permissions, user_roles, role_permissions | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Pipeline de búsqueda del catálogo | [Rendimiento de consultas e indexación](../backend/data/query-performance.md) |
| Consultas y pesos | [Rendimiento de consultas e indexación](../backend/data/query-performance.md) |
| Límites transaccionales | [Datos, locks y consistencia](../backend/diagrams/data-consistency.md) |
| Single-flight de IA | [Datos, locks y consistencia](../backend/diagrams/data-consistency.md) |
| Sesiones y tokens | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Cuenta: ejes independientes | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Error estable | [Ciclo de vida de requests y casos de uso](../backend/diagrams/request-lifecycle.md) |
| Contexto del producto | [Mapas del sistema backend](../backend/diagrams/system-map.md) |
| Contenedores lógicos | [Mapas del sistema backend](../backend/diagrams/system-map.md) |
| Módulos de dominio | [Mapas del sistema backend](../backend/diagrams/system-map.md) |
| Fachadas y adaptadores | [Mapas del sistema backend](../backend/diagrams/system-map.md) |
| Corte hexagonal de un módulo | [Mapas del sistema backend](../backend/diagrams/system-map.md) |
| Separación CQRS lógica sobre una única base | [Mapas del sistema backend](../backend/diagrams/system-map.md) |
| Persistencia y efectos externos | [Mapas del sistema backend](../backend/diagrams/system-map.md) |
| Pirámide y responsabilidades | [Estrategia integral de pruebas](../backend/testing/strategy.md) |
| Arquitectura espejo de tests | [Estrategia integral de pruebas](../backend/testing/strategy.md) |
| CI y orden de gates | [Estrategia integral de pruebas](../backend/testing/strategy.md) |
| Alcance y composición | [Archivos públicos, cuarentena y datos de referencia](../backend/use-cases/uploads-and-reference-data.md) |
| El Canvas como lienzo | [Modelo Canvas](../business/business-model-canvas.md) |
| Secuencia de negocio | [Modelo Canvas](../business/business-model-canvas.md) |
| Evolución de la arquitectura | [Capacidad y proyección de costos](../business/capacity-and-cost-projections.md) |
| Qué decisión resuelve cada plataforma | [Análisis competitivo](../business/competitive-analysis.md) |
| Reparto del costo mensual | [Costos actuales](../business/costs.md) |
| Evolución de la factura de AWS | [Costos actuales](../business/costs.md) |
| Del uso al ingreso | [Métricas clave](../business/key-metrics.md) |
| Hoja de ruta de la comisión | [Monetización y planes](../business/monetization.md) |
| Ecosistema y flujos de valor | [Modelo de negocio](../business/README.md) |
| Mapa de factores | [Análisis FODA](../business/swot.md) |
| Composición del runtime | [Arquitectura de frontend mobile](../frontend-mobile/architecture/overview.md) |
| Composición del runtime | [Mapas de la aplicación mobile](../frontend-mobile/diagrams/application-map.md) |
| Capas y dirección de dependencia | [Mapas de la aplicación mobile](../frontend-mobile/diagrams/application-map.md) |
| Árbol de navegación | [Mapas de la aplicación mobile](../frontend-mobile/diagrams/application-map.md) |
| Estado y datos | [Mapas de la aplicación mobile](../frontend-mobile/diagrams/application-map.md) |
| Flujos por módulo | [Mapas de la aplicación mobile](../frontend-mobile/diagrams/application-map.md) |
| Árbol de acceso | [Diagramas de navegación y sesión mobile](../frontend-mobile/diagrams/navigation-and-session.md) |
| Busqueda y paginacion | [Secuencias y estados de producto mobile](../frontend-mobile/diagrams/product-processes.md) |
| Inscripcion a eventos | [Secuencias y estados de producto mobile](../frontend-mobile/diagrams/product-processes.md) |
| Envío desde la app y revisión | [Secuencias y estados de producto mobile](../frontend-mobile/diagrams/product-processes.md) |
| Rutas y canales | [Navegación pública y recuperación](../frontend-mobile/diagrams/public-information.md) |
| Lecturas y estados visuales | [Navegación pública y recuperación](../frontend-mobile/diagrams/public-information.md) |
| Secuencia de cancelación | [Captura, cancelación y recuperación del escáner](../frontend-mobile/diagrams/scan-lifecycle.md) |
| Circuito de producto | [Diagramas del escaneo exclusivo mobile](../frontend-mobile/diagrams/wine-label-scan.md) |
| Modelo de cache | [Routing, acceso y estado web](../frontend-web/architecture/navigation-and-state.md) |
| Composición | [Arquitectura de frontend web](../frontend-web/architecture/overview.md) |
| Capas y dependencias | [Mapas de la aplicación web](../frontend-web/diagrams/application-map.md) |
| Árbol de rutas | [Mapas de la aplicación web](../frontend-web/diagrams/application-map.md) |
| Busqueda y paginacion | [Secuencias y estados de producto web](../frontend-web/diagrams/product-processes.md) |
| Inscripcion a eventos | [Secuencias y estados de producto web](../frontend-web/diagrams/product-processes.md) |
| Envío desde la app y revisión | [Secuencias y estados de producto web](../frontend-web/diagrams/product-processes.md) |
| Rutas y canales | [Navegación pública y recuperación](../frontend-web/diagrams/public-information.md) |
| Lecturas y estados visuales | [Navegación pública y recuperación](../frontend-web/diagrams/public-information.md) |
| Decisión de guard | [Diagramas de routing y acceso web](../frontend-web/diagrams/routing-and-access.md) |
| Identidad de query | [Diagramas de server state y HTTP web](../frontend-web/diagrams/server-state-and-http.md) |
| Taxonomía de error | [Diagramas de server state y HTTP web](../frontend-web/diagrams/server-state-and-http.md) |
| Flujo de un cambio | [Proceso de desarrollo](../governance/development-process.md) |
| Flujo de una señal | [Actividad · Arquitectura](../modules/activity/architecture.md) |
| Arquitectura | [Administración y moderación · Arquitectura](../modules/admin/architecture.md) |
| Propósito y límites | [Administración y moderación · Arquitectura](../modules/admin/architecture.md) |
| Dashboard administrativo | [Administración y moderación · Arquitectura](../modules/admin/architecture.md) |
| Suspensión y reactivación | [Administración y moderación · Arquitectura](../modules/admin/architecture.md) |
| Eventos | [Administración y moderación · Arquitectura](../modules/admin/architecture.md) |
| Arquitectura | [Perfiles y comparaciones IA · Arquitectura](../modules/ai/architecture.md) |
| Límites del módulo | [Perfiles y comparaciones IA · Arquitectura](../modules/ai/architecture.md) |
| Par canónico | [Perfiles y comparaciones IA · Arquitectura](../modules/ai/architecture.md) |
| Profundidad editorial y ficha rápida | [Perfiles y comparaciones IA · Arquitectura](../modules/ai/architecture.md) |
| Arquitectura | [Cava · Arquitectura](../modules/cellar/architecture.md) |
| Arquitectura | [Comunidad · Arquitectura](../modules/community/architecture.md) |
| Arquitectura | [Eventos y entradas · Arquitectura](../modules/events/architecture.md) |
| Precondiciones y configuración de inscripción | [Eventos y entradas · Arquitectura](../modules/events/architecture.md) |
| Flujo de un premio | [Puntos y sellos · Arquitectura](../modules/gamification/architecture.md) |
| Arquitectura | [Legal · Arquitectura](../modules/legal/architecture.md) |
| Arquitectura | [Marketing en redes · Arquitectura](../modules/marketing/architecture.md) |
| Arquitectura | [Notificaciones · Arquitectura](../modules/notifications/architecture.md) |
| Responsabilidades y límites | [Notificaciones · Arquitectura](../modules/notifications/architecture.md) |
| Arquitectura | [Partners · Arquitectura](../modules/partner/architecture.md) |
| Arquitectura | [Pagos · Arquitectura](../modules/payments/architecture.md) |
| Estado del comprobante | [Pagos](../modules/payments/README.md) |
| Arquitectura | [Reseñas · Arquitectura](../modules/reviews/architecture.md) |
| Arquitectura | [Compartir · Arquitectura](../modules/sharing/architecture.md) |
| Arquitectura | [Soporte e información pública · Arquitectura](../modules/support/architecture.md) |
| Arquitectura | [Usuarios y cuenta · Arquitectura](../modules/users/architecture.md) |
| UC-USR-13 · Ver el perfil, los roles y las estadísticas | [Usuarios y cuenta · UC-USR-13 · Ver el perfil, los roles y las estadísticas](../modules/users/use-cases/uc-usr-13-view-profile.md) |
| Arquitectura | [Rutas del vino · Arquitectura](../modules/wine-routes/architecture.md) |
| Creación | [Rutas del vino · Arquitectura](../modules/wine-routes/architecture.md) |
| Jerarquía de filtros | [Rutas del vino · Arquitectura](../modules/wine-routes/architecture.md) |
| Arquitectura | [Bodegas y regiones · Arquitectura](../modules/wineries/architecture.md) |
| Creación y actualización | [Bodegas y regiones · Arquitectura](../modules/wineries/architecture.md) |
| Arquitectura | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Selección del plan de búsqueda | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Composición de detalle | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Orquestación | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Flujo funcional | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Pipeline backend | [Vinos · Arquitectura](../modules/wines/architecture.md) |
| Arquitectura | [Vinos · Vinos propuestos: envío, moderación y publicación](../modules/wines/submissions.md) |
| Cuarentena y ciclo de la imagen | [Vinos · Vinos propuestos: envío, moderación y publicación](../modules/wines/submissions.md) |
| Recorrido guiado por rol | [Accesos al producto](../project/deliverables-and-access.md) |
| Hitos | [Plan del proyecto](../project/project-plan.md) |
| Metodología | [Plan del proyecto](../project/project-plan.md) |
| Vista general del sistema | [Proyecto](../project/README.md) |
| Convenciones de arquitectura | [Organización del repositorio](../project/repository-organization.md) |
| Cómo se identifican | [Índice de requisitos](../project/requirements-index.md) |
| Estado de las métricas | [Métricas de calidad](../quality/metrics.md) |
| Mapa del modelo | [Modelo de calidad](../quality/quality-model.md) |
| Sistema de calidad | [Calidad de software](../quality/README.md) |
| Probabilidad e impacto | [Pruebas basadas en riesgos](../quality/risk-based-testing.md) |
| Ciclo de pruebas por release | [Plan de pruebas](../quality/test-plan.md) |
| Capas de defensa | [Defensa en profundidad](../security/defense-in-depth.md) |
| Fronteras de confianza | [Seguridad](../security/README.md) |

## Despliegue e infraestructura

| Diagrama | Página |
|---|---|
| Objetivo del entorno development | [Arquitectura de despliegue AWS](../infra/architecture/aws-deployment.md) |
| Roles de base productiva | [Entornos, configuración y secretos](../infra/architecture/environments-and-secrets.md) |
| Mapa de dependencias | [Servicios externos](../infra/architecture/external-services.md) |
| Producción de punta a punta | [Hosting y runtime](../infra/architecture/hosting-and-runtime.md) |
| Desarrollo de punta a punta | [Hosting y runtime](../infra/architecture/hosting-and-runtime.md) |
| Pull request | [Diagramas de CI/CD](../infra/diagrams/ci-cd-pipeline.md) |
| Coordinación después del merge | [Diagramas de CI/CD](../infra/diagrams/ci-cd-pipeline.md) |
| Web development deploy | [Diagramas de CI/CD](../infra/diagrams/ci-cd-pipeline.md) |
| Production release | [Diagramas de CI/CD](../infra/diagrams/ci-cd-pipeline.md) |
| Runtime development | [Mapas de despliegue](../infra/diagrams/deployment-map.md) |
| Runtime productivo aislado | [Mapas de despliegue](../infra/diagrams/deployment-map.md) |
| Diagrama de despliegue UML | [Mapas de despliegue](../infra/diagrams/deployment-map.md) |
| Plano de control | [Mapas de despliegue](../infra/diagrams/deployment-map.md) |
| Frontera de datos | [Mapas de despliegue](../infra/diagrams/deployment-map.md) |
| Orden seguro de arranque en development | [Diagramas de runtime y recuperación](../infra/diagrams/runtime-and-recovery.md) |
| Recuperación de base | [Diagramas de runtime y recuperación](../infra/diagrams/runtime-and-recovery.md) |
| Production application recovery | [Diagramas de runtime y recuperación](../infra/diagrams/runtime-and-recovery.md) |
| Aislamiento productivo | [Backup y recuperación ante desastre](../infra/operations/backup-and-disaster-recovery.md) |
| Arquitectura y alcance | [Observabilidad e incidentes de infraestructura](../infra/operations/observability-and-incidents.md) |

## Entidad-relación (DER)

| Diagrama | Página |
|---|---|
| Identidad y acceso | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Catálogo | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Reseñas y cava | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Social y perfil de gustos | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Eventos y pagos | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Rutas | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| IA y propuestas | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Pagos online (V29–V38) | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Consultas públicas de soporte | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Identidad y credenciales | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Autorización | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Geografía y catálogo | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Comunidad y cava | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Eventos e inscripciones | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Rutas y paradas | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Propuestas y contenido generado | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Reservas monetarias IA | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Control de sesión y efectos externos | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Comunidad y evidencia privada (V24) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Decisiones de publicación (V26) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Inventario y presupuestos de imágenes (V27) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Pagos online (V29–V38) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Preferencias, consentimiento y supresiones (V42–V43) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Dispositivos y entregas push (V46–V68) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Interruptores por tipo de push (V59) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Anuncios y resúmenes (V49, V56, V60) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Áreas de eventos cercanos (V50) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Engagement y actividad (V52, V66–V67) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Cursores de resúmenes (V54–V55) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Versiones mínimas de la app (V69) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Publicación en redes (V82–V84) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Social y perfil de gustos (V87–V89) | [DER detallado por contexto](../backend/diagrams/relational-model.md) |
| Datos | [Administración y moderación](../modules/admin/README.md) |
| Datos | [Perfiles y comparaciones IA](../modules/ai/README.md) |
| Datos | [Cava](../modules/cellar/README.md) |
| Datos | [Comunidad](../modules/community/README.md) |
| Datos | [Eventos y entradas](../modules/events/README.md) |
| Modelo relacional | [Legal · Arquitectura](../modules/legal/architecture.md) |
| Datos | [Legal](../modules/legal/README.md) |
| Datos | [Marketing en redes](../modules/marketing/README.md) |
| Datos | [Notificaciones](../modules/notifications/README.md) |
| Datos | [Partners](../modules/partner/README.md) |
| Datos | [Pagos](../modules/payments/README.md) |
| Datos | [Reseñas](../modules/reviews/README.md) |
| Datos | [Soporte e información pública](../modules/support/README.md) |
| Datos | [Usuarios y cuenta](../modules/users/README.md) |
| Datos | [Rutas del vino](../modules/wine-routes/README.md) |
| Datos | [Bodegas y regiones](../modules/wineries/README.md) |
| Datos | [Vinos](../modules/wines/README.md) |

## Estados

| Diagrama | Página |
|---|---|
| Ciclo de vida de una fila | [Sesiones, publicación y efectos externos](../backend/architecture/session-and-data-integrity.md) |
| event_registrations | [Modelo de datos y persistencia](../backend/data/database-model.md) |
| Eventos | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Inscripciones y pago | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Pago de una inscripción | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Intento de checkout | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Pago informado por el proveedor | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Intención de reembolso | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Submissions de vino | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Tokens de acción de cuenta | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Denuncias de la comunidad | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Publicación de reseñas y comentarios | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Rutas enoturísticas | [Máquinas de estado del dominio](../backend/diagrams/domain-state-machines.md) |
| Cuarentena, promoción y compensación | [Archivos públicos, cuarentena y datos de referencia](../backend/use-cases/uploads-and-reference-data.md) |
| Cola de renovación | [Diagramas de navegación y sesión mobile](../frontend-mobile/diagrams/navigation-and-session.md) |
| Comparacion | [Secuencias y estados de producto mobile](../frontend-mobile/diagrams/product-processes.md) |
| Contacto: máquina de estados | [Navegación pública y recuperación](../frontend-mobile/diagrams/public-information.md) |
| Revisión contractual | [Navegación pública y recuperación](../frontend-mobile/diagrams/public-information.md) |
| Estados de recuperacion | [Diagramas del escaneo exclusivo mobile](../frontend-mobile/diagrams/wine-label-scan.md) |
| Comparacion | [Secuencias y estados de producto web](../frontend-web/diagrams/product-processes.md) |
| Contacto: máquina de estados | [Navegación pública y recuperación](../frontend-web/diagrams/public-information.md) |
| Preferencia de mapas externos | [Navegación pública y recuperación](../frontend-web/diagrams/public-information.md) |
| Revisión contractual | [Navegación pública y recuperación](../frontend-web/diagrams/public-information.md) |
| Estados y tiempo | [Perfiles y comparaciones IA · Arquitectura](../modules/ai/architecture.md) |
| API | [Comunidad · Arquitectura](../modules/community/architecture.md) |
| Test de gustos | [Comunidad · Arquitectura](../modules/community/architecture.md) |
| Publicación de reseñas y comentarios | [Comunidad · Arquitectura](../modules/community/architecture.md) |
| Estados de una denuncia | [Comunidad](../modules/community/README.md) |
| Estados de un evento | [Eventos y entradas](../modules/events/README.md) |
| Estados de una inscripción | [Eventos y entradas](../modules/events/README.md) |
| Estado de aceptación de una cuenta | [Legal](../modules/legal/README.md) |
| Transiciones | [Marketing en redes · Arquitectura](../modules/marketing/architecture.md) |
| Estados de un intento de checkout | [Pagos](../modules/payments/README.md) |
| Estados de una devolución | [Pagos](../modules/payments/README.md) |
| Estado de un pago en Mercado Pago | [Pagos](../modules/payments/README.md) |
| Likes | [Reseñas · Arquitectura](../modules/reviews/architecture.md) |
| Estados de publicación | [Reseñas](../modules/reviews/README.md) |
| Estados de la cuenta | [Usuarios y cuenta](../modules/users/README.md) |
| Estados de una ruta | [Rutas del vino](../modules/wine-routes/README.md) |
| Estados de un vino propuesto | [Vinos](../modules/wines/README.md) |
| Estados y transiciones | [Vinos · Vinos propuestos: envío, moderación y publicación](../modules/wines/submissions.md) |

## Clases

| Diagrama | Página |
|---|---|
| Fundamentos, catálogo y comunidad | [Modelo de dominio UML](../backend/diagrams/domain-class-model.md) |
| Identidad y eventos | [Modelo de dominio UML](../backend/diagrams/domain-class-model.md) |
| Rutas, submissions e IA | [Modelo de dominio UML](../backend/diagrams/domain-class-model.md) |
| Colaboración de aplicación: escaneo | [Modelo de dominio UML](../backend/diagrams/domain-class-model.md) |
| Pagos | [Modelo de dominio UML](../backend/diagrams/domain-class-model.md) |
| Comunidad, legal, notificaciones y soporte | [Modelo de dominio UML](../backend/diagrams/domain-class-model.md) |
| Engagement y actividad | [Modelo de dominio UML](../backend/diagrams/domain-class-model.md) |

## Paquetes

| Diagrama | Página |
|---|---|
| Diagrama de paquetes | [Límites modulares y dependencias del backend](../backend/architecture/module-boundaries.md) |

## Cronograma

| Diagrama | Página |
|---|---|
| Cronograma | [Cronograma](../gantt/README.md) |
| Hoja de ruta técnica | [Cronograma](../gantt/README.md) |
| Hoja de ruta de negocio | [Cronograma](../gantt/README.md) |

## Lucidchart

| Documento | Contenido |
|---|---|
| [Diagrama de componentes](https://lucid.app/lucidchart/9f11a16b-bb5a-42fc-a9e8-0852b17bd241/edit) | Un diagrama de componentes por caso de uso web |
| [Diagrama de componentes - APK](https://lucid.app/lucidchart/e095dd25-e8ac-41ba-bf5b-396e1055f217/edit) | Un diagrama de componentes por caso de uso de la app |
| [Caso de uso](https://lucid.app/lucidchart/7372c326-581e-4f33-bf02-9d7d75254b89/edit) | Diagrama de casos de uso |

Cada caso de uso enlaza su diagrama de componentes con el ID anterior de Lucidchart (`WEB UC-…`, `APK UC-…`). Los diagramas de secuencia son los de Mermaid de cada caso de uso, listados arriba.
