# Diagramas de CI/CD

## Pull request

```mermaid
flowchart LR
    ISSUE["Issue"] --> CREATE["Create Work Branch"]
    CREATE --> BRANCH["tipo/issue-slug vinculado"]
    BRANCH --> PR["Pull request"]
    PR --> REPO["Repository checks: impacto, nombre de rama, docs, automatización, actionlint, secretos"]
    REPO --> TREE["marcador del árbol validado (PR a development)"]
    REPO --> SEC["seguridad si hay algo que escanear"]
    REPO --> BE["backend Maven verify si afectado"]
    REPO --> WEB["web lint/test/build si afectado"]
    REPO --> MOB["mobile doctor/lint/type/test/export si afectado"]
    REPO --> DOCS["sitio de docs: tests + tipos si afectado"]
    BE --> GATE{"CI quality gate"}
    WEB --> GATE
    MOB --> GATE
    DOCS --> GATE
    SEC --> GATE
    REPO --> GATE
    PR --> PAGES["Cloudflare Pages: build del sitio de docs"]
    GATE --> MERGE{"checks antes de mergear"}
    PAGES --> MERGE
```

[Ver diagrama de «Pull request» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-ci-cd-pipeline-ef962cad78b4.svg)

## Coordinación después del merge

```mermaid
flowchart TD
    PUSH["push development"] --> BASE["diff desde último CI push exitoso, incluidos deploys"]
    BASE --> SAME{"¿un PR exitoso validó este mismo árbol?"}
    SAME -->|sí| SKIP["sin validar de nuevo: sólo deploys pendientes"]
    SAME -->|no| CHECK["validaciones afectadas + Repository checks"]
    SKIP --> GATE{"CI quality gate aprobado"}
    CHECK --> GATE
    GATE --> BE["backend si afectado: build + scan exacto + deploy"]
    GATE --> WEBWAIT["web si afectada"]
    BE --> ORDER{"backend aprobado o no requerido"}
    WEBWAIT --> ORDER
    ORDER --> WEB["build dev + readiness + CloudFront/S3"]
    BE --> DONE["resultado global de CI"]
    WEB --> DONE
    DONE --> NEXT["baseline de futuras ejecuciones sólo si éxito global"]
```

[Ver diagrama de «Coordinación después del merge» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-ci-cd-pipeline-267b98187c02.svg)

Los adaptadores verifican la punta remota de development antes de usar credenciales.
Un run reemplazado por uno más nuevo omite sus pasos restantes y termina en verde;
las colas por recurso no interrumpen un deploy activo.

## Backend development deploy

```mermaid
sequenceDiagram
    participant G as GitHub Actions
    participant E as ECR
    participant A as EC2/SSM
    participant D as deploy.sh
    participant H as Public health
    G->>G: CI quality gate del mismo commit aprobado
    G->>G: buildx load y scan de la imagen exacta
    G->>G: comprobar SHA vigente y conservar reporte/SBOM
    G->>E: push de imagen escaneada dev-SHA + dev-latest
    G->>A: start and wait status-ok
    G->>A: sync scripts + SHA256 verify
    G->>A: Run Command deploy
    A->>D: refresh env, pull, up DB/API
    D->>D: wait health, then up proxy
    D-->>G: success/failure diagnostics
    G->>H: repeated curl
```

[Ver diagrama de «Backend development deploy» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-ci-cd-pipeline-50abbfcd7c43.svg)

## Web development deploy

```mermaid
flowchart LR
    SEC["CI aprobado + backend aprobado o no requerido"] --> BUILD
    BUILD["build con configuración dev; sin repetir tests"] --> VERIFY["artifact/config + SHA vigente + readiness"]
    VERIFY --> HEADERS["test/publicación de función + esperar CloudFront"]
    HEADERS --> ASSET["S3 assets immutable"]
    ASSET --> ENTRY["S3 entry no-cache"]
    ASSET --> INVALIDATE["CloudFront invalidation"]
    ENTRY --> INVALIDATE
    INVALIDATE --> SMOKE["public curl"]
```

[Ver diagrama de «Web development deploy» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-ci-cd-pipeline-b7686f644563.svg)

## Production release

```mermaid
flowchart LR
    MAIN["approved current main + successful CI"] --> PREPARE["prepare: build changed components + verified reuse"]
    PREPARE --> ARTIFACT["immutable package + SHA256 manifest"]
    ARTIFACT --> DISPATCH["explicit publish dispatch"]
    DISPATCH --> VERIFY["run provenance + hashes + current main"]
    VERIFY --> NEED{"components changed?"}
    NEED -->|no| UNCHANGED["no AWS writes"]
    NEED -->|yes| ROLE["separate OIDC production role"]
    ROLE --> HOST["backend if changed: SSM + schema + digest + health"]
    HOST --> WEB["web if changed: retained assets + entrypoint last"]
    WEB --> MODE{"authorized access mode"}
    MODE -->|private| PRIVATE["browser acceptance from allowed IP"]
    MODE -->|public| PUBLIC["public browser smoke + edge monitor"]
```

[Ver diagrama de «Production release» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-ci-cd-pipeline-eb4cef1ebc58.svg)
