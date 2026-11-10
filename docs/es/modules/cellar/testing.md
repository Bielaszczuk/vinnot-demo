# Pruebas

Casos de prueba del módulo: uno por el flujo principal de cada caso de uso y uno por cada flujo alternativo. Se pueden ejecutar a mano en la web y en la app; la columna de tests automáticos indica qué tests ejercen el caso de uso.

## Casos de prueba

| ID | Caso de uso | Pasos | Resultado esperado |
|---|---|---|---|
| `CP-CEL-01` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | 1) La persona abre «Mi Bodega»: en la web desde el menú o el inicio; en la app desde el inicio, el perfil o la ficha de un vino. 2) El cliente pide `GET /cellar`. 3) La API devuelve solo las entradas de la persona, cada una con el vino, el puntaje personal, el precio de compra, las notas, las fechas y la reseña propia si existe. 4) El cliente calcula la cantidad de vinos, el promedio de los puntuados, las regiones distintas y la mezcla de tipos de vino; no suma un total invertido. 5) Muestra las métricas y la lista de vinos. | Se muestran los vinos de su cava con sus datos personales y las métricas de la colección. |
| `CP-CEL-02` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | Flujo principal → 3a. La cava está vacía | Se muestra el estado vacío con un acceso para agregar vinos. |
| `CP-CEL-03` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | Flujo principal → 5a. En la app la persona busca por nombre, bodega, región, país o notas, o filtra entre todos, con puntaje o con notas | La lista se filtra en el dispositivo. |
| `CP-CEL-04` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | Flujo principal → 5b. En la app la persona tira hacia abajo | La lista se recarga. |
| `CP-CEL-05` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | Flujo principal → 2a. Falla la consulta | Se muestra el error con opción de reintentar. |
| `CP-CEL-06` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | 1) En la web la persona elige «Agregar a mi bodega» en la ficha del vino; en la app usa el botón de la ficha o el botón de agregar de la cava y busca el vino. 2) Carga, si quiere, un puntaje de 0.1 a 5.0, notas y el precio de compra. 3) El cliente envía `POST /cellar` con el vino y esos datos. 4) La API comprueba que el vino no esté ya en la cava de la persona y guarda la entrada. 5) La API responde 201 y el cliente confirma («Agregaste el vino a tu bodega» en la web) y actualiza la cava. | El vino queda en la cava de la persona con los datos que cargó. |
| `CP-CEL-07` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | Flujo principal → 1a. El vino ya está en la cava | La web lo indica en la ficha y la app abre la cava en lugar del formulario. |
| `CP-CEL-08` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | Flujo principal → 4a. El vino ya está en la cava | La API responde 422, o 409 si llegaron dos pedidos a la vez. |
| `CP-CEL-26` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | Flujo principal → 1b. En el buscador de la app aparece un vino que ya está en la cava | Se muestra con «Ya está en tu bodega» y no se puede elegir. |
| `CP-CEL-09` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | Flujo principal → 3a. El puntaje está fuera de 0.1 a 5.0 o tiene más de un decimal, el precio es negativo o las notas superan 10000 caracteres | La API responde 400. |
| `CP-CEL-10` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | 1) La persona elige «Editar notas» en un vino de su cava. 2) El formulario se abre con el puntaje, las notas y el precio actuales. 3) La persona cambia los datos y guarda. 4) El cliente envía `PATCH /cellar/{id}` con los tres datos. 5) La API comprueba que la entrada sea de la persona y reemplaza los tres datos, también los vacíos. 6) La API responde 200 y el cliente actualiza la entrada y las métricas. | La entrada queda con el puntaje, el precio y las notas nuevos. |
| `CP-CEL-11` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | Flujo principal → 3a. En la web la persona toca la estrella elegida | El puntaje se borra. |
| `CP-CEL-12` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | Flujo principal → 5a. La entrada es de otra persona | La API responde 422 `CELLAR_ENTRY_OWNERSHIP`. |
| `CP-CEL-13` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | Flujo principal → 5b. La entrada ya no existe | La API responde 404. |
| `CP-CEL-14` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | Flujo principal → 4a. Un dato está fuera de rango | La API responde 400. |
| `CP-CEL-15` | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | 1) La persona elige «Eliminar» en la web, o en la app elige «Eliminar» en el menú «⋯» de la entrada o la desliza. 2) El cliente pide confirmación. 3) El cliente envía `DELETE /cellar/{id}`. 4) La API comprueba que la entrada sea de la persona y la elimina. 5) La API responde 204 y el cliente quita el vino, actualiza las métricas y, en la web, avisa «Quitaste el vino de tu bodega». | El vino ya no está en la cava; el vino del catálogo y la reseña siguen. |
| `CP-CEL-16` | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | Flujo principal → 2a. La persona cancela | No se elimina nada. |
| `CP-CEL-17` | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | Flujo principal → 4a. La entrada es de otra persona | La API responde 422 `CELLAR_ENTRY_OWNERSHIP`. |
| `CP-CEL-18` | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | Flujo principal → 4b. La entrada ya no existe | La API responde 404. |
| `CP-CEL-19` | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | 1) La persona elige publicar la reseña desde un vino de su cava. 2) El cliente pide `GET /wines/{wineId}/reviews/mine` para saber si ya tiene una reseña. 3) El formulario de reseña se abre con el puntaje y las notas de la cava como borrador. 4) La persona revisa el borrador y confirma. 5) El cliente publica la reseña con `POST /wines/{wineId}/reviews` ([UC-REV-02](../reviews/use-cases/uc-rev-02-publish-review.md)). | La nota queda publicada como reseña del vino, o se abre la reseña que ya existía. |
| `CP-CEL-20` | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | Flujo principal → 2a. Ya existe una reseña propia | La web abre la ficha del vino en esa reseña (`?review=mine`) y la app la muestra para editar; no se reemplaza sola. |
| `CP-CEL-21` | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | Flujo principal → 3a. La cava no tiene puntaje | Hay que elegir un puntaje antes de publicar (estrellas en la web, copas en la app). |
| `CP-CEL-22` | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | Flujo principal → 4a. La persona cancela | No se publica nada y la cava no cambia. |
| `CP-CEL-23` | [`UC-CEL-06`](use-cases/uc-cel-06-cellar-statistics.md) | 1) Se pide `GET /cellar/stats` para la cava propia o `GET /cellar/user/{userId}/stats` para otra. 2) La API comprueba que quien consulta sea el dueño o un administrador. 3) Calcula la cantidad de vinos, los puntuados, el promedio, las bodegas y regiones distintas y la cantidad por tipo de vino. 4) Devuelve `CellarStatsResponse`. | Se devuelven las estadísticas o las entradas de la cava pedida. |
| `CP-CEL-24` | [`UC-CEL-06`](use-cases/uc-cel-06-cellar-statistics.md) | Flujo principal → 1a. Se pide la lista de otra persona con `GET /cellar/user/{userId}` | Se aplica la misma comprobación. |
| `CP-CEL-25` | [`UC-CEL-06`](use-cases/uc-cel-06-cellar-statistics.md) | Flujo principal → 2a. Quien consulta no es el dueño ni administrador | La API responde 403. |

