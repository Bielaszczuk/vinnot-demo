# Pruebas

Casos de prueba del módulo: uno por el flujo principal de cada caso de uso y uno por cada flujo alternativo. Se pueden ejecutar a mano en la web y en la app; la columna de tests automáticos indica qué tests ejercen el caso de uso.

## Casos de prueba

| ID | Caso de uso | Pasos | Resultado esperado |
|---|---|---|---|
| `CP-WRY-01` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | 1) La persona abre una bodega desde un vino, una ruta del vino o el listado de la app. 2) El cliente pide `GET /wineries/{id}`. 3) La API devuelve la bodega con su origen, contacto, coordenadas y cantidad de vinos activos. 4) El cliente muestra logo, nombre, ubicación, año de fundación, descripción (en el idioma de la interfaz o, si falta, en el otro), web, email y teléfono. 5) El cliente muestra un mapa con las coordenadas o, si faltan, con la dirección o el nombre. 6) Pide aparte la primera página de 20 vinos de la bodega y los muestra en una grilla que lleva a cada vino. | Se muestra la ficha de la bodega con sus vinos, su ubicación y sus datos de contacto. |
| `CP-WRY-02` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | Flujo principal → 3a. La bodega no existe | La API responde 404 y el cliente muestra que no se encontró. |
| `CP-WRY-03` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | Flujo principal → 5a. La bodega no tiene coordenadas | El cliente las busca por geocodificación con nombre, región y país, y pide guardarlas con `PATCH /wineries/{id}/coordinates`; la API solo las guarda si quien mira tiene permiso `WINERY_UPDATE` y la bodega sigue sin coordenadas. |
| `CP-WRY-04` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | Flujo principal → 6a. La bodega no tiene vinos publicados | Se muestra el estado vacío. |
| `CP-WRY-05` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | Flujo principal → 4a. Falta la imagen | Se muestra una imagen por defecto; falta otro dato: no se muestra ese bloque. |
| `CP-WRY-06` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | 1) La app muestra las bodegas activas ordenadas por nombre. 2) La persona escribe en el buscador. 3) La app espera 350 ms sin cambios y pide `GET /wineries` con el texto y páginas de 20. 4) La API busca el texto dentro del nombre, el nombre legal o el nombre SEO de cada bodega. 5) La persona elige una bodega y la app abre su ficha ([UC-WRY-01](use-cases/uc-wry-01-view-winery.md)). | Se muestran las bodegas activas que coinciden con la búsqueda. |
| `CP-WRY-07` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | Flujo principal → 2a. La persona tira hacia abajo | La lista se recarga. |
| `CP-WRY-13` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | Flujo principal → 2b. La persona llega al final de la lista | La app suma la página siguiente mientras la API indique que hay más. |
| `CP-WRY-08` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | Flujo principal → 4a. No hay resultados | Se muestra el estado vacío. |
| `CP-WRY-09` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | Flujo principal → 3a. Un texto de más de 512 caracteres responde 422 `INVALID_SEARCH`. | Un texto de más de 512 caracteres responde 422 `INVALID_SEARCH`. |
| `CP-WRY-10` | [`UC-WRY-03`](use-cases/uc-wry-03-countries-and-regions.md) | 1) El cliente pide la lista de países. 2) La persona elige un país. 3) El cliente pide las regiones de ese país. 4) La persona elige una región. | El selector ofrece los países y las regiones del país elegido. |
| `CP-WRY-11` | [`UC-WRY-03`](use-cases/uc-wry-03-countries-and-regions.md) | Flujo principal → 2a. La persona cambia el país | Se borra la región elegida y se cargan las del país nuevo. |
| `CP-WRY-12` | [`UC-WRY-03`](use-cases/uc-wry-03-countries-and-regions.md) | Flujo principal → 3a. El país no tiene regiones o no existe | La API devuelve una lista vacía. |

## Matriz de trazabilidad

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | RF-WEB-WRY-01, RF-WEB-WRY-02, RF-WEB-WRY-03, RF-WEB-WRY-04, RF-APK-WRY-01, RF-APK-WRY-02, RF-APK-WRY-03, RF-APK-WRY-04 | CP-WRY-01, CP-WRY-02, CP-WRY-03, CP-WRY-04, CP-WRY-05 | 3 | 3 | 4 |
| [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | RF-APK-WRY-05 | CP-WRY-06, CP-WRY-07, CP-WRY-13, CP-WRY-08, CP-WRY-09 | 3 | n/a | 1 |
| [`UC-WRY-03`](use-cases/uc-wry-03-countries-and-regions.md) | — | CP-WRY-10, CP-WRY-11, CP-WRY-12 | 3 | 1 | 1 |

Las columnas Backend, Web y App cuentan los archivos de test que ejercen el caso; el detalle está en cada caso de uso. «n/a» indica que el caso no aplica a esa plataforma.
