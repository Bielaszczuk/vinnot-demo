# Pagos

Cobro de inscripciones a eventos pagos con Mercado Pago: el checkout, el recibo que
ve quien pagó, la cuenta de cobro de cada organizador, las devoluciones y las tareas
que confirman cobros y renuevan credenciales. Vinnot cobra una comisión configurable
(hoy el 3 %, política `VINNOT_3_PERCENT_V1`) con el modelo de split de Mercado Pago; el dinero lo mueve Mercado Pago y Vinnot guarda la
decisión y el estado de cada inscripción ([Eventos](../events/README.md)).

- Código del módulo: `PAY`.
- Backend: paquete [`payment`](../../../../backend/src/main/java/com/vinnot/payment/).
- [Casos de uso](use-cases/README.md) · [Requisitos](requirements.md) ·
  [Arquitectura](architecture.md) · [Pruebas](testing.md)

## Actores

| Actor | Qué hace en este módulo |
|---|---|
| Usuario autenticado | Paga su inscripción y ve el recibo |
| Organizador o administrador | Vincula su cuenta de Mercado Pago y devuelve pagos de inscripciones |
| Mercado Pago | Cobra, avisa cambios y ejecuta devoluciones |
| Sistema (tareas programadas) | Concilia pagos, envía devoluciones y renueva credenciales |

## Reglas de negocio

| Regla | Detalle | Dónde |
|---|---|---|
| Confirmación | Solo el servidor confirma un pago, leyéndolo desde Mercado Pago; el regreso del checkout y el aviso no acreditan nada | [`ReconcilePaymentsService.java`](../../../../backend/src/main/java/com/vinnot/payment/application/service/ReconcilePaymentsService.java) |
| Comisión | Porcentaje de la política vigente (por defecto 300 puntos básicos, `VINNOT_3_PERCENT_V1`) sobre el total en ARS, redondeado una vez a centavos y descontado al vendedor. Cada intento guarda su política y se valida siempre con ella | [`TicketPaymentQuote.java`](../../../../backend/src/main/java/com/vinnot/payment/domain/valueobject/TicketPaymentQuote.java), [`CommissionPolicy.java`](../../../../backend/src/main/java/com/vinnot/payment/domain/valueobject/CommissionPolicy.java) |
| Entorno | `SANDBOX`, `LIVE_PILOT` (un vendedor, hasta ARS 50) o `LIVE` (vendedores reales distintos de la plataforma) | [`PaymentExecutionPolicy.java`](../../../../backend/src/main/java/com/vinnot/payment/application/service/PaymentExecutionPolicy.java) |
| Eventos pagos | Publicar un evento pago o inscribirse en uno exige cobros activos y la cuenta del organizador vigente | [`OnlineEventPaymentAvailability.java`](../../../../backend/src/main/java/com/vinnot/payment/application/service/OnlineEventPaymentAvailability.java) |
| Un intento por inscripción | Se congela importe, vendedor y vencimiento; reintentar lo reutiliza | [`EventCheckoutReservationService.java`](../../../../backend/src/main/java/com/vinnot/payment/application/service/EventCheckoutReservationService.java) |
| Un pago acreditado | Cada intento acredita como mucho un pago; los tardíos o duplicados se devuelven | [`ApplyProviderPaymentService.java`](../../../../backend/src/main/java/com/vinnot/payment/application/service/ApplyProviderPaymentService.java) |
| Cancelación | Si el evento se cancela, los pagos en línea acreditados se devuelven solos | [`ApplyProviderPaymentService.java`](../../../../backend/src/main/java/com/vinnot/payment/application/service/ApplyProviderPaymentService.java) |
| Devoluciones | Totales, pedidas por el organizador o un administrador, de pagos aprobados sin revisión; una devolución que Mercado Pago rechazó se puede volver a pedir | [`RequestPaymentRefundService.java`](../../../../backend/src/main/java/com/vinnot/payment/application/service/RequestPaymentRefundService.java) |
| Recibo | Cifrado, válido 7 días y sin datos de la persona | [`EncryptedPaymentReceiptAccess.java`](../../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/EncryptedPaymentReceiptAccess.java) |
| Credenciales | Cifradas con AES-GCM; se renuevan un día antes de vencer | [`RenewPaymentCredentialsService.java`](../../../../backend/src/main/java/com/vinnot/payment/application/service/RenewPaymentCredentialsService.java) |
| Avisos firmados | HMAC-SHA256 con margen de 10 minutos | [`MercadoPagoWebhookSignature.java`](../../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/MercadoPagoWebhookSignature.java) |

