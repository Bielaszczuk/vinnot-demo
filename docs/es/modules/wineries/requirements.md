# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-WRY-01` | Abrir la ficha de una bodega. | Identidad, descripción, origen, imagen, año y contacto se muestran según datos existentes; no es la bodega personal. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-WEB-WINERY-001` |
| `RF-WEB-WRY-02` | Consultar vinos relacionados. | La ficha consulta la primera página de veinte vinos de esa bodega; no afirma cargar todo su catálogo. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-WEB-WINERY-002` |
| `RF-WEB-WRY-03` | Consultar ubicación y acciones de contacto. | Coordenadas o dirección permiten representar mapa y abrir enlaces de contacto presentes; geocodificación no garantiza autorización de escritura. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-WEB-WINERY-003` |
| `RF-WEB-WRY-04` | Mantener errores de datos relacionados separados. | La lectura de bodega y de sus vinos son operaciones distintas; ausencia de imagen usa fallback y no se interpreta como entidad inexistente. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-WEB-WINERY-004` |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-WRY-01` | Abrir la ficha de una bodega. | Identidad, descripción, origen, imagen, año y contacto se muestran según datos existentes; no es la bodega personal. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-APK-WINERY-001` |
| `RF-APK-WRY-02` | Consultar vinos relacionados. | La ficha consulta la primera página de veinte vinos de esa bodega; no afirma cargar todo su catálogo. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-APK-WINERY-002` |
| `RF-APK-WRY-03` | Consultar ubicación y acciones de contacto. | Coordenadas o dirección permiten representar mapa y abrir enlaces de contacto presentes; geocodificación no garantiza autorización de escritura. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-APK-WINERY-003` |
| `RF-APK-WRY-04` | Mantener errores de datos relacionados separados. | La lectura de bodega y de sus vinos son operaciones distintas; ausencia de imagen usa fallback y no se interpreta como entidad inexistente. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-APK-WINERY-004` |
| `RF-APK-WRY-05` | Consultar listado adicional de bodegas productoras. | /wineries permite listado/búsqueda y abrir ficha; no equivale a un índice público de bodegas habilitado como ruta web. | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | `RF-APK-APKX-012` |
