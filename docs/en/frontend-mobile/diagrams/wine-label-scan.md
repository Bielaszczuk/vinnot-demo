# Mobile-only scanning diagrams

## Product workflow

```mermaid
flowchart TD
    OPEN["Open scan with origin"] --> PERM{"Camera permission"}
    PERM -->|no| REQUEST["Request permission or return"]
    PERM -->|yes| PREVIEW["Preview"]
    PREVIEW -.->|EAN/UPC in view| BARCODE["Keep barcode with valid check digit"]
    PREVIEW --> CAPTURE["Capture and process image"]
    CAPTURE --> QUALITY{"Capture quality"}
    QUALITY -->|rejected| HINT["Feedback and retake"]
    QUALITY -->|accepted| FREEZE["Retain URI and freeze image"]
    FREEZE --> OCR["Local OCR"]
    OCR --> API["POST /wines/scan (+ barcode)"]
    API --> RESULT{"Result"}
    RESULT -->|EXACT_MATCH| FOUND["Wine found"]
    RESULT -->|POSSIBLE_MATCHES| SUG["Suggestions"]
    RESULT -->|NO_MATCH| NONE["No safe match"]
    FOUND --> DETAIL["Detail (scanned vintage)"]
    SUG --> DETAIL
    SUG --> BACK["Scan the back label once"]
    NONE --> BACK
    BACK --> OCR
    DETAIL --> FEEDBACK["POST /wines/scans/{scanId}/feedback once"]
    FORM --> FEEDBACK
    NONE --> MANUAL["Manual search"]
    SUG --> MANUAL
    MANUAL --> DETAIL
    MANUAL --> FORM["Submission with same capture"]
    FORM --> SUBMIT["POST /wines/submissions"]
    SUBMIT --> BACKEND["Publish, link, review or reject"]
```

[View the full “Product workflow” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-wine-label-scan-1f7ed32d1cfc.svg)

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
    C-->>V: barcode seen in the preview
    V->>Q: wine.scan
    Q->>S: scanLabel + AbortSignal
    S->>H: imageUri + observedText + barcode + AbortSignal
    H->>H: multipart image + observedText + barcode
    H-->>S: raw scan response
    S-->>Q: mapped model
    Q-->>V: operation outcome
    V->>V: generation check and result mode
    V->>Q: wine.scanFeedback once per scanId (fire-and-forget)
```

[View the full “Technical interaction” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-wine-label-scan-a7abac95f1ad.svg)

Multipart contains no locale field. Scan requests transmit images; transmission
is not catalog-image persistence. A back-label capture is read and released: the
scan sends the front photo again with both readings merged. The verdict on the
result is sent at most once per `scanId` and its failure is never shown.

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
    Result --> Camera: scan the back label
    Camera --> Result: back to the result
    Submission --> Detail: response includes wine
    Submission --> History: NEEDS_REVIEW without wine
    Submission --> Camera: other outcome and reset
```

[View the full “Recovery states” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-wine-label-scan-55e2f66e34c2.svg)

Found/suggestions/no-match are result branches; ViewModel mode groups their
presentation. Capture survives for retry or submission. See [lifecycle](scan-lifecycle.md).
