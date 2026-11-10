# Pruebas

Casos de prueba del módulo: uno por el flujo principal de cada caso de uso y uno por cada flujo alternativo. Se pueden ejecutar a mano en la web y en la app; la columna de tests automáticos indica qué tests ejercen el caso de uso.

## Casos de prueba

| ID | Caso de uso | Pasos | Resultado esperado |
|---|---|---|---|
| `CP-PAR-01` | [`UC-PAR-01`](use-cases/uc-par-01-list-own-events.md) | 1) La persona abre «Mis eventos»: en la web, `/partner/events`; en la app, desde el perfil. 2) El cliente pide `GET /partner/events`, de a 20. 3) La API toma el organizador de la sesión y devuelve solo sus eventos. 4) El cliente muestra cada evento con fecha, estado e inscripciones, y las acciones de editar, cancelar y ver inscripciones. | La persona ve sus eventos con su estado. |
| `CP-PAR-02` | [`UC-PAR-01`](use-cases/uc-par-01-list-own-events.md) | Flujo principal → 1a. La persona no es partner ni administradora | El cliente no muestra la sección y la API responde 403. |
| `CP-PAR-03` | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | 1) La persona elige «Crear evento». 2) Completa el editor por secciones: datos básicos y portada, ubicación en el mapa, contacto e inscripción. 3) En inscripción elige gratis o pago online con Mercado Pago, cupo, plazo y límite de entradas. 4) El cliente valida fechas, coordenadas, precio, cupo y contacto, y envía `POST /partner/events`. 5) La API usa a quien tiene la sesión como organizador, aplica las reglas del evento y devuelve `201` con el ID. | El evento quedó creado como borrador o publicado. |
| `CP-PAR-04` | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | Flujo principal → 2a. La persona cierra el editor sin guardar | El borrador queda en el dispositivo durante 7 días y se ofrece retomarlo. |
| `CP-PAR-05` | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | Flujo principal → 5a. El evento es pago y se pide publicarlo sin cuenta de Mercado Pago vinculada | La API lo rechaza; guardarlo como borrador sí se permite. |
| `CP-PAR-06` | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | Flujo principal → 4a. Algún dato no es válido | El editor abre la sección con el error. |
| `CP-PAR-07` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | 1) La persona elige editar un evento. 2) El cliente carga el detalle completo con `GET /events/{id}` y abre el editor. 3) La persona cambia datos o el estado: borrador, publicado o completado. El editor no ofrece «Cancelado»: para cancelar el evento se usa la acción «Cancelar evento» ([UC-PAR-04](use-cases/uc-par-04-cancel-event.md)). 4) El cliente envía `PUT /partner/events/{id}`, con el estado solo si cambió y con `clearFields` nombrando cada campo opcional que la persona vació. 5) La API comprueba que el evento sea de la persona, aplica solo los campos enviados, vacía los campos opcionales indicados en `clearFields` y aplica la transición de estado. | El evento quedó actualizado con su nuevo estado. |
| `CP-PAR-21` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Flujo principal → 4a. El estado no cambió, o el evento está agotado y el editor lo muestra como publicado | El cliente no envía el estado y la API conserva el actual. |
| `CP-PAR-23` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Flujo principal → 4b. La persona vació un campo opcional, como el teléfono de contacto o el sitio web | El cliente lo nombra en `clearFields` y la API lo borra. |
| `CP-PAR-08` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Flujo principal → 5a. El evento es de otra persona | La API responde 422. |
| `CP-PAR-09` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Flujo principal → 5b. La transición no está permitida, como volver a borrador un evento cancelado | La API responde 400. |
| `CP-PAR-10` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Flujo principal → 5c. El evento es pago, queda publicado o agotado y falta la cuenta de Mercado Pago | La API lo rechaza. |
| `CP-PAR-22` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Flujo principal → 5d. La solicitud pide pasar el evento a cancelado | La API responde 400 `USE_CANCEL_ENDPOINT`. |
| `CP-PAR-11` | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | 1) La persona elige «Cancelar evento». 2) El cliente muestra el diálogo con el motivo preseleccionado «Circunstancias imprevistas» y avisa que cancelar es definitivo, que el evento no se puede volver a publicar y que los pagos online se devuelven automáticamente por Mercado Pago, sin posibilidad de deshacerlo. 3) La persona confirma, cambiando el motivo si quiere. 4) El cliente envía `DELETE /partner/events/{id}` con el motivo. 5) La API comprueba la propiedad, cancela el evento sin borrarlo y responde `204`. | El evento quedó cancelado; quienes se inscribieron reciben el aviso y los pagos online se devuelven. |
| `CP-PAR-12` | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | Flujo principal → 3a. El motivo es «Otro» | Aparece una nota opcional de hasta 280 caracteres. |
| `CP-PAR-13` | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | Flujo principal → 3b. La persona elige «Mantener evento» | No se cancela. |
| `CP-PAR-14` | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | Flujo principal → 5a. El evento está finalizado | La API responde 400. |
| `CP-PAR-15` | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | 1) La persona abre las inscripciones de un evento. 2) El cliente pide `GET /events/{eventId}/registrations` y muestra cada inscripción con su estado. 3) El cliente ofrece solo las acciones posibles según el estado y si el evento es pago. 4) La persona aprueba, pone en espera o rechaza, con una nota opcional. 5) El cliente envía `PATCH /events/{eventId}/registrations/{registrationId}` y la API aplica la transición. | Las inscripciones revisadas quedaron aprobadas, en espera o rechazadas. |
| `CP-PAR-16` | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | Flujo principal → 4a. Rechazar pide confirmación. | Rechazar pide confirmación. |
| `CP-PAR-17` | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | Flujo principal → 5a. El evento es de otra persona | La API lo rechaza aunque se conozca el ID. |
| `CP-PAR-18` | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | Flujo principal → 5b. La inscripción ya está confirmada o terminada | No se puede rechazar. |
| `CP-PAR-19` | [`UC-PAR-06`](use-cases/uc-par-06-organizer-notices.md) | 1) El sistema envía un correo al organizador por cada inscripción nueva. 2) Suma confirmadas, solicitadas y canceladas del evento durante 15 minutos. 3) Una tarea revisa cada minuto los resúmenes vencidos. 4) Envía un push por evento con los totales, que abre los eventos del organizador. | El organizador recibió un correo por cada inscripción y un push con los totales. |
| `CP-PAR-20` | [`UC-PAR-06`](use-cases/uc-par-06-organizer-notices.md) | Flujo principal → 4a. El evento se canceló | El resumen se descarta. |

