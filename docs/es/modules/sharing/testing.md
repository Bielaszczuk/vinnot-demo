# Pruebas

Casos de prueba del módulo: uno por el flujo principal de cada caso de uso y uno por cada flujo alternativo. Se pueden ejecutar a mano en la web y en la app; la columna de tests automáticos indica qué tests ejercen el caso de uso.

## Casos de prueba

| ID | Caso de uso | Pasos | Resultado esperado |
|---|---|---|---|
| `CP-SHR-01` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | 1) La persona elige «Compartir». 2) El cliente arma el enlace público `/share/{tipo}/{id}` con el dominio de Vinnot; el tipo es `wines`, `events` o `wine-routes`. 3) El cliente abre la hoja de compartir: la del navegador en la web y la del sistema en la app. 4) La persona elige dónde compartir el enlace. | El enlace público quedó compartido o copiado. |
| `CP-SHR-15` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | Flujo principal → 1a. El evento o la ruta todavía no tiene página pública (un evento en borrador o cancelado sin haberse publicado, una ruta sin publicar) | El cliente no ofrece «Compartir». |
| `CP-SHR-02` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | Flujo principal → 3a. El navegador no permite compartir | La web copia el enlace y avisa que se copió. |
| `CP-SHR-03` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | Flujo principal → 4a. La persona cancela | No se muestra ningún aviso de éxito. |
| `CP-SHR-04` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | Flujo principal → 3b. Compartir falla | El cliente muestra un aviso de error. |
| `CP-SHR-05` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | 1) La persona abre el enlace en el navegador, o la aplicación de mensajería lo consulta para armar su vista previa. 2) La API recibe `GET /share/{tipo}/{id}` sin sesión y valida el tipo y el formato del ID. 3) La API busca el contenido público: un vino activo, una ruta publicada o un evento publicado alguna vez que no esté en borrador. 4) La API devuelve una página con título, descripción corta, imagen, metadatos Open Graph y Twitter, y los botones «Abrir en Vinnot», «Continuar en la web» y de descarga. | Quien recibe el enlace ve una vista previa del contenido sin iniciar sesión. |
| `CP-SHR-06` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | Flujo principal → 2a. El tipo no existe o el ID no es un UUID | La API responde 404 sin consultar la base. |
| `CP-SHR-07` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | Flujo principal → 3a. El contenido no existe o no es público | La API responde 404 con una página neutra que dice que el enlace ya no está disponible. |
| `CP-SHR-08` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | Flujo principal → 1a. El dispositivo está en inglés o el enlace termina en `/en` | La página se muestra en inglés. |
| `CP-SHR-09` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | Flujo principal → 1b. El enlace es solo `/share` | Se muestra la página general de la app con sus descargas. |
| `CP-SHR-10` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | 1) La persona toca el enlace con la app instalada. 2) El sistema reconoce el dominio asociado y abre la app. 3) La app traduce `/share/{tipo}/{id}` a su pantalla: `/wines/{id}`, `/events/{id}` o `/routes/{id}`. 4) La app muestra el contenido. | La persona ve el vino, el evento o la ruta en la app o en la web. |
| `CP-SHR-11` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | Flujo principal → 2a. No hay app o el sistema no reconoce el dominio | Se abre la vista previa, que ofrece «Abrir en Vinnot» (`vinnot://{tipo}/{id}`) y las descargas. |
| `CP-SHR-12` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | Flujo principal → 2b. La persona elige «Continuar en la web» | La web abre `/{tipo}/{id}`. |
| `CP-SHR-13` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | Flujo principal → 4a. No hay sesión | La app o la web pide iniciar sesión y después vuelve al contenido. |
| `CP-SHR-14` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | Flujo principal → 3a. El enlace es inválido, demasiado largo o de otro dominio | La app abre Inicio. |

## Matriz de trazabilidad

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | RF-WEB-SHR-01, RF-WEB-SHR-02, RF-APK-SHR-01, RF-APK-SHR-02 | CP-SHR-01, CP-SHR-15, CP-SHR-02, CP-SHR-03, CP-SHR-04 | 0 | 3 | 4 |
| [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | RF-WEB-SHR-03, RF-WEB-SHR-04, RF-WEB-SHR-05, RF-APK-SHR-03, RF-APK-SHR-04, RF-APK-SHR-05 | CP-SHR-05, CP-SHR-06, CP-SHR-07, CP-SHR-08, CP-SHR-09 | 4 | 2 | 0 |
| [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | RF-WEB-SHR-06, RF-WEB-SHR-07, RF-APK-SHR-06, RF-APK-SHR-07, RF-APK-SHR-08 | CP-SHR-10, CP-SHR-11, CP-SHR-12, CP-SHR-13, CP-SHR-14 | 0 | 0 | 1 |

Las columnas Backend, Web y App cuentan los archivos de test que ejercen el caso; el detalle está en cada caso de uso. «n/a» indica que el caso no aplica a esa plataforma.
