# Public navigation and recovery

## Routes and channels

```mermaid
flowchart TD
    Entry["Footer / profile / registration"] --> Centre["/legal"]
    Entry --> Help["/help"]
    Centre --> Terms["/terms"]
    Centre --> Data["/privacy and /cookies"]
    Centre --> Rules["Community, safety, moderation"]
    Centre --> Transparency["Ranking and events/payments"]
    Help --> Search["Local FAQ search"]
    Help --> Contact["/contact"]
    Rules --> Contact
    Data --> Contact
    Contact --> Form["Form → useSupportForm"]
    Contact --> Email["Direct email: no delivery receipt"]
    Form --> Service["supportService"]
    Service --> Client["supportClient"]
    Client --> API["POST /support/requests"]
```

[View the full “Routes and channels” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-public-information-7af5c5e9939c.svg)

Documents are public. Current terms are retrieved from the backend;
other policies and FAQs ship with the frontend. There are no AI calls. This map does not change private catalogue or admin authorization.

## Contact state machine

```mermaid
stateDiagram-v2
    [*] --> Editing
    Editing --> Invalid: Missing data or exceeded limits
    Invalid --> Editing: Correct fields
    Editing --> Sending: New UUID for new content
    Sending --> Received: 202 and matching UUID
    Sending --> Failed: Network, server or invalid receipt
    Failed --> Sending: Retry same content and UUID
    Failed --> Editing: Change content
    Received --> Editing: New enquiry
```

[View the full “Contact state machine” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-public-information-0ced47910786.svg)

Sending disallows another submit. Failed preserves the form. Received means
durable acceptance; external delivery happens afterwards.

## Read results and visual states

```mermaid
flowchart TD
    Query["Read query"] --> Result{"Result"}
    Result -->|Data| Display["Display data"]
    Result -->|Truly empty| Empty["Contextual empty state"]
    Result -->|Error| Classify["Resolve state without internal messages"]
    Classify -->|401| Session["Existing session recovery"]
    Classify -->|403 / 404| Exit["Explain and exit without blind retry"]
    Classify -->|429| Limit["Respect retryAt if supplied"]
    Classify -->|Network / timeout / 500 / 503| Retry["Explicit read retry"]
    Limit --> Retry
    Retry --> Query
```

[View the full “Read results and visual states” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-public-information-9a3bf4cd4ca7.svg)

Classification does not clear credentials or cached content. Registration,
payment and generation mutations retain their operation-specific recovery.

## Render boundaries

Render failures use a boundary independent of HTTP results. Retrying resets
that surface; the error component does not execute a business mutation. No
message exposes stack traces or credentials.

See the [functional contract](../../modules/support/architecture.md).

## Contract review

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Content: Revision already accepted
    Loading --> Review: Acceptance missing
    Loading --> Failure: Network or invalid contract
    Review --> Confirming: Explicit checkbox and accept
    Review --> Exit: Sign out
    Confirming --> Content: Server confirms
    Confirming --> Failure: Error or changed version
    Failure --> Loading: Reload document without automatic resubmit
    Failure --> Exit: Sign out
```

[View the full “Contract review” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-public-information-2ff4262a6435.svg)

Legal, privacy, help and contact remain outside the acceptance gate.
Registration uses the same document and sends selection with account creation.
