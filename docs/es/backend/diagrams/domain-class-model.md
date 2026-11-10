# Modelo de dominio UML

## Alcance y notación

Estos diagramas de clases representan el modelo de dominio implementado en
`backend/src/main/java/com/vinnot`. No representan entidades JPA ni tablas. Su
objetivo es mostrar agregados, entidades, value objects, comportamientos y
dependencias de identidad entre módulos.

- `AggregateRoot` y `Entity` son abstracciones de dominio compartidas.
- Una composición (`*--`) indica que el agregado posee el ciclo de vida del
  objeto en memoria.
- Una dependencia punteada (`..>`) indica que el modelo conserva un UUID o usa
  un tipo de otro concepto; no implica navegación JPA entre agregados.
- Se omiten getters, builders y campos de proyección para mantener legible el
  modelo. Los atributos y operaciones incluidos son los que expresan identidad,
  invariantes o transiciones relevantes.

## Fundamentos, catálogo y comunidad

```mermaid
classDiagram
    class AggregateRoot~ID~ {
        <<abstract>>
        +ID getId()
    }
    class Entity~ID~ {
        <<abstract>>
        +ID getId()
    }
    class Wine {
        -UUID id
        -UUID wineryId
        -String name
        -Integer vintage
        -WineType wineType
        -List~String~ grapes
        -UUID countryId
        -UUID regionId
        -boolean active
        -boolean featured
        +create(name, wineryId, wineType, createdBy) Wine
        +updateBasicInfo(name, vintage, style, description)
        +updateOrigin(countryId, regionId)
        +updateTasteProfile(acidity, tannin, body, sweetness)
        +activate()
        +deactivate()
    }
    class Winery {
        -UUID id
        -String name
        -String slug
        -UUID countryId
        -UUID regionId
        -Location location
        -ContactInfo contactInfo
        -boolean active
        +create(name, countryId) Winery
        +updateBasicInfo(...)
        +updateLocation(location)
        +activate()
        +deactivate()
    }
    class Review {
        -UUID id
        -UUID wineId
        -UUID userId
        -BigDecimal rating
        -Integer vintage
        -PublicationStatus publicationStatus
        -int helpfulCount
        -int likesCount
        +create(wineId, userId, rating)$ Review
        +updateContent(rating, title, comment)
        +updateVintage(vintage)
        +verify()
        +incrementHelpfulCount()
        +incrementLikesCount()
        +decrementLikesCount()
    }
    class ReviewPublication {
        <<record>>
        +Type type
        +UUID id
        +UUID reviewId
        +UUID authorId
        +PublicationStatus status
        +Instant updatedAt
        +boolean parentApproved
        +validateDecision(actor, decision, reasonCode, reason, expectedRevision) Decision
    }
    class PublicationStatus {
        <<enumeration>>
        PENDING
        APPROVED
        REJECTED
    }
    class PublicationRejectionReason {
        <<enumeration>>
        OFFENSIVE
        SPAM
        OFF_TOPIC
        PERSONAL_DATA
        OTHER
    }
    class CellarWine {
        -UUID id
        -UUID userId
        -UUID wineId
        -BigDecimal rating
        -BigDecimal purchasePrice
        -Integer vintage
        +create(userId, wineId)$ CellarWine
        +updateRating(rating)
        +updatePurchasePrice(price)
        +updateNotes(notes)
        +updateVintage(vintage)
    }
    class TasteProfile {
        <<value object>>
        +Integer acidity
        +Integer tannin
        +Integer body
        +Integer sweetness
    }
    class ServingTemperature {
        <<value object>>
    }
    class PriceRange {
        <<value object>>
    }
    class Rating {
        <<value object>>
    }
    class WineType {
        <<value object>>
    }
    class Location {
        <<value object>>
    }
    class ContactInfo {
        <<value object>>
    }

    AggregateRoot <|-- Wine
    AggregateRoot <|-- Winery
    AggregateRoot <|-- Review
    AggregateRoot <|-- CellarWine
    Wine *-- TasteProfile
    Wine *-- ServingTemperature
    Wine *-- PriceRange
    Wine *-- Rating
    Wine *-- WineType
    Winery *-- Location
    Winery *-- ContactInfo
    Wine ..> Winery : wineryId
    Review ..> Wine : wineId
    Review *-- PublicationStatus
    ReviewPublication *-- PublicationStatus
    ReviewPublication ..> Review : reviewId
    ReviewPublication ..> PublicationRejectionReason : Decision
    CellarWine ..> Wine : wineId
```