## Matriz de trazabilidad

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | RF-WEB-CEL-01, RF-WEB-CEL-02, RF-WEB-CEL-03, RF-APK-CEL-01, RF-APK-CEL-02, RF-APK-CEL-03, RF-APK-CEL-04 | CP-CEL-01, CP-CEL-02, CP-CEL-03, CP-CEL-04, CP-CEL-05 | 3 | 3 | 3 |
| [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | RF-WEB-CEL-04, RF-APK-CEL-05 | CP-CEL-06, CP-CEL-07, CP-CEL-08, CP-CEL-26, CP-CEL-09 | 2 | 3 | 2 |
| [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | RF-WEB-CEL-05, RF-APK-CEL-06 | CP-CEL-10, CP-CEL-11, CP-CEL-12, CP-CEL-13, CP-CEL-14 | 3 | 1 | 1 |
| [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | RF-WEB-CEL-06, RF-APK-CEL-07 | CP-CEL-15, CP-CEL-16, CP-CEL-17, CP-CEL-18 | 2 | 3 | 1 |
| [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | RF-WEB-CEL-07, RF-APK-CEL-08 | CP-CEL-19, CP-CEL-20, CP-CEL-21, CP-CEL-22 | 1 | 1 | 1 |
| [`UC-CEL-06`](use-cases/uc-cel-06-cellar-statistics.md) | — | CP-CEL-23, CP-CEL-24, CP-CEL-25 | 2 | n/a | n/a |

Las columnas Backend, Web y App cuentan los archivos de test que ejercen el caso; el detalle está en cada caso de uso. «n/a» indica que el caso no aplica a esa plataforma.
