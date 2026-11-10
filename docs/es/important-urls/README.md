# URLs importantes

Direcciones de cada entorno, de las consolas de los servicios y de los recursos del
proyecto. Las consolas piden la cuenta de cada servicio.

## Entornos

| Entorno | Web | API | Imágenes |
|---|---|---|---|
| Producción | [vinnot.com](https://vinnot.com) | `https://api.vinnot.com/api` | `https://images.vinnot.com` |
| Desarrollo | [dev.vinnot.com](https://dev.vinnot.com) | `https://api-dev.vinnot.com/api` | `https://images.vinnot.com` |
| Local | `http://localhost:5173` | `http://localhost:8080/api` | — |

- Enlaces públicos para compartir: `https://vinnot.com/share/{tipo}/{id}` ([Compartir](../modules/sharing/README.md)).
- Salud del backend: `/api/actuator/health`, la que revisa Caddy cada 30 segundos.
- Documentación de la API en local: `http://localhost:8080/api/swagger-ui.html`.

## App

| Tienda | Enlace |
|---|---|
| App Store | [Vinnot en la App Store](https://apps.apple.com/app/vinnot/id6817992780) |
| Google Play | [Vinnot en Google Play](https://play.google.com/store/apps/details?id=com.vinnot.app) |

## Consolas

| Servicio | Consola | Para qué |
|---|---|---|
| AWS | [console.aws.amazon.com](https://console.aws.amazon.com) | Servidores, web, correo, monitoreo y secretos (región `us-east-1`) |
| Cloudflare | [dash.cloudflare.com](https://dash.cloudflare.com) | DNS, R2, Workers, Pages y Access |
| Expo | [expo.dev](https://expo.dev) | Compilaciones de la app y actualizaciones OTA |
| App Store Connect | [appstoreconnect.apple.com](https://appstoreconnect.apple.com) | Publicación en iOS y TestFlight |
| Google Play Console | [play.google.com/console](https://play.google.com/console) | Publicación en Android |
| Mercado Pago | [mercadopago.com.ar/developers/panel](https://www.mercadopago.com.ar/developers/panel) | Aplicación de cobros y credenciales |
| Google Cloud | [console.cloud.google.com](https://console.cloud.google.com) | Claves de Google Maps e ingreso con Google |
| OpenAI | [platform.openai.com](https://platform.openai.com) | Clave y consumo de la IA |

## Monitoreo

- Alarmas y métricas de producción en CloudWatch (consola de AWS), con avisos por correo
  ([Observabilidad e incidentes](../infra/operations/observability-and-incidents.md)).
- Resultados de push por tipo en el panel de administración, en Notificaciones
  ([Administración](../modules/admin/README.md)).

## Proyecto

| Recurso | Enlace |
|---|---|
| Repositorio (monorepo) | [github.com/Bielaszczuk/vinnot](https://github.com/Bielaszczuk/vinnot) |
| Código fuente de la app (APK) | [frontend-mobile/](https://github.com/Bielaszczuk/vinnot/tree/main/frontend-mobile) |
| Código fuente de la web | [frontend-react/](https://github.com/Bielaszczuk/vinnot/tree/main/frontend-react) |
| Código fuente del backend | [backend/](https://github.com/Bielaszczuk/vinnot/tree/main/backend) |
| Issues | [Issues del repositorio](https://github.com/Bielaszczuk/vinnot/issues) |
| Acciones de CI/CD | [GitHub Actions](https://github.com/Bielaszczuk/vinnot/actions) |
| Sitio de documentación | [vinnot-docs.pages.dev](https://vinnot-docs.pages.dev), con acceso restringido |
| Diagramas en Lucidchart | [Catálogo de diagramas](../diagrams/README.md#lucidchart) |

El repositorio es un monorepo: la app (iOS y Android) está en `frontend-mobile/`,
la web en `frontend-react/` y el backend en `backend/`.
