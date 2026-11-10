# Pruebas

Casos de prueba del módulo: uno por el flujo principal de cada caso de uso y uno por cada flujo alternativo. Se pueden ejecutar a mano en la web y en la app; la columna de tests automáticos indica qué tests ejercen el caso de uso.

## Casos de prueba

| ID | Caso de uso | Pasos | Resultado esperado |
|---|---|---|---|
| `CP-SUP-01` | [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | 1) La persona abre «Acerca de Vinnot» o «Ayuda». 2) El cliente muestra el contenido en su idioma, que viaja con la app y no se pide a la API. 3) En la ayuda, la persona escribe en el buscador. 4) El cliente filtra las preguntas por título y texto, sin distinguir mayúsculas ni acentos. 5) La persona abre una respuesta o sigue a contacto o a los documentos legales. | La persona leyó la presentación o encontró una respuesta en la ayuda. |
| `CP-SUP-02` | [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | Flujo principal → 4a. Ninguna pregunta coincide | Se sugiere probar otra búsqueda o escribir al equipo. |
| `CP-SUP-03` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | 1) La persona abre Contacto. 2) Completa nombre, correo, motivo y mensaje; los motivos son soporte, privacidad, denuncia, revisión de una decisión, colaboración y consulta general. 3) El cliente genera un ID de solicitud y envía `POST /support/requests`. 4) La API valida los datos, guarda la consulta y deja en la cola un correo en inglés para el equipo, con respuesta directa a quien escribió. 5) Deja en la cola un acuse para el correo escrito, en el idioma del formulario, solo con la referencia y el motivo. 6) La API responde 202 con el ID; el cliente muestra la referencia `VIN-…` y permite copiarla. | La consulta quedó registrada, el equipo recibe un correo y la persona tiene una referencia. |
| `CP-SUP-04` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Flujo principal → 3a. Falla el envío | El formulario conserva lo escrito y reintentar el mismo contenido reutiliza el ID, sin duplicar la consulta. |
| `CP-SUP-05` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Flujo principal → 4a. Llega el mismo ID con otro contenido | La API responde 400. |
| `CP-SUP-06` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Flujo principal → 4b. El correo del equipo no está configurado | La API responde 503. |
| `CP-SUP-07` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Flujo principal → 3b. Se superó el límite de envíos | La API responde 429 y el cliente indica cuándo reintentar. |
| `CP-SUP-08` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Flujo principal → 5a. Esa dirección ya recibió un acuse hoy | No se envía otro. |
| `CP-SUP-09` | [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | 1) Una consulta falla o la persona llega a una dirección que no existe. 2) El cliente clasifica el error: sesión vencida (401), sin permiso (403), no encontrado (404), demasiados pedidos (429), servicio no disponible (502 o 503), demora (504 o tiempo agotado), sin conexión o error del servidor. 3) Muestra una ilustración con un mensaje y la acción que corresponde, como reintentar o volver al inicio. | La persona entiende qué pasó y qué puede hacer. |
| `CP-SUP-10` | [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | Flujo principal → 1a. La dirección no existe | Se muestra «no encontrado». |

## Matriz de trazabilidad

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | RF-WEB-SUP-01, RF-APK-SUP-01 | CP-SUP-01, CP-SUP-02 | 0 | 2 | 1 |
| [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | RF-WEB-SUP-02, RF-WEB-SUP-03, RF-WEB-SUP-04, RF-APK-SUP-02, RF-APK-SUP-03, RF-APK-SUP-04 | CP-SUP-03, CP-SUP-04, CP-SUP-05, CP-SUP-06, CP-SUP-07, CP-SUP-08 | 6 | 5 | 5 |
| [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | RF-WEB-SUP-05, RF-APK-SUP-05 | CP-SUP-09, CP-SUP-10 | 0 | 1 | 1 |

Las columnas Backend, Web y App cuentan los archivos de test que ejercen el caso; el detalle está en cada caso de uso. «n/a» indica que el caso no aplica a esa plataforma.
