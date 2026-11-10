# Mobile-only scanning diagrams

## Product workflow

```mermaid
flowchart TD
    OPEN["Open scan with origin"] --> PERM{"Camera permission"}
    PERM -->|no| REQUEST["Request permission or return"]
    PERM -->|yes| PREVIEW["Preview"]
    PREVIEW --> CAPTURE["Capture and process image"]
    CAPTURE --> QUALITY{"Capture quality"}
    QUALITY -->|rejected| HINT["Feedback and retake"]
    QUALITY -->|accepted| FREEZE["Retain URI and freeze image"]
    FREEZE --> OCR["Local OCR"]
    OCR --> API["POST /wines/scan"]
    API --> RESULT{"Result"}
    RESULT -->|EXACT_MATCH| FOUND["Wine found"]
    RESULT -->|POSSIBLE_MATCHES| SUG["Suggestions"]
    RESULT -->|NO_MATCH| NONE["No safe match"]
    FOUND --> DETAIL["Detail"]
    SUG --> DETAIL
    NONE --> MANUAL["Manual search"]
    SUG --> MANUAL
    MANUAL --> DETAIL
    MANUAL --> FORM["Submission with same capture"]
    FORM --> SUBMIT["POST /wines/submissions"]
    SUBMIT --> BACKEND["Publish, link, review or reject"]
```

[View the full “Product workflow” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-wine-label-scan-617138873c68.svg)

Exact results are presented before opening detail; automatic navigation is not
required. The web app-download invitation does not participate in this pipeline.

## Technical interaction

```mermaid
sequenceDiagram
    participant V as Scan ViewModel
    participant C as Camera adapter
    participant Q as RTK operation
    participant S as winesService
    participant H as Wine HTTP client
    V->>C: capture
    C->>C: takePictureAsync
    C->>C: crop / resize / quality
    C-->>V: temporary URI
    V->>V: check generation or release late capture
    V->>V: capturedUri + analysis mode
    V->>C: recognizeText
    C-->>V: observedText
    V->>V: check generation after OCR
    V->>Q: wine.scan
    Q->>S: scanLabel + AbortSignal
    S->>H: imageUri + observedText + AbortSignal
    H->>H: multipart image + observedText
    H-->>S: raw scan response
    S-->>Q: mapped model
    Q-->>V: operation outcome
    V->>V: generation check and result mode
```

[View the full “Technical interaction” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-wine-label-scan-878a55bc8ec6.svg)

Multipart contains no locale field. Scan requests transmit images; transmission
is not catalog-image persistence.

## Recovery states

```mermaid
stateDiagram-v2
    [*] --> Camera
    Camera --> Analysis: capture succeeds
    Analysis --> Result: accepted current-generation response
    Analysis --> Error: failure with capture
    Error --> Analysis: retry same URI and OCR
    Error --> Camera: retake
    Analysis --> Camera: cancel and reset
    Result --> Manual: manual search
    Manual --> Submission: add wine
    Result --> Camera: scan another
    Submission --> Detail: response includes wine
    Submission --> History: NEEDS_REVIEW without wine
    Submission --> Camera: other outcome and reset
```

[View the full “Recovery states” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-wine-label-scan-25dbae7f8951.svg)

Found/suggestions/no-match are result branches; ViewModel mode groups their
presentation. Capture survives for retry or submission. See [lifecycle](scan-lifecycle.md).