[Ver diagrama de «Fundamentos, catálogo y comunidad» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-domain-class-model-ddb7b886d63b.svg)

`Wine`, `Winery`, `Review` y `CellarWine` pertenecen a módulos distintos. Las
dependencias entre ellos se resuelven en casos de uso mediante puertos; el
diagrama no autoriza referencias directas entre repositorios o entidades JPA.
Una reseña nueva nace con `PublicationStatus.APPROVED`; `ReviewPublication` es
la vista común de reseñas y comentarios que un moderador decide, y un rechazo
lleva un `PublicationRejectionReason`. `vintage` en `Review` y `CellarWine` es la
añada opcional que la persona probó, independiente de la añada del vino del
catálogo.

## Identidad y eventos

```mermaid
classDiagram
    class AggregateRoot~ID~ {
        <<abstract>>
    }
    class User {
        -UUID id
        -String username
        -Email email
        -Password password
        -long sessionVersion
        -Set~Role~ roles
        -boolean passwordSet
        -boolean active
        -boolean locked
        -String lockReason
        -boolean emailVerified
        -boolean onboardingCompleted
        -PreferredLanguage preferredLanguage
        -UserTimezone timezone
        +create(email, password, firstName, lastName)$ User
        +createSocial(...)$ User
        +changePassword(password)
        +revokePassword(unusablePassword)
        +verifyEmail()
        +updatePreferences(language, zone) boolean
        +completeOnboarding()
        +addRole(role)
        +lock(reason)
        +unlock()
        +recordLogin()
    }
    class SuspensionReason {
        <<enumeration>>
        SPAM
        HARASSMENT
        FRAUD
        IMPERSONATION
        TERMS_VIOLATION
        OTHER
    }
    class SocialIdentity {
        <<record>>
        +UUID userId
        +SocialProvider provider
        +String providerSubject
    }
    class UserActionToken {
        <<record>>
        +UUID userId
        +UserActionTokenType type
        +Instant usedAt
        +Instant expiresAt
    }
    class Event {
        -UUID id
        -EventDateRange dateRange
        -EventCapacity capacity
        -EventRegistrationSettings registrationSettings
        -EventStatus status
        -boolean publishedOnce
        -long scheduleVersion
        -UUID organizerId
        +create(title, type, dateRange, organizerId)$ Event
        +publish()
        +cancel()
        +complete()
        +transitionTo(status)
        +holdAttendees(count)
        +confirmHeldAttendees(count)
        +releaseHeldAttendees(count)
    }
    class EventCancellation {
        <<value object>>
        +EventCancellationReason reason
        +String note
        +unspecified()$ EventCancellation
    }
    class EventCancellationReason {
        <<enumeration>>
        UNFORESEEN_CIRCUMSTANCES
        SCHEDULING_CONFLICT
        VENUE_UNAVAILABLE
        INSUFFICIENT_ATTENDANCE
        WEATHER
        HEALTH_AND_SAFETY
        OTHER
    }
    class EventRegistration {
        -UUID id
        -UUID eventId
        -UUID userId
        -int attendeeCount
        -EventRegistrationStatus status
        -EventPaymentStatus paymentStatus
        +request(...) EventRegistration
        +approveFree(holdUntil, confirmationRequired)
        +approvePaid(holdUntil)
        +confirmAttendance()
        +approvePayment(method)
        +waitlist(reason)
        +reject(reason)
        +cancel()
        +expire(now)
    }
    class Email { <<value object>> }
    class Password { <<value object>> }
    class Role { <<value object>> }
    class EventDateRange { <<value object>> }
    class EventCapacity { <<value object>> }
    class EventRegistrationSettings { <<value object>> }

    AggregateRoot <|-- User
    AggregateRoot <|-- Event
    AggregateRoot <|-- EventRegistration
    User *-- Email
    User *-- Password
    User o-- Role
    User ..> SuspensionReason : lockReason
    SocialIdentity ..> User : userId
    UserActionToken ..> User : userId
    Event *-- EventDateRange
    Event *-- EventCapacity
    Event *-- EventRegistrationSettings
    Event ..> User : organizerId
    EventCancellation *-- EventCancellationReason
    EventCancellation ..> Event : saveCancelled
    EventRegistration ..> Event : eventId
    EventRegistration ..> User : userId
```

