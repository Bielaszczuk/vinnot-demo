# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-PAY-01` | Pagar online una inscripción paga. | Con importe y estado REQUESTED/AWAITING_PAYMENT y pago PENDING/REPORTED se abre el checkout de Mercado Pago; el pago sólo se confirma cuando el servidor lo verifica con Mercado Pago, nunca desde la UI. | [`UC-PAY-01`](use-cases/uc-pay-01-pay-registration.md) | `RF-WEB-REG-005` |
| `RF-WEB-PAY-02` | Volver del checkout y consultar el recibo. | `/payments/return` consulta `GET /payments/receipt` sin sesión, reconsulta mientras está PENDING y ofrece `vinnot://payments/return` si se pidió volver a la app; la URL no confirma el pago. | [`UC-PAY-02`](use-cases/uc-pay-02-checkout-return.md) | `RF-WEB-REG-012` |
| `RF-WEB-PAY-03` | Gestionar inscripciones pagas sin acreditar pagos. | En pagas REQUESTED/AWAITING_PAYMENT sólo se ofrece REJECT; no hay acreditación manual. Cuando el servidor lo habilita, el organizador solicita la devolución con `POST /payments/checkouts/{id}/refund` y ve su estado; si Mercado Pago la rechaza, recibe el motivo por correo y puede reintentarla con el mismo pedido. | [`UC-PAY-04`](use-cases/uc-pay-04-refund-registration.md) | `RF-WEB-REG-008` |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-PAY-01` | Pagar en línea una inscripción habilitada. | Con importe mayor a cero, estado REQUESTED o AWAITING_PAYMENT y pago PENDING o REPORTED (`canStartOnlinePayment`), la app abre el checkout de Mercado Pago. El regreso del checkout no confirma el pago: sólo la verificación del servidor con Mercado Pago lo confirma. | [`UC-PAY-01`](use-cases/uc-pay-01-pay-registration.md) | `RF-APK-REG-005` |
| `RF-APK-PAY-02` | Limitar acciones del gestor sobre el pago. | Gestión sólo ofrece APPROVE, WAITLIST o REJECT según estado (`allowedRegistrationActions`); una solicitud paga REQUESTED, AWAITING_PAYMENT o AWAITING_ATTENDEE_CONFIRMATION sólo admite REJECT. El gestor no confirma pagos: esa confirmación sale exclusivamente de la verificación del servidor con Mercado Pago. Una devolución que Mercado Pago rechazó se puede reintentar desde la misma hoja. | [`UC-PAY-04`](use-cases/uc-pay-04-refund-registration.md) | `RF-APK-REG-008` |

## Comisión

Estas reglas se aplican en la web, la app y el backend:

- La comisión de Vinnot sale de la política vigente (`app.payments.commission.*`, por defecto 300 puntos básicos y `VINNOT_3_PERCENT_V1`), no de un valor fijo en el código.
- Cada intento de pago guarda los puntos básicos y la política con los que se creó, y se concilia siempre con ellos aunque la tasa cambie después.
- `/partner/payments` y el editor de eventos (web y app) muestran el porcentaje que informa `GET /payments/mercadopago/account`; sin un valor válido no muestran ninguno.

## Cuentas borradas

Estas reglas se aplican en el backend:

- Borrar la cuenta de un comprador o de un organizador no borra sus pagos: los intentos de pago, sus observaciones y devoluciones se conservan como historial financiero de la operación, sin vínculo a la cuenta borrada.
- Un pago aprobado que nunca se acreditó y cuyo comprador ya no existe se devuelve, porque no hay entrada que emitir. Un pago ya acreditado queda como está.
- Desde Vinnot no se puede pedir la devolución de un pago cuyo comprador u organizador ya no existe; se hace desde el panel de Mercado Pago.
- Ningún aviso de pago se envía a una cuenta borrada.
