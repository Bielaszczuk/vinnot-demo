# Compartir

Enlaces públicos para compartir vinos, eventos y rutas. Quien recibe el enlace ve una
vista previa sin iniciar sesión, con el título, una descripción corta y la imagen del
contenido, y desde ahí abre la app o sigue en la web. Si tiene la app instalada, el
enlace la abre directamente en ese contenido.

- Código del módulo: `SHR`.
- Backend: paquete [`sharing`](../../../../backend/src/main/java/com/vinnot/sharing/).
- [Casos de uso](use-cases/README.md) · [Requisitos](requirements.md) ·
  [Arquitectura](architecture.md) · [Pruebas](testing.md)

## Actores

| Actor | Qué hace en este módulo |
|---|---|
| Usuario autenticado | Comparte un vino, un evento o una ruta desde su detalle |
| Persona que recibe el enlace | Ve la vista previa sin sesión y abre el contenido en la app o en la web |
| Aplicación de mensajería | Lee los metadatos de la página para mostrar la vista previa del enlace |

## Reglas de negocio

| Regla | Detalle | Dónde |
|---|---|---|
| Formato del enlace | `/share/{tipo}/{id}` con tipo `wines`, `events` o `wine-routes` e ID UUID; sin tokens ni datos de la persona | [`SharedContentKind.java`](../../../../backend/src/main/java/com/vinnot/sharing/domain/SharedContentKind.java) |
| Contenido público | Vinos activos, rutas publicadas y eventos publicados alguna vez que no estén en borrador; lo demás muestra una página neutra | [`JdbcSharedContentQueryAdapter.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/persistence/JdbcSharedContentQueryAdapter.java) |
| Sin sesión | La vista previa es lo único anónimo; abrir el contenido completo exige iniciar sesión | [`SecurityConfig.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java) |
| Datos expuestos | Solo título (hasta 120 caracteres), descripción (hasta 240) e imagen; nunca contactos ni inscripciones | [`SharedLinkHtmlRenderer.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRenderer.java) |
| Imágenes | Solo del dominio de imágenes de Vinnot o de los uploads de la API; si no, la marca | [`SharedLinkHtmlRenderer.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRenderer.java) |
| Idioma | Español por defecto; inglés con `/en` o `?lang=en` | [`SharedLinkController.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkController.java) |
| Privacidad | La página no se guarda en caché ni la indexan los buscadores | [`SharedLinkController.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkController.java) |
| Dominios aceptados | La app solo abre enlaces de `vinnot.com` y `dev.vinnot.com` | [`nativeIntent.ts`](../../../../frontend-mobile/src/domain/navigation/nativeIntent.ts) |

## Dónde vive

| Parte | Ubicación |
|---|---|
| API | [`SharedLinkController`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkController.java) bajo `/share`, con la plantilla `backend/src/main/resources/sharing/landing.html` |
| Web | [`useShareLink`](../../../../frontend-react/src/presentation/hooks/useShareLink.ts) y [`sharing.service.ts`](../../../../frontend-react/src/application/services/sharing.service.ts); recursos de la página en `frontend-react/public/share-assets/` |
| App | [`useShareLink`](../../../../frontend-mobile/src/presentation/hooks/useShareLink.ts) y `frontend-mobile/app/+native-intent.tsx` para abrir enlaces |

## Datos

El módulo no tiene tablas propias: lee `wines`, `events` y `wine_routes`
([Vinos](../wines/README.md), [Eventos](../events/README.md),
[Rutas del vino](../wine-routes/README.md)).
