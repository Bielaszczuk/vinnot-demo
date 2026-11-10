# Diagramas del escaneo exclusivo mobile

## Circuito de producto

```mermaid
flowchart TD
    OPEN["Abrir scan con origin"] --> PERM{"Permiso de camara"}
    PERM -->|no| REQUEST["Solicitar permiso o volver"]
    PERM -->|si| PREVIEW["Preview"]
    PREVIEW --> CAPTURE["Capturar y procesar imagen"]
    CAPTURE --> QUALITY{"Calidad de captura"}
    QUALITY -->|rechazada| HINT["Feedback y nueva toma"]
    QUALITY -->|aceptada| FREEZE["Conservar URI y congelar imagen"]
    FREEZE --> OCR["OCR local"]
    OCR --> API["POST /wines/scan"]
    API --> RESULT{"Resultado"}
    RESULT -->|EXACT_MATCH| FOUND["Vino encontrado"]
    RESULT -->|POSSIBLE_MATCHES| SUG["Sugerencias"]
    RESULT -->|NO_MATCH| NONE["Sin coincidencia segura"]
    FOUND --> DETAIL["Detalle"]
    SUG --> DETAIL
    NONE --> MANUAL["Buscar manualmente"]
    SUG --> MANUAL
    MANUAL --> DETAIL
    MANUAL --> FORM["Alta con la misma captura"]
    FORM --> SUBMIT["POST /wines/submissions"]
    SUBMIT --> BACKEND["Publicar, vincular, revisar o rechazar"]
```

[Ver diagrama de «Circuito de producto» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-wine-label-scan-4f213bb547b5.svg)

El resultado exacto se presenta antes de abrir el detalle; no es navegación
automática obligatoria. La invitación web a descargar la app no participa en
este pipeline.

## Interaccion tecnica

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
    V->>V: verificar generación o liberar captura tardía
    V->>V: capturedUri + analysis mode
    V->>C: recognizeText
    C-->>V: observedText
    V->>V: verificar generación tras OCR
    V->>Q: wine.scan
    Q->>S: scanLabel + AbortSignal
    S->>H: imageUri + observedText + AbortSignal
    H->>H: multipart image + observedText
    H-->>S: raw scan response
    S-->>Q: mapped model
    Q-->>V: operation outcome
    V->>V: generation check and result mode
```

[Ver diagrama de «Interaccion tecnica» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-wine-label-scan-032b9c1f0355.svg)

El multipart no contiene un campo locale. El request de escaneo transmite la
imagen; transmisión no equivale a persistirla como imagen del catálogo.

## Estados de recuperacion

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

[Ver diagrama de «Estados de recuperacion» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-wine-label-scan-25dbae7f8951.svg)

Los nombres visuales found/suggestions/no-match son ramas del resultado;
`mode` del ViewModel agrupa su presentación. El circuito conserva captura para
reintentar o enviar un vino. Véase [lifecycle](scan-lifecycle.md).