[Ver diagrama de «Identidad y eventos» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-domain-class-model-1d904310f025.svg)

La capacidad se protege en el agregado `Event`; el estado de la solicitud y del
pago vive en `EventRegistration`. Los IDs conectan agregados sin convertir el
modelo en un grafo mutable único. `publishedOnce` se explica en
[máquinas de estado](domain-state-machines.md#eventos); `scheduleVersion` sólo
crece y cuenta los cambios que se avisan a los asistentes (inicio, fin o el
lugar tal como se lee, nombre y dirección), así identifica cada aviso de cambio.
`EventCancellation` es el motivo de una cancelación, que
`EventCancellationService.saveCancelled` guarda con el evento. En `User`,
`passwordSet` indica si la persona eligió la contraseña y una suspensión es
`lock` con `lockReason` = código de `SuspensionReason` o `CODIGO: detalle`
([ejes de la cuenta](domain-state-machines.md#cuenta-ejes-independientes)).

## Rutas, submissions e IA

```mermaid
classDiagram
    class AggregateRoot~ID~ {
        <<abstract>>
    }
    class Entity~ID~ {
        <<abstract>>
    }
    class WineRoute {
        -UUID id
        -UUID createdBy
        -RouteStatus status
        -List~RouteStop~ stops
        +create(name, createdBy) WineRoute
        +addStop(stop)
        +replaceStops(stops)
        +removeStop(stopId)
        +reorderStops()
        +publish()
        +archive()
        +setToDraft()
    }
    class RouteStop {
        -UUID id
        -Coordinates coordinates
        -int stopOrder
        +create(name, stopOrder) RouteStop
        +updateCoordinates(coordinates)
        +updateStopOrder(order)
    }
    class WineSubmission {
        -UUID id
        -UUID submittedBy
        -WineSubmissionStatus status
        -UUID matchedWineId
        -UUID createdWineId
        -UUID reviewedBy
        +create(...) WineSubmission
        +approve(wineId, imageUrl, confidence)
        +markDuplicate(wineId, confidence)
        +requireReview(reason, confidence, imageUrl)
        +approveByAdmin(...)
        +mergeByAdmin(wineId, reviewerId, reason)
        +rejectByAdmin(reviewerId, reason)
        +requestCorrections(reviewerId, reason)
    }
    class ExtractedWineLabel {
        <<record>>
        +String wineName
        +String wineryName
        +String grapeVariety
        +Integer vintage
    }
    class RankedWineLabelCandidate {
        <<record>>
        +WineLabelCandidate candidate
        +double score
    }
    class WineAiProfile {
        -UUID id
        -UUID wineId
        -String language
        -Map profileJson
    }
    class WineComparison {
        -UUID id
        -UUID wineAId
        -UUID wineBId
        -String language
        -Map comparisonJson
    }
    class Coordinates { <<value object>> }
    class RouteStatus { <<enumeration>> }
    class WineSubmissionStatus { <<enumeration>> }

    AggregateRoot <|-- WineRoute
    Entity <|-- RouteStop
    AggregateRoot <|-- WineSubmission
    WineRoute *-- RouteStop
    RouteStop *-- Coordinates
    WineRoute *-- RouteStatus
    WineSubmission *-- WineSubmissionStatus
    class WineLabelCandidate {
        <<record>>
        +Wine wine
        +String wineryName
    }
    RankedWineLabelCandidate *-- WineLabelCandidate
    WineLabelCandidate --> Wine
    WineSubmission ..> User : submittedBy / reviewedBy
    WineSubmission ..> Wine : matchedWineId / createdWineId
    WineAiProfile ..> Wine : wineId
    WineComparison ..> Wine : wineAId / wineBId
```

[Ver diagrama de «Rutas, submissions e IA» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-domain-class-model-86cd31c4bed7.svg)

Los perfiles y comparaciones son modelos de contenido persistido del módulo
`ai`; la generación, el lease y el cache se coordinan en aplicación e
infraestructura. El matching de etiquetas usa modelos y servicios puros del
módulo `wine`, mientras los adapters de OCR/visión permanecen fuera del dominio.

## Colaboración de aplicación: escaneo

Este UML complementa las clases de dominio con una colaboración de aplicación
concreta. La realización apunta desde el handler/adapter hacia su interfaz;
las dependencias apuntan al tipo utilizado. No representa el orden temporal,
que está en el [flujo de escaneo](../../modules/wines/architecture.md).

```mermaid
classDiagram
    class ScanWineLabelUseCase {
        <<interface>>
        +execute(ScanWineLabelCommand) WineLabelScanResponse
    }
    class ScanWineLabelCommandHandler
    class WineLabelScanController
    class WineLabelRecognitionPort {
        <<interface>>
        +recognize(byteArray, contentType) ExtractedWineLabel
    }
    class OpenAiWineLabelRecognitionAdapter
    class WineLabelCatalogMatcher
    class WineLabelCandidateRetriever
    class WineLabelMatchScorer
    class WineRepositoryPort {
        <<interface>>
    }
    WineLabelScanController ..> ScanWineLabelUseCase
    ScanWineLabelCommandHandler ..|> ScanWineLabelUseCase
    ScanWineLabelCommandHandler --> WineLabelRecognitionPort
    OpenAiWineLabelRecognitionAdapter ..|> WineLabelRecognitionPort
    ScanWineLabelCommandHandler --> WineLabelCatalogMatcher
    WineLabelCatalogMatcher --> WineLabelCandidateRetriever
    WineLabelCatalogMatcher --> WineLabelMatchScorer
    WineLabelCandidateRetriever --> WineRepositoryPort
```

[Ver diagrama de «Colaboración de aplicación: escaneo» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-domain-class-model-a1851891c215.svg)

El controller adapta multipart; el handler orquesta y mide; el matcher aplica
normalización/ranking; el retriever utiliza el puerto de catálogo; el scorer
permanece en dominio; el adapter visual implementa el contrato externo. El
handler también utiliza `WineLabelScanPolicy` y `WineLabelMetricsPort`, omitidos
del gráfico para mantener una vista legible.

## Pagos

```mermaid
classDiagram
    class EventRegistration {
        <<AggregateRoot>>
        -UUID id
        -EventPaymentStatus paymentStatus
        -boolean externallyManagedPayment
        +approvePaid(holdUntil)
        +approvePayment(method)
        +reportPayment(method)
        +confirmPayAtVenue()
        +prepareOnlinePayment(holdUntil, now)
        +managePaymentExternally(now)
        +confirmVerifiedPayment(now)
        +reverseVerifiedPayment(refunded, now)
    }
    class CheckoutAttempt {
        -CheckoutSnapshot snapshot
        -Status status
        -String providerReference
        -URI checkoutUrl
    }
    class CheckoutSnapshot {
        -UUID id
        -UUID registrationId
        -UUID buyerId
        -UUID organizerId
        -String sellerId
        -Instant expiresAt
        +hasSameTerms(other) boolean
    }
    class TicketPaymentQuote {
        -BigDecimal unitPrice
        -int quantity
        -String currency
        -CommissionPolicy commissionPolicy
        +total() BigDecimal
        +commission() BigDecimal
        +commissionBasisPoints() int
    }
    class ProviderPayment {
        -String id
        -UUID attemptId
        -BigDecimal amount
        -BigDecimal refundedAmount
        -Status status
        -Instant approvedAt
        +verifyAgainst(snapshot)
        +fullyRefunded() boolean
        +reversed() boolean
    }
    class RefundIntent {
        -UUID id
        -UUID attemptId
        -String paymentId
        -BigDecimal amount
        -Status status
        -int rejections
        +idempotencyKey() String
    }
    class OrganizerPayment {
        -UUID registrationId
        -UUID attemptId
        +canRefund() boolean
    }
    class EventPaymentStatus {
        <<enumeration>>
        NOT_REQUIRED
        PENDING
        REPORTED
        APPROVED
        REJECTED
        PAY_AT_VENUE
        REFUNDED
    }
    class CheckoutAttempt_Status {
        <<enumeration>>
        PREPARED
        CREATING
        READY
        UNCERTAIN
    }
    class ProviderPayment_Status {
        <<enumeration>>
        PENDING
        APPROVED
        REJECTED
        CANCELLED
        REFUNDED
        CHARGED_BACK
        IN_MEDIATION
    }
    class RefundIntent_Status {
        <<enumeration>>
        PREPARED
        SENDING
        UNCERTAIN
        SUCCEEDED
        REVIEW
        REJECTED
    }
    class PaymentReceiptStatus {
        <<enumeration>>
        PENDING
        CONFIRMED
        NOT_COMPLETED
        REFUND_PENDING
        REFUNDED
        REVIEW
    }
    CheckoutAttempt *-- CheckoutSnapshot
    CheckoutAttempt *-- CheckoutAttempt_Status : Status
    ProviderPayment *-- ProviderPayment_Status : Status
    RefundIntent *-- RefundIntent_Status : Status
    CheckoutSnapshot *-- TicketPaymentQuote
    EventRegistration *-- EventPaymentStatus
    CheckoutSnapshot ..> EventRegistration : registrationId
    ProviderPayment ..> CheckoutAttempt : attemptId
    RefundIntent ..> CheckoutAttempt : attemptId
    RefundIntent ..> ProviderPayment : paymentId
    OrganizerPayment ..> EventRegistration : registrationId
    PaymentReceiptStatus ..> ProviderPayment : from(...)
```

[Ver diagrama de «Pagos» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-domain-class-model-fd184b63d3e6.svg)

Los tipos del módulo `payment` son records inmutables: un cambio de estado crea
un registro nuevo en el servicio o en la persistencia. La inscripción
(`EventRegistration`, módulo `event`) es el único agregado que cambia por el
pago. `CheckoutAttempt.Status`, `ProviderPayment.Status` y `RefundIntent.Status`
son enums anidados en su record: el gráfico los nombra `CheckoutAttempt_Status`,
`ProviderPayment_Status` y `RefundIntent_Status` porque Mermaid no admite el
nombre calificado `CheckoutAttempt::Status` de UML; el atributo `status` de cada
record es de ese tipo anidado. `OrganizerPayment` es
una vista de lectura para el organizador. Los estados se describen en
[Pagos](../../modules/payments/README.md) y en [máquinas de estado](domain-state-machines.md#pago-de-una-inscripción).

## Comunidad, legal, notificaciones y soporte

```mermaid
classDiagram
    class CommunityReport {
        -UUID id
        -UUID reporterId
        -UUID authorId
        -ContentTarget target
        -Reason reason
        -Status status
        -UUID reviewerId
        -String decision
        +create(reporter, target, author, reason, description, excerpt, now)$ CommunityReport
        +review(reviewer, next, notes, now) CommunityReport
    }
    class ContentTarget {
        -Type type
        -UUID id
    }
    class TermsDocument {
        -String version
        -String acceptanceRevision
        -String locale
        -String contentHash
        -List~Section~ sections
    }
    class TermsStatus {
        -boolean required
        -Instant acceptedAt
        -Instant requiredFrom
    }
    class NotificationRequest {
        -NotificationType type
        -NotificationRecipient recipient
        -NotificationLocale locale
        -String dedupeKey
        +of(type, recipient, locale, ...)$ NotificationRequest
    }
    class NotificationPreferences {
        -Map~Choice, Boolean~ choices
        -MarketingConsent marketingConsent
        +allows(category, channel) boolean
        +withChoices(changes) NotificationPreferences
    }
    class PushRequest {
        -NotificationType type
        -List~UUID~ userIds
        -boolean deferrable
        -Instant expiresAt
        +batches(type, userIds, data, ...)$ List~PushRequest~
    }
    class PushDevice {
        -UUID userId
        -PushToken token
        -PushPlatform platform
        -Instant lastSeenAt
    }
    class Announcement {
        -AnnouncementKind kind
        -Map~NotificationLocale, AnnouncementContent~ versions
        -AnnouncementAudience audience
        -AnnouncementDestination destination
        +versionFor(preferred) Entry
    }
    class SupportRequest {
        -UUID requestId
        -String email
        -String subject
        -String message
        -String language
    }
    class NotificationCategory {
        <<enumeration>>
        ACCOUNT
        SECURITY
        PAYMENTS
        TICKETS
        SUBMISSIONS
        SUPPORT
        MODERATION
        EVENTS_NEARBY
        RECOMMENDATIONS
        REMINDERS
        COMMUNITY
        NEWSLETTER
    }
    CommunityReport *-- ContentTarget
    TermsStatus *-- TermsDocument
    NotificationRequest ..> NotificationCategory : type.category
    NotificationPreferences ..> NotificationCategory : choices
    Announcement ..> NotificationCategory : kind
    PushRequest ..> PushDevice : userIds
```

[Ver diagrama de «Comunidad, legal, notificaciones y soporte» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-domain-class-model-e443a8d1bd3b.svg)

Estos módulos tampoco tienen agregados: sus tipos de dominio son records
inmutables y la orquestación vive en servicios de aplicación y puertos.
`CommunityReport.review` devuelve una denuncia nueva y aplica las reglas de
moderación. `ContentTarget` apunta por UUID a contenido de otros módulos
(reseña, comentario, usuario, evento o ruta). Los bloqueos entre usuarios, la
aceptación de términos y los interruptores de push existen solo como puertos y
adaptadores, sin clase de dominio. `NotificationType` define la categoría de
cada aviso; la categoría decide si es transaccional, opcional o promocional.

## Engagement y actividad

```mermaid
classDiagram
    class PlanningMember {
        <<record>>
        +UUID userId
        +ZoneId zone
        +Instant createdAt
        +Instant lastSeenAt
        +OptionalInt usualHour
        +awayFor(away, now) boolean
    }
    class EngagementCandidate {
        <<record>>
        +UUID userId
        +NotificationType type
        +String contentRef
        +Map~String, String~ data
        +CandidateSignals signals
        +score() double
    }
    class CandidateSignals {
        <<record>>
        +double fit
        +Duration age
        +boolean nearby
        +Duration sinceViewed
        +strength() double
    }
    class EngagementRules {
        <<record>>
        +double weight
        +Duration cadence
        +boolean rotates
        +of(type)$ EngagementRules
    }
    class EngagementHistory {
        <<record>>
        +List~EngagementSend~ sends
        +Instant lastActiveAt
        +unopenedStreak() int
        +pausedAt(at, pauseAfter) boolean
    }
    class EngagementSend {
        <<record>>
        +NotificationType type
        +String dedupeKey
        +String contentRef
        +Instant sentAt
        +boolean holdout
        +boolean opened
        +delivered() boolean
    }
    class EngagementPolicy {
        <<record>>
        +int weeklyLimit
        +int dailyLimit
        +Duration minimumGap
        +int fatigueStreak
        +int fatiguedWeeklyLimit
        +Duration pauseAfter
        +double secondPushMinScore
        +standard()$ EngagementPolicy
        +admits(type, history, zone, at) EngagementVerdict
        +owesWeeklyPush(history, at) boolean
    }
    class EngagementSelection {
        <<service>>
        +choose(member, history, candidates, allowed, switchedOff, policy, now)$ EngagementDecision
    }
    class EngagementDecision {
        <<record>>
        +Outcome outcome
        +EngagementCandidate candidate
        +Instant sendAt
        +chosen() Optional~EngagementCandidate~
    }
    class EngagementDecision_Outcome {
        <<enumeration>>
        PLANNED
        NO_CANDIDATE
        OVER_BUDGET
        FATIGUED
        PAUSED
        BELOW_SCORE
        TOO_LATE
    }
    class EngagementVerdict {
        <<enumeration>>
        ALLOWED
        OVER_BUDGET
        FATIGUED
        PAUSED
    }
    class SendTime {
        <<service>>
        +next(now, zone, usualHour)$ Optional~Instant~
        +allowedAt(at, zone)$ boolean
    }
    class Holdout {
        <<record>>
        +int percent
        +includes(userId) boolean
    }
    class ActivityRhythm {
        <<record>>
        +UUID userId
        +Instant lastActiveAt
        +OpenHourHistogram openHours
        +usualOpenHour() OptionalInt
    }
    class OpenHourHistogram {
        <<record>>
        +Map~Integer, Integer~ countsByHour
        +usualHour() OptionalInt
        +opens() int
    }
    class ViewedContent {
        <<record>>
        +ContentKind kind
        +UUID entityId
        +int views
        +Instant lastViewedAt
    }
    class ContentKind {
        <<enumeration>>
        WINE
        ROUTE
        EVENT
        WINERY
    }

    EngagementCandidate *-- CandidateSignals
    EngagementCandidate ..> EngagementRules : score
    EngagementHistory *-- EngagementSend
    EngagementSelection ..> PlanningMember
    EngagementSelection ..> EngagementHistory
    EngagementSelection ..> EngagementCandidate
    EngagementSelection ..> EngagementPolicy
    EngagementSelection ..> SendTime
    EngagementSelection ..> EngagementDecision : choose
    EngagementDecision *-- EngagementDecision_Outcome : Outcome
    EngagementDecision o-- EngagementCandidate
    EngagementPolicy ..> EngagementHistory
    EngagementPolicy ..> EngagementVerdict
    ActivityRhythm *-- OpenHourHistogram
    ViewedContent *-- ContentKind
    PlanningMember ..> ActivityRhythm : lastSeenAt / usualHour
```

[Ver diagrama de «Engagement y actividad» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-domain-class-model-003c0d31fa12.svg)

Los tipos de `engagement` y `activity` son records inmutables sin agregado: la
corrida del planificador los arma en `EngagementPageService` y guarda el
resultado por puertos. `EngagementSelection.choose` filtra los candidatos de la
cuenta por categoría y tipo permitidos, cadencia y límite de categoría, elige el
mejor puntaje (`EngagementRules.weight` por la fuerza de `CandidateSignals`) y
pide a `EngagementPolicy` el veredicto del presupuesto. `SendTime` fija la hora
de envío entre las 09:00 y las 21:59 locales; sin hora posible el resultado es
TOO_LATE. `Holdout` separa un porcentaje estable de cuentas por hash del UUID.
`PlanningMember` se arma con `ActivityRhythm`: su última apertura y su hora
habitual. `ViewedContent` alimenta las fuentes de candidatos de vinos vistos sin
reseña y de reactivación. `EngagementDecision.Outcome` es un enum anidado,
nombrado como los de pagos. El flujo completo está en
[push de engagement](../../modules/notifications/architecture.md#push-de-engagement)
y en [actividad](../../modules/activity/README.md).

## Relación con otros diagramas

- [DER y modelo relacional](../data/database-model.md)
- [Máquinas de estado](domain-state-machines.md)
- [Mapa modular y corte hexagonal](system-map.md)
- [Consistencia, locks y caches](data-consistency.md)
