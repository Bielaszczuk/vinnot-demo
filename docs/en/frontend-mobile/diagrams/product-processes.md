# Product sequences and states mobile

## Diagram scope

These views describe frontend responsibilities. Server validates permissions,
transitions and persistence; diagrams do not introduce new business rules.
Error responses produce operation error state, not implicit success.

## Social login

```mermaid
sequenceDiagram
    actor U as User
    participant P as Presentation
    participant G as Social adapter
    participant S as authService
    participant B as Backend
    participant A as Session state
    U->>P: Select provider
    P->>G: Acquire credential
    alt Credential available
        G-->>P: Token or code
        P->>S: socialLogin
        S->>B: Provider credential
        B-->>S: User and Vinnot tokens
        S-->>A: Mapped session
        A-->>P: Updated identity
        P->>P: Destination or complete-profile
    else Cancellation or failure
        G-->>P: Unauthenticated outcome
    end
```

[View the full “Social login” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-product-processes-afd3fde12061.svg)

Restoring a saved session is separate from this exchange.
See [authentication](../../modules/users/architecture.md).

## Search and pagination

```mermaid
flowchart TD
    INPUT["Text and filters"] --> DEBOUNCE["400 ms debounce"]
    DEBOUNCE --> TEXT{"At least 2 characters"}
    TEXT -->|yes| SEARCH["search"]
    TEXT -->|no| BROWSE["No search"]
    SEARCH --> ARGS["Filter and page"]
    BROWSE --> ARGS
    ARGS --> KEY["RTK operation args"]
    KEY --> SERVICE["winesService"]
    SERVICE --> API["GET /wines"]
    API --> MAP["Models and metadata"]
    MAP --> VIEW["Cards and controls"]
    VIEW --> NEXT{"hasNext"}
    NEXT -->|continue| ARGS
```

[View the full “Search and pagination” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-product-processes-6be19ed1f890.svg)

Pages start at zero. Mobile accumulation and web page navigation are different
presentations of the same paginated contract.

## AI profile and localized representation

```mermaid
sequenceDiagram
    actor U as User
    participant P as AI screen
    participant Q as RTK Query
    participant B as Backend
    U->>P: Open wine and language
    P->>Q: wine.aiProfileStatus
    Q->>B: GET profile status
    B-->>Q: Availability or content
    Q-->>P: Read state
    opt Generate action
        U->>P: Generate
        P->>Q: generateAiProfile
        Q->>B: Generation request
        B->>B: Resolve cache or provider
        B-->>Q: Result
        Q->>Q: Invalidate profile and status
        Q-->>P: Updated content
    end
    U->>P: Different active language
    P->>Q: Same ID and new language
    Q->>B: Read representation
```

[View the full “AI profile and localized representation” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-product-processes-635a949f28f0.svg)

The diagram does not attribute every request to the provider. Exact sequence
and visual journey differ by platform; see [AI](../../modules/ai/architecture.md).

## Comparison

```mermaid
stateDiagram-v2
    [*] --> Selecting
    Selecting --> Ready: A and B selected
    Ready --> Requesting: Compare and distinct IDs
    Requesting --> Result: Mapped response
    Requesting --> RequestError: Query failure
    Result --> Selecting: Change selection
    RequestError --> Selecting: Change pair
    Result --> [*]: Leave
```

[View the full “Comparison” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-product-processes-c7661a3b0ab6.svg)

States describe the operation; they do not assert identical error components
or retry buttons across screens.

## Cellar or review: write and cache

```mermaid
sequenceDiagram
    actor U as User
    participant F as Form
    participant M as Mutation hook
    participant S as Service
    participant B as Backend
    U->>F: Edit and confirm
    F->>F: Validate fields
    F->>M: Resource ID and changes
    M->>S: Operation
    S->>B: DTO
    alt Accepted
        B-->>M: Result
        M->>M: Configured invalidation
        M-->>F: Refresh data
    else Rejected
        B-->>F: Error without confirming save
    end
```

[View the full “Cellar or review: write and cache” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-product-processes-0ce0c0b477d8.svg)

## Event registration

```mermaid
flowchart TD
    DETAIL["Event detail"] --> SESSION{"Session"}
    SESSION -->|no| LOGIN["Login"]
    SESSION -->|yes| FORM["Attendees, contact and payment"]
    FORM --> REGISTER["registerForEvent"]
    REGISTER --> BACKEND["Backend validates capacity and rules"]
    BACKEND --> STATE["Returned state"]
    STATE --> USER["Confirm attendance or pay with Mercado Pago"]
    STATE --> ORGANIZER["Approve, waitlist or reject"]
    USER --> UPDATE["New server response"]
    ORGANIZER --> UPDATE
    UPDATE --> STATE
```

[View the full “Event registration” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-product-processes-75095f02ade4.svg)

Registration and payment maintain separate states. Available actions derive
from current state, not a universal payment sequence.

## App submission and review

```mermaid
flowchart LR
    MOBILE["Mobile capture and search"] --> FORM["Form and photo"]
    FORM --> API["POST /wines/submissions"]
    API --> DECISION{"Backend decision"}
    DECISION --> CATALOG["APPROVED / DUPLICATE"]
    DECISION --> REVIEW["NEEDS_REVIEW"]
    DECISION --> REJECTED["REJECTED"]
    REVIEW --> WEB["Admin panel (web or app)"]
    WEB --> ACTION["APPROVE_NEW / MERGE_EXISTING / REJECT / REQUEST_CORRECTIONS"]
    ACTION --> SERVER["Persisted decision"]
    SERVER --> MY["Mobile submission tracking"]
```

[View the full “App submission and review” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-product-processes-22c6a59f720c.svg)

Web does not scan. Submissions are reviewed from the admin panel, on the
web or in the app. Decisions
and timestamps belong to backend.

## Functional references

- [Catalog](../../modules/wines/architecture.md)
- [Cellar](../../modules/cellar/architecture.md#app) and [reviews](../../modules/reviews/architecture.md#app)
- [Events](../../modules/events/architecture.md#app), [wineries](../../modules/wineries/architecture.md#app) and [routes](../../modules/wine-routes/architecture.md#app)
- [Administration](../../modules/admin/architecture.md)
