# Pruebas

Casos de prueba del módulo: uno por el flujo principal de cada caso de uso y uno por cada flujo alternativo. Se pueden ejecutar a mano en la web y en la app; la columna de tests automáticos indica qué tests ejercen el caso de uso.

## Casos de prueba

| ID | Caso de uso | Pasos | Resultado esperado |
|---|---|---|---|
| `CP-RTE-01` | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | 1) La persona abre Rutas del vino. 2) El cliente pide `GET /wine-routes`, de a 20 rutas. 3) La API devuelve solo rutas publicadas. 4) El cliente muestra cada ruta con portada, país, región, largo, cantidad de paradas, distancia y duración. 5) La persona filtra por texto, largo, país o región. | La persona ve las rutas publicadas y puede filtrarlas. |
| `CP-RTE-02` | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | Flujo principal → 5a. Los filtros se aplican sobre las rutas ya cargadas | En la web, sobre la página actual; en la app, sobre las páginas acumuladas con «Cargar más». |
| `CP-RTE-03` | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | Flujo principal → 3a. No hay rutas | Se muestra el estado vacío. |
| `CP-RTE-04` | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | Flujo principal → 2a. Más de 100 por página o un texto de más de 512 caracteres | La API responde 422. |
| `CP-RTE-05` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | 1) El cliente pide `GET /wine-routes/{id}`. 2) La API devuelve la ruta con sus paradas ordenadas y, para las paradas de tipo bodega, los datos de la bodega con el mismo nombre. 3) El cliente muestra portada, descripción, largo, distancia, duración y tipos de vino recomendados. 4) Muestra las paradas en una línea de tiempo; cada parada se expande con su descripción, dirección y contactos. | La persona ve la ruta con sus paradas en orden. |
| `CP-RTE-06` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | Flujo principal → 2a. La ruta no está publicada y quien consulta no la creó ni es moderador o administrador | La API responde 404. |
| `CP-RTE-07` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | Flujo principal → 3a. Las paradas tienen duración | La duración total es la suma de las paradas; si no, se usa la estimación de la ruta en minutos. |
| `CP-RTE-13` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | Flujo principal → 3b. Ni las paradas ni la ruta tienen duración en minutos | Se muestra la estimación en días («N días»); sin ninguna, la web muestra «—» y la app no muestra la duración. |
| `CP-RTE-14` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | Flujo principal → 3c. La ruta no tiene largo cargado | No se muestra la etiqueta de largo. |
| `CP-RTE-08` | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | 1) La persona ve las paradas en un mapa: en la web, el mapa embebido de la ruta; en la app, un mapa con un marcador por parada. 2) Elige abrir una parada en mapas: el cliente arma la dirección de Google Maps con sus coordenadas o su dirección. 3) O elige navegar la ruta completa: el cliente arma un recorrido de Google Maps en auto con origen, destino y paradas intermedias en orden. 4) El sistema abre la aplicación o la página de mapas. | La aplicación de mapas abre la parada o el recorrido completo. |
| `CP-RTE-09` | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | Flujo principal → 3a. La ruta no tiene paradas | La navegación queda deshabilitada. |
| `CP-RTE-10` | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | Flujo principal → 4a. El sistema no puede abrir el enlace | La app muestra un aviso. |
| `CP-RTE-11` | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | 1) La persona elige «Compartir». 2) El cliente genera el enlace público de la ruta y abre la hoja de compartir del sistema o copia el enlace ([Compartir](../sharing/README.md)). 3) O la persona elige «Denunciar» y sigue el flujo de denuncia ([Comunidad](../community/README.md)). | La ruta se compartió o quedó denunciada. |
| `CP-RTE-15` | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | Flujo principal → 1a. La ruta no está publicada (borrador o archivada, visible solo para quien la creó y el equipo) | No se ofrece «Compartir». |
| `CP-RTE-12` | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | Flujo principal → 3a. La persona cancela la denuncia | No se envía nada. |

## Matriz de trazabilidad

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | RF-WEB-RTE-01, RF-WEB-RTE-02, RF-APK-RTE-01, RF-APK-RTE-02 | CP-RTE-01, CP-RTE-02, CP-RTE-03, CP-RTE-04 | 1 | 2 | 3 |
| [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | RF-WEB-RTE-03, RF-WEB-RTE-04, RF-APK-RTE-03, RF-APK-RTE-04 | CP-RTE-05, CP-RTE-06, CP-RTE-07, CP-RTE-13, CP-RTE-14 | 3 | 2 | 2 |
| [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | RF-WEB-RTE-05, RF-WEB-RTE-06, RF-APK-RTE-05, RF-APK-RTE-06 | CP-RTE-08, CP-RTE-09, CP-RTE-10 | 0 | 0 | 3 |
| [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | RF-WEB-RTE-07, RF-APK-RTE-07 | CP-RTE-11, CP-RTE-15, CP-RTE-12 | 0 | 3 | 3 |

Las columnas Backend, Web y App cuentan los archivos de test que ejercen el caso; el detalle está en cada caso de uso. «n/a» indica que el caso no aplica a esa plataforma.
