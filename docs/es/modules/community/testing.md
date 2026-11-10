# Pruebas

Casos de prueba del módulo: uno por el flujo principal de cada caso de uso y uno por cada flujo alternativo. Se pueden ejecutar a mano en la web y en la app; la columna de tests automáticos indica qué tests ejercen el caso de uso.

## Casos de prueba

| ID | Caso de uso | Pasos | Resultado esperado |
|---|---|---|---|
| `CP-COM-01` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | 1) La persona elige «Denunciar» en el contenido o, en una reseña o un comentario, «Denunciar usuario» para quien lo escribió. 2) Elige un motivo: spam, acoso, odio, contenido sexual, violencia, privacidad, desinformación u otro. 3) Puede sumar una descripción de hasta 2000 caracteres. 4) El cliente envía `POST /community/reports` con el tipo y el ID del contenido, el motivo y la descripción. 5) La API comprueba que el contenido sea público y no sea de quien denuncia, y guarda el autor y un extracto del contenido. 6) La API guarda la denuncia como `OPEN` y devuelve el comprobante; el cliente confirma el envío. | La denuncia queda abierta para el equipo de moderación y la persona recibe un comprobante. |
| `CP-COM-02` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Flujo principal → 3a. El motivo es «Otro» y falta la descripción | No se puede enviar y la API responde 422 `INVALID_REPORT_DESCRIPTION`. |
| `CP-COM-03` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Flujo principal → 5a. La persona ya tiene una denuncia abierta sobre ese contenido | La API devuelve ese mismo comprobante sin crear otra. |
| `CP-COM-04` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Flujo principal → 5b. La persona superó 10 denuncias en 24 horas | La API responde 422 `REPORT_LIMIT` y el cliente explica que llegó al límite diario y que podrá volver a denunciar más tarde. |
| `CP-COM-05` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Flujo principal → 5c. El contenido es propio | La API responde 422 `SELF_REPORT` y el cliente avisa que no se puede denunciar el propio contenido. |
| `CP-COM-06` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Flujo principal → 5d. El contenido ya no es público | La API responde 404 y el cliente avisa que el contenido ya no está disponible. |
| `CP-COM-07` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Flujo principal → 4a. Se superó el límite de 10 envíos por hora | La API responde 429 y el cliente pide esperar un rato antes de reintentar. Las consultas a soporte siguen disponibles. |
| `CP-COM-08` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Flujo principal → 4b. Falla el envío | El cliente conserva el borrador para reintentar. |
| `CP-COM-09` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | 1) La persona elige «Bloquear» en la reseña o el comentario. 2) El cliente explica el efecto y pide confirmación. 3) El cliente envía `PUT /community/blocks/{userId}`. 4) La API guarda el bloqueo y responde 204. 5) El cliente descarta las reseñas, comentarios y perfiles guardados y los vuelve a cargar sin el contenido de esa cuenta. | La otra cuenta queda bloqueada para la persona. |
| `CP-COM-10` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Flujo principal → 2a. La persona cancela | No se bloquea nada. |
| `CP-COM-11` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Flujo principal → 4a. La cuenta ya estaba bloqueada | La API responde 204 igual. |
| `CP-COM-12` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Flujo principal → 4b. Es la propia cuenta | La API responde 422 `SELF_BLOCK` y el cliente avisa que no se puede bloquear la propia cuenta. |
| `CP-COM-13` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Flujo principal → 4c. La cuenta no existe | La API responde 404 y el cliente avisa que el contenido ya no está disponible. |
| `CP-COM-14` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Flujo principal → 4d. Falla el bloqueo | Se conserva la vista anterior. |
| `CP-COM-15` | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | 1) La persona abre su actividad de comunidad: en la web la página `/community`, desde el perfil; en la app desde el perfil. 2) El cliente pide `GET /community/overview` con los totales de denuncias por estado y la cantidad de cuentas bloqueadas. 3) Pide `GET /community/reports/mine` y `GET /community/blocks`, cada una paginada por separado. 4) Muestra cada denuncia con su objetivo, estado y fecha, y cada cuenta bloqueada con su nombre y fecha. | La persona ve sus denuncias y bloqueos, y puede desbloquear cuentas. |
| `CP-COM-16` | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | Flujo principal → 4a. La persona desbloquea una cuenta | El cliente envía `DELETE /community/blocks/{userId}`, la API responde 204 y la lista se actualiza. |
| `CP-COM-17` | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | Flujo principal → 4b. No hay denuncias ni bloqueos | Se muestra el estado vacío con un acceso a Contacto. |
| `CP-COM-18` | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | Flujo principal → 2a. Falla la consulta | Se muestra el error, no un cero. |
| `CP-COM-19` | [`UC-COM-04`](use-cases/uc-com-04-report-outcome-and-retention.md) | 1) Un moderador resuelve o descarta una denuncia, o retira el contenido denunciado ([Administración](../admin/README.md)). 2) La API encola un email `REPORT_OUTCOME` para quien denunció, con el resultado. 3) Si el contenido se retiró, su autor recibe un email `CONTENT_REMOVED`. 4) Cada hora la tarea programada elimina hasta 500 denuncias cerradas hace más de 90 días, con su historial de acciones. | Quien denunció conoce el resultado y las denuncias cerradas viejas se eliminan. |
| `CP-COM-20` | [`UC-COM-04`](use-cases/uc-com-04-report-outcome-and-retention.md) | Flujo principal → 2a. El mismo resultado ya se avisó | La clave del aviso evita un segundo email. |
| `CP-COM-21` | [`UC-COM-04`](use-cases/uc-com-04-report-outcome-and-retention.md) | Flujo principal → 4a. Hay más de 500 vencidas | El resto se elimina en las ejecuciones siguientes. |

## Matriz de trazabilidad

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | RF-WEB-COM-01, RF-WEB-COM-02, RF-APK-COM-01, RF-APK-COM-02 | CP-COM-01, CP-COM-02, CP-COM-03, CP-COM-04, CP-COM-05, CP-COM-06, CP-COM-07, CP-COM-08 | 4 | 4 | 2 |
| [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | RF-WEB-COM-03, RF-APK-COM-03 | CP-COM-09, CP-COM-10, CP-COM-11, CP-COM-12, CP-COM-13, CP-COM-14 | 2 | 2 | 1 |
| [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | RF-WEB-COM-04, RF-APK-COM-04 | CP-COM-15, CP-COM-16, CP-COM-17, CP-COM-18 | 2 | 2 | 1 |
| [`UC-COM-04`](use-cases/uc-com-04-report-outcome-and-retention.md) | — | CP-COM-19, CP-COM-20, CP-COM-21 | 4 | n/a | n/a |

Las columnas Backend, Web y App cuentan los archivos de test que ejercen el caso; el detalle está en cada caso de uso. «n/a» indica que el caso no aplica a esa plataforma.
