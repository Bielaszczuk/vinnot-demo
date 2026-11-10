# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-SHR-01` | Compartir un vino, evento o ruta por URL pública. | Genera /share/wines/{uuid}, /share/events/{uuid} o /share/wine-routes/{uuid}; no incluye tokens ni sólo texto descriptivo. | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | `RF-WEB-SHARE-001` |
| `RF-WEB-SHR-02` | Compartir con API del navegador o copiar URL. | Si navigator.share está disponible se usa; fallback copia URL y comunica resultado. Cancelar compartir no se anuncia como éxito. | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | `RF-WEB-WEBX-003` |
| `RF-WEB-SHR-03` | Mostrar preview pública mínima ES/EN. | HTML contiene título, descripción acotada, imagen permitida/fallback, marca, abrir app/web y tiendas; no expone contactos privados ni inscripciones. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-WEB-SHARE-002` |
| `RF-WEB-SHR-04` | Ofrecer metadata para mensajería. | Open Graph/Twitter se renderizan en servidor con la foto del vino, evento o ruta compartido, o con la vista previa PNG de marca si no tiene; preview del enlace App Store pertenece a Apple y puede cachearse por terceros. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-WEB-SHARE-003` |
| `RF-WEB-SHR-05` | Ocultar recursos retirados o privados en share. | Vino activo, ruta PUBLISHED y evento publicado alguna vez/no DRAFT son elegibles; inválido/no público devuelve 404 neutral. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-WEB-SHARE-004` |
| `RF-WEB-SHR-06` | Abrir recurso en app compatible instalada. | Asociación nativa dirige al vino/evento/ruta exactos; sin asociación/navegador compatible ofrece Abrir en Vinnot y descarga. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-WEB-SHARE-005` |
| `RF-WEB-SHR-07` | Mantener destino después de instalar o autenticar. | Login conserva destino protegido; después de instalar se vuelve a abrir el enlace original, sin prometer deferred deep linking. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-WEB-SHARE-006` |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-SHR-01` | Compartir un vino, evento o ruta por URL pública. | Genera /share/wines/{uuid}, /share/events/{uuid} o /share/wine-routes/{uuid}; no incluye tokens ni sólo texto descriptivo. | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | `RF-APK-SHARE-001` |
| `RF-APK-SHR-02` | Compartir con la hoja nativa Android. | Share entrega el enlace público como texto; selección/cancelación usa resultado nativo, sin obligar a un canal concreto. | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | `RF-APK-APKX-001` |
| `RF-APK-SHR-03` | Mostrar preview pública mínima ES/EN. | HTML contiene título, descripción acotada, imagen permitida/fallback, marca, abrir app/web y tiendas; no expone contactos privados ni inscripciones. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-APK-SHARE-002` |
| `RF-APK-SHR-04` | Ofrecer metadata para mensajería. | Open Graph/Twitter se renderizan en servidor con la foto del vino, evento o ruta compartido, o con la vista previa PNG de marca si no tiene; preview del enlace App Store pertenece a Apple y puede cachearse por terceros. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-APK-SHARE-003` |
| `RF-APK-SHR-05` | Ocultar recursos retirados o privados en share. | Vino activo, ruta PUBLISHED y evento publicado alguna vez/no DRAFT son elegibles; inválido/no público devuelve 404 neutral. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-APK-SHARE-004` |
| `RF-APK-SHR-06` | Abrir recurso en app compatible instalada. | Asociación nativa dirige al vino/evento/ruta exactos; sin asociación/navegador compatible ofrece Abrir en Vinnot y descarga. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-APK-SHARE-005` |
| `RF-APK-SHR-07` | Mantener destino después de instalar o autenticar. | Login conserva destino protegido, incluidas `/my-tickets` y `/my-tickets/<id>`; después de instalar se vuelve a abrir el enlace original, sin prometer deferred deep linking. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-APK-SHARE-006` |
| `RF-APK-SHR-08` | Reconocer Android App Links firmados. | HTTPS del dominio asociado transforma share a /wines, /events o /routes; app/build/dominio deben ser compatibles, OTA no agrega una asociación nativa ausente. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-APK-APKX-002` |
