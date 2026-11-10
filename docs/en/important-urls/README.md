# Important URLs

Addresses of each environment, of the service consoles and of the project resources. The
consoles ask for each service's account.

## Environments

| Environment | Web | API | Images |
|---|---|---|---|
| Production | [vinnot.com](https://vinnot.com) | `https://api.vinnot.com/api` | `https://images.vinnot.com` |
| Development | [dev.vinnot.com](https://dev.vinnot.com) | `https://api-dev.vinnot.com/api` | `https://images.vinnot.com` |
| Local | `http://localhost:5173` | `http://localhost:8080/api` | — |

- Public share links: `https://vinnot.com/share/{kind}/{id}` ([Sharing](../modules/sharing/README.md)).
- Backend health: `/api/actuator/health`, which Caddy checks every 30 seconds.
- Local API documentation: `http://localhost:8080/api/swagger-ui.html`.

## App

| Store | Link |
|---|---|
| App Store | [Vinnot on the App Store](https://apps.apple.com/app/vinnot/id6817992780) |
| Google Play | [Vinnot on Google Play](https://play.google.com/store/apps/details?id=com.vinnot.app) |

## Consoles

| Service | Console | What for |
|---|---|---|
| AWS | [console.aws.amazon.com](https://console.aws.amazon.com) | Servers, web, email, monitoring and secrets (region `us-east-1`) |
| Cloudflare | [dash.cloudflare.com](https://dash.cloudflare.com) | DNS, R2, Workers, Pages and Access |
| Expo | [expo.dev](https://expo.dev) | App builds and OTA updates |
| App Store Connect | [appstoreconnect.apple.com](https://appstoreconnect.apple.com) | iOS publishing and TestFlight |
| Google Play Console | [play.google.com/console](https://play.google.com/console) | Android publishing |
| Mercado Pago | [mercadopago.com.ar/developers/panel](https://www.mercadopago.com.ar/developers/panel) | Payments application and credentials |
| Google Cloud | [console.cloud.google.com](https://console.cloud.google.com) | Google Maps keys and Google sign-in |
| OpenAI | [platform.openai.com](https://platform.openai.com) | AI key and usage |

## Monitoring

- Production alarms and metrics in CloudWatch (AWS console), with email alerts
  ([Observability and incidents](../infra/operations/observability-and-incidents.md)).
- Push results per type in the administration panel, under Notifications
  ([Administration](../modules/admin/README.md)).

## Project

| Resource | Link |
|---|---|
| Repository (monorepo) | [github.com/Bielaszczuk/vinnot](https://github.com/Bielaszczuk/vinnot) |
| App source code (APK) | [frontend-mobile/](https://github.com/Bielaszczuk/vinnot/tree/main/frontend-mobile) |
| Web source code | [frontend-react/](https://github.com/Bielaszczuk/vinnot/tree/main/frontend-react) |
| Backend source code | [backend/](https://github.com/Bielaszczuk/vinnot/tree/main/backend) |
| Issues | [Repository issues](https://github.com/Bielaszczuk/vinnot/issues) |
| CI/CD actions | [GitHub Actions](https://github.com/Bielaszczuk/vinnot/actions) |
| Documentation site | [vinnot-docs.pages.dev](https://vinnot-docs.pages.dev), with restricted access |
| Lucidchart diagrams | [Diagram catalog](../diagrams/README.md#lucidchart) |

The repository is a monorepo: the app (iOS and Android) lives in
`frontend-mobile/`, the web in `frontend-react/` and the backend in `backend/`.
