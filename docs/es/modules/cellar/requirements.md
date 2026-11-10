# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-CEL-01` | Consultar la colección personal. | Sólo obtiene entradas del titular, con vino, rating personal, precio de compra, notas y fecha. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-WEB-CELLAR-001` |
| `RF-WEB-CEL-02` | Consultar métricas de colección. | Cantidad y promedio se derivan de entradas disponibles; bodega no registra cantidades de botellas ni compras online. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-WEB-CELLAR-006` |
| `RF-WEB-CEL-03` | Editar bodega mediante modal y resumen de colección. | /cellar ofrece edición/eliminación y las mismas métricas que la app (cantidad, promedio, regiones distintas y mezcla de tipos), sin total invertido; no ofrece el gesto swipe exclusivo de mobile. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-WEB-WEBX-007` |
| `RF-WEB-CEL-04` | Agregar un vino del catálogo. | Selecciona wineId y opciones personales; pertenencia existente no crea una segunda entrada para el mismo vino/usuario. | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | `RF-WEB-CELLAR-002` |
| `RF-WEB-CEL-05` | Editar datos de una entrada. | Rating opcional de 0.1 a 5.0 con un decimal, precio no negativo y notas de hasta 10000 caracteres; no modifica la ficha pública del vino. Guardar mantiene estos datos personales; la tarjeta dice «Editar notas». | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | `RF-WEB-CELLAR-003` |
| `RF-WEB-CEL-06` | Quitar un vino con confirmación. | Elimina la entrada por su ID y ownership; no elimina el vino del catálogo ni la reseña pública. | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | `RF-WEB-CELLAR-004` |
| `RF-WEB-CEL-07` | Sincronizar una reseña con la bodega. | Crear/editar reseña agrega o sincroniza rating/comentario personal en bodega, sin borrar las notas cuando la reseña no trae comentario; quitar sólo de bodega no borra reseña. Desde Bodega se puede revisar y publicar explícitamente una nota como reseña; una reseña existente se abre para editar, sin reemplazo automático. «Ver reseña» abre la reseña propia en el vino aunque no esté en la primera página; «Publicar como reseña» se ofrece sólo si no existe. | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | `RF-WEB-CELLAR-005` |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-CEL-01` | Consultar la colección personal. | Sólo obtiene entradas del titular, con vino, rating personal, precio de compra, notas y fecha. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-APK-CELLAR-001` |
| `RF-APK-CEL-02` | Consultar métricas de colección. | Cantidad, promedio, regiones distintas y mezcla de tipos se derivan de entradas disponibles; no se muestra un total invertido; bodega no registra cantidades de botellas ni compras online. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-APK-CELLAR-006` |
| `RF-APK-CEL-03` | Abrir la bodega desde Inicio/detalle/estadísticas. | Tarjeta Vinos en bodega del Perfil es pulsable incluso en cero; volver conserva origen o retorna a Inicio sin historial. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-APK-APKX-003` |
| `RF-APK-CEL-04` | Filtrar y quitar entradas con gestos de bodega. | Bodega permite buscar, todas/con rating/con notas, refrescar, un menú de tres puntos por vino (editar notas, ver o publicar la reseña, abrir el vino, eliminar) y eliminar deslizando con confirmación. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-APK-APKX-004` |
| `RF-APK-CEL-05` | Agregar un vino del catálogo. | Selecciona wineId y opciones personales; pertenencia existente no crea una segunda entrada para el mismo vino/usuario. | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | `RF-APK-CELLAR-002` |
| `RF-APK-CEL-06` | Editar datos de una entrada. | Rating opcional de 0.1 a 5.0 con un decimal, precio no negativo y notas de hasta 10000 caracteres; no modifica la ficha pública del vino. Guardar mantiene estos datos personales; la tarjeta dice «Editar notas». | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | `RF-APK-CELLAR-003` |
| `RF-APK-CEL-07` | Quitar un vino con confirmación. | Elimina la entrada por su ID y ownership; no elimina el vino del catálogo ni la reseña pública. | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | `RF-APK-CELLAR-004` |
| `RF-APK-CEL-08` | Sincronizar una reseña con la bodega. | Crear/editar reseña agrega o sincroniza rating/comentario personal en bodega, sin borrar las notas cuando la reseña no trae comentario; quitar sólo de bodega no borra reseña. Desde Bodega se puede revisar y publicar explícitamente una nota como reseña; una reseña existente se abre para editar, sin reemplazo automático. «Ver reseña» abre la reseña propia en el vino aunque no esté en la primera página; «Publicar como reseña» se ofrece sólo si no existe. | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | `RF-APK-CELLAR-005` |
