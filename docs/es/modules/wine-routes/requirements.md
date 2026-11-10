# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-RTE-01` | Explorar rutas y criterios expuestos. | Texto, país, región y longitud short/medium/long refinan resultados; la longitud no representa una certificación de dificultad física. | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | `RF-WEB-ROUTE-001` |
| `RF-WEB-RTE-02` | Refinar rutas dentro de la página recibida. | Los criterios de Rutas filtran localmente una página de veinte; total/páginas siguen siendo del servidor, no un total global filtrado. | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | `RF-WEB-WEBX-004` |
| `RF-WEB-RTE-03` | Abrir detalle de una ruta. | Muestra portada/fallback, nombre, descripción, origen, distancia, duración (en minutos o, si solo hay una estimación en días, en días) y número de paradas disponibles; el largo se oculta si la ruta no lo tiene. | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | `RF-WEB-ROUTE-002` |
| `RF-WEB-RTE-04` | Consultar paradas ordenadas y expandir información. | Cada parada presenta orden, tipo, dirección, duración, descripción y contactos disponibles; expandir no modifica la ruta. | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | `RF-WEB-ROUTE-003` |
| `RF-WEB-RTE-05` | Abrir mapa de parada y recorrido externo. | Usa coordenadas o dirección/nombre; iniciar recorrido conserva orden, origen, destino y paradas intermedias en Maps. | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | `RF-WEB-ROUTE-004` |
| `RF-WEB-RTE-06` | No convertir exploración en seguimiento turístico. | Abrir mapas/paradas no registra automáticamente una ruta completada ni aporta navegación GPS propia de Vinnot. | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | `RF-WEB-ROUTE-006` |
| `RF-WEB-RTE-07` | Compartir y denunciar rutas. | Compartir usa UUID de ruta y denuncia tipo WINE_ROUTE; sólo PUBLISHED tiene página pública de compartir y sólo ahí se ofrece «Compartir». | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | `RF-WEB-ROUTE-005` |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-RTE-01` | Explorar rutas y criterios expuestos. | Texto, país, región y longitud short/medium/long refinan resultados; la longitud no representa una certificación de dificultad física. | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | `RF-APK-ROUTE-001` |
| `RF-APK-RTE-02` | Refinar rutas en páginas acumuladas y cargar más. | Texto/longitud/país/región filtra páginas ya cargadas, sin búsqueda global; cargar más deduplica UUID y refresh vuelve a página cero. | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | `RF-APK-APKX-010` |
| `RF-APK-RTE-03` | Abrir detalle de una ruta. | Muestra portada/fallback, nombre, descripción, origen, distancia, duración (en minutos o, si solo hay una estimación en días, en días) y número de paradas disponibles; el largo se oculta si la ruta no lo tiene. | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | `RF-APK-ROUTE-002` |
| `RF-APK-RTE-04` | Consultar paradas ordenadas y expandir información. | Cada parada presenta orden, tipo, dirección, duración, descripción y contactos disponibles; expandir no modifica la ruta. | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | `RF-APK-ROUTE-003` |
| `RF-APK-RTE-05` | Abrir mapa de parada y recorrido externo. | Usa coordenadas o dirección/nombre; iniciar recorrido conserva orden, origen, destino y paradas intermedias en Maps. | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | `RF-APK-ROUTE-004` |
| `RF-APK-RTE-06` | No convertir exploración en seguimiento turístico. | Abrir mapas/paradas no registra automáticamente una ruta completada ni aporta navegación GPS propia de Vinnot. | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | `RF-APK-ROUTE-006` |
| `RF-APK-RTE-07` | Compartir y denunciar rutas. | Compartir usa UUID de ruta y denuncia tipo WINE_ROUTE; sólo PUBLISHED tiene página pública de compartir y sólo ahí se ofrece «Compartir». | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | `RF-APK-ROUTE-005` |