## Estados de un intento de checkout

```mermaid
stateDiagram-v2
    [*] --> PREPARED: se prepara desde la reserva
    PREPARED --> CREATING: se reclama antes de llamar a Mercado Pago
    CREATING --> READY: preferencia creada
    CREATING --> UNCERTAIN: respuesta perdida o inválida
    READY --> [*]
    UNCERTAIN --> [*]
```

[Ver diagrama de «Estados de un intento de checkout» completo](https://images.vinnot.com/docs/diagrams/v1/es/modules-payments-readme-6eda52ffd0aa.svg)

Un intento `UNCERTAIN` o detenido en `CREATING` no admite otro checkout; la conciliación
recupera lo que haya pasado en Mercado Pago.

## Estados de una devolución

```mermaid
stateDiagram-v2
    [*] --> PREPARED: se pide la devolución
    PREPARED --> SENDING: se envía a Mercado Pago
    SENDING --> SUCCEEDED: el pago releído figura devuelto
    SENDING --> UNCERTAIN: respuesta perdida
    UNCERTAIN --> SUCCEEDED: el pago releído figura devuelto
    SENDING --> REVIEW: devolución parcial
    SENDING --> REJECTED: Mercado Pago la rechaza
    REJECTED --> PREPARED: el organizador la vuelve a pedir
    SUCCEEDED --> [*]
    REVIEW --> [*]
```

[Ver diagrama de «Estados de una devolución» completo](https://images.vinnot.com/docs/diagrams/v1/es/modules-payments-readme-112ded119ce0.svg)

Una devolución `UNCERTAIN` nunca se vuelve a enviar: solo se verifica releyendo el pago.
Una `REJECTED` no movió dinero y tampoco se reenvía sola; el organizador recibe un correo
y puede pedirla otra vez. Mientras no se confirma, quien pagó la sigue viendo como
pendiente.

## Estado de un pago en Mercado Pago

```mermaid
stateDiagram-v2
    [*] --> PENDING: notificación o conciliación
    [*] --> APPROVED: notificación
    PENDING --> APPROVED: Mercado Pago lo aprueba
    PENDING --> REJECTED: Mercado Pago lo rechaza
    PENDING --> CANCELLED: Mercado Pago lo cancela
    APPROVED --> REFUNDED: devolución total
    APPROVED --> IN_MEDIATION: reclamo
    APPROVED --> CHARGED_BACK: contracargo
    IN_MEDIATION --> APPROVED: reclamo ganado
    IN_MEDIATION --> CHARGED_BACK: reclamo perdido
    REFUNDED --> [*]
    CHARGED_BACK --> [*]
```

[Ver diagrama de «Estado de un pago en Mercado Pago» completo](https://images.vinnot.com/docs/diagrams/v1/es/modules-payments-readme-d351fa7a308b.svg)

`ProviderPayment.Status` copia lo que informa Mercado Pago (pending, in_process y
authorized quedan como PENDING). Vinnot no fuerza cada flecha: descarta una
lectura más vieja que la guardada, una que baje el monto devuelto o una que
saque al pago de un estado revertido (devuelto del todo o contracargado). Un pago
aprobado confirma la inscripción si sigue siendo elegible; si no, se pide la
devolución. Un pago devuelto, contracargado o en mediación cancela la
inscripción.

## Estado del comprobante

```mermaid
flowchart TD
    A{"en revisión, IN_MEDIATION o CHARGED_BACK"} -->|sí| R[REVIEW]
    A -->|no| B{"pago REFUNDED"}
    B -->|sí| RF[REFUNDED]
    B -->|no| C{"pago APPROVED"}
    C -->|sí| D{"inscripción CONFIRMED"}
    D -->|sí| OK[CONFIRMED]
    D -->|no| RP[REFUND_PENDING]
    C -->|no| E{"pago REJECTED o CANCELLED, o inscripción EXPIRED o CANCELLED"}
    E -->|sí| NC[NOT_COMPLETED]
    E -->|no| P[PENDING]
```

[Ver diagrama de «Estado del comprobante» completo](https://images.vinnot.com/docs/diagrams/v1/es/modules-payments-readme-8ecec6ce2cee.svg)

`PaymentReceiptStatus` no se guarda: `PaymentReceiptStatus.from` lo calcula con
el estado del pago, el de la inscripción y la marca de revisión, en ese orden. Es
lo que ve quien pagó y no incluye montos, identidades ni datos del evento.

## Dónde vive

| Parte | Ubicación |
|---|---|
| API | Controllers en [`payment/infrastructure/web`](../../../../backend/src/main/java/com/vinnot/payment/infrastructure/web/), bajo `/payments` y `/events/{eventId}/registrations/{registrationId}/checkout` |
| Web | Pago en el detalle del evento, regreso en [`PaymentReturnPage`](../../../../frontend-react/src/presentation/pages/events/PaymentReturnPage.tsx) y cuenta de cobro en [`PaymentAccountPage`](../../../../frontend-react/src/presentation/pages/partner/PaymentAccountPage.tsx) |
| App | Pago en el detalle del evento, regreso en `frontend-mobile/app/payments/return.tsx` y vinculación en el editor de eventos |

## Datos

```mermaid
erDiagram
    users ||--o| payment_accounts : vincula
    users ||--o| payment_connection_attempts : inicia
    event_registrations ||--o| payment_checkout_attempts : "se paga con"
    payment_checkout_attempts ||--|| payment_reconciliation_jobs : concilia
    payment_checkout_attempts ||--o{ payment_observations : observa
    payment_observations ||--o| payment_refund_intents : devuelve
    payment_accounts {
        uuid owner_id PK
        varchar provider PK
        varchar environment PK
        varchar seller_id
        text access_token_ciphertext
        text refresh_token_ciphertext
        timestamptz expires_at
        varchar pending_state_hash
    }
    payment_connection_attempts {
        uuid owner_id PK
        varchar state_hash
        text verifier_ciphertext
        timestamptz expires_at
    }
    payment_checkout_attempts {
        uuid id PK
        uuid registration_id FK
        uuid event_id FK
        uuid buyer_id FK
        uuid organizer_id FK
        varchar environment
        varchar seller_id
        numeric unit_price
        integer quantity
        numeric total_amount
        numeric commission_amount
        integer commission_basis_points
        varchar commission_policy
        timestamptz expires_at
        varchar status
        varchar provider_reference
        boolean return_to_app
    }
    payment_reconciliation_jobs {
        uuid attempt_id PK
        bigint revision
        timestamptz lease_until
        timestamptz next_check_at
        integer failures
    }
    payment_observations {
        varchar payment_id PK
        uuid attempt_id FK
        numeric amount
        numeric application_fee
        numeric refunded_amount
        varchar status
        boolean credited
        boolean needs_review
    }
    payment_refund_intents {
        uuid id PK
        uuid attempt_id FK
        varchar payment_id FK
        numeric amount
        varchar status
        varchar rejection_reason
        int rejections
    }
```

[Ver diagrama de «Pagos · Datos» completo](https://images.vinnot.com/docs/diagrams/v1/es/modules-payments-readme-6d551f1ed4b6.svg)

`payment_accounts` usa como clave dueño, proveedor y entorno. Los intentos de pago no se
borran en cascada con la cuenta, para conservar el registro de cada cobro. No se guardan
datos de tarjeta, del pagador ni cuerpos crudos de Mercado Pago.
