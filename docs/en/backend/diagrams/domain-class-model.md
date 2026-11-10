# UML domain model

## Scope and notation

These class diagrams represent the domain model implemented under
`backend/src/main/java/com/vinnot`. They do not represent JPA entities or
database tables. Their purpose is to show aggregates, entities, value objects,
behavior, and identity dependencies across modules.

- `AggregateRoot` and `Entity` are shared domain abstractions.
- Composition (`*--`) means that the aggregate owns the in-memory object
  lifecycle.
- A dotted dependency (`..>`) means that the model stores a UUID or uses a type
  from another concept; it does not imply JPA navigation between aggregates.
- Getters, builders, and projection-only fields are omitted for readability.
  Included attributes and operations express identity, invariants, or relevant
  transitions.

## Foundations, catalog, and community

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

[View the full “Foundations, catalog, and community” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-domain-class-model-ddb7b886d63b.svg)

`Wine`, `Winery`, `Review`, and `CellarWine` belong to separate modules.
Dependencies between them are resolved by use cases through ports; the diagram
does not authorize direct references across repositories or JPA entities.
A new review starts as `PublicationStatus.APPROVED`; `ReviewPublication` is the
shared view of reviews and comments a moderator decides, and a rejection carries
a `PublicationRejectionReason`. `vintage` on `Review` and `CellarWine` is the
optional vintage the person tasted, independent of the catalog wine vintage.

## Identity and events

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

[View the full “Identity and events” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-domain-class-model-1d904310f025.svg)

Capacity is protected by the `Event` aggregate; request and payment state belong
to `EventRegistration`. IDs connect aggregates without turning the model into a
single mutable object graph. `publishedOnce` is explained in
[state machines](domain-state-machines.md#events); `scheduleVersion` only grows
and counts the changes attendees are told about (start, end or the venue as
people read it, name and address), so it keys each change notice.
`EventCancellation` is a cancellation's reason, which
`EventCancellationService.saveCancelled` stores with the event. On `User`,
`passwordSet` tells whether the person chose the password, and a suspension is
`lock` with `lockReason` = the `SuspensionReason` code or `CODE: detail`
([account axes](domain-state-machines.md#account-independent-axes)).

## Routes, submissions, and AI

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

[View the full “Routes, submissions, and AI” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-domain-class-model-86cd31c4bed7.svg)

Profiles and comparisons are persisted content models in the `ai` module;
generation, leases, and caching are coordinated in the application and
infrastructure layers. Label matching uses pure models and services from the
`wine` module, while OCR/vision adapters remain outside the domain.

## Application collaboration: scanning

This UML supplements domain classes with a concrete application collaboration.
Realization points from handler/adapter to its interface; dependencies point to
the used type. It does not represent execution order, which is covered by the
[scan workflow](../../modules/wines/architecture.md).

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

[View the full “Application collaboration: scanning” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-domain-class-model-a1851891c215.svg)

The controller adapts multipart; the handler orchestrates and measures; the
matcher applies normalization/ranking; the retriever uses the catalog port; the
scorer remains in domain; the visual adapter implements the external contract.
The handler also uses `WineLabelScanPolicy` and `WineLabelMetricsPort`, omitted
from this diagram to keep the view readable.

## Payments

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

[View the full “Payments” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-domain-class-model-fd184b63d3e6.svg)

The `payment` module types are immutable records: a status change builds a new
record in the service or the persistence layer. The registration
(`EventRegistration`, `event` module) is the only aggregate that payments change.
`CheckoutAttempt.Status`, `ProviderPayment.Status` and `RefundIntent.Status` are
enums nested in their record: the chart names them `CheckoutAttempt_Status`,
`ProviderPayment_Status` and `RefundIntent_Status` because Mermaid does not
accept the UML qualified name `CheckoutAttempt::Status`; each record's `status`
attribute has that nested type. `OrganizerPayment` is a read
view for the organizer. The states are described in
[Payments](../../modules/payments/README.md) and in [state machines](domain-state-machines.md#registration-payment).

## Community, legal, notifications, and support

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

[View the full “Community, legal, notifications, and support” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-domain-class-model-e443a8d1bd3b.svg)

These modules have no aggregates either: their domain types are immutable records
and orchestration lives in application services and ports. `CommunityReport.review`
returns a new report and applies the moderation rules. `ContentTarget` points by
UUID to content owned by other modules (review, comment, user, event or route).
User blocks, terms acceptance and push type switches exist only as ports and
adapters, with no domain class. `NotificationType` sets each notice's category; the
category decides whether it is transactional, optional or promotional.

## Engagement and activity

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

[View the full “Engagement and activity” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-domain-class-model-003c0d31fa12.svg)

The `engagement` and `activity` types are immutable records with no aggregate:
the planner run builds them in `EngagementPageService` and stores the outcome
through ports. `EngagementSelection.choose` filters the account's candidates by
allowed category and type, cadence and category limit, picks the best score
(`EngagementRules.weight` times the `CandidateSignals` strength) and asks
`EngagementPolicy` for the budget verdict. `SendTime` sets the send time between
09:00 and 21:59 local time; with no possible time the outcome is TOO_LATE.
`Holdout` sets apart a stable percentage of accounts by hashing the UUID.
`PlanningMember` is built from `ActivityRhythm`: its last open and its usual
hour. `ViewedContent` feeds the candidate sources for wines viewed without a
review and for winback. `EngagementDecision.Outcome` is a nested enum, named
like the payment ones. The full flow is in
[engagement pushes](../../modules/notifications/architecture.md#engagement-pushes)
and [activity](../../modules/activity/README.md).

## Related diagrams

- [ERD and relational model](../data/database-model.md)
- [State machines](domain-state-machines.md)
- [Module map and hexagonal slice](system-map.md)
- [Consistency, locks, and caches](data-consistency.md)