## Matriz de trazabilidad

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-PAR-01`](use-cases/uc-par-01-list-own-events.md) | RF-WEB-PAR-01, RF-APK-PAR-01 | CP-PAR-01, CP-PAR-02 | 0 | 4 | 4 |
| [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | RF-WEB-PAR-02, RF-APK-PAR-02 | CP-PAR-03, CP-PAR-04, CP-PAR-05, CP-PAR-06 | 1 | 2 | 3 |
| [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | RF-WEB-PAR-03, RF-WEB-PAR-04, RF-APK-PAR-03, RF-APK-PAR-04 | CP-PAR-07, CP-PAR-21, CP-PAR-23, CP-PAR-08, CP-PAR-09, CP-PAR-10, CP-PAR-22 | 4 | 4 | 2 |
| [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | RF-WEB-PAR-05, RF-APK-PAR-05 | CP-PAR-11, CP-PAR-12, CP-PAR-13, CP-PAR-14 | 2 | 2 | 3 |
| [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | RF-WEB-PAR-06, RF-WEB-PAR-07, RF-APK-PAR-06, RF-APK-PAR-07 | CP-PAR-15, CP-PAR-16, CP-PAR-17, CP-PAR-18 | 2 | 0 | 2 |
| [`UC-PAR-06`](use-cases/uc-par-06-organizer-notices.md) | — | CP-PAR-19, CP-PAR-20 | 3 | n/a | n/a |

Las columnas Backend, Web y App cuentan los archivos de test que ejercen el caso; el detalle está en cada caso de uso. «n/a» indica que el caso no aplica a esa plataforma.
