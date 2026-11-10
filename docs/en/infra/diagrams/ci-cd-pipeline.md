# CI/CD diagrams

## Pull request

```mermaid
flowchart LR
    ISSUE["Issue"] --> CREATE["Create Work Branch"]
    CREATE --> BRANCH["type/issue-slug linked branch"]
    BRANCH --> PR["Pull request"]
    PR --> REPO["Repository checks: impact, branch name, docs, automation, actionlint, secrets"]
    REPO --> TREE["validated-tree marker (PR into development)"]
    REPO --> SEC["security when there is something to scan"]
    REPO --> BE["backend Maven verify if affected"]
    REPO --> WEB["web lint/test/build if affected"]
    REPO --> MOB["mobile doctor/lint/type/test/export if affected"]
    REPO --> DOCS["docs site: tests + types if affected"]
    BE --> GATE{"CI quality gate"}
    WEB --> GATE
    MOB --> GATE
    DOCS --> GATE
    SEC --> GATE
    REPO --> GATE
    PR --> PAGES["Cloudflare Pages: docs site build"]
    GATE --> MERGE{"checks before merging"}
    PAGES --> MERGE
```

[View the full “Pull request” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-ci-cd-pipeline-8b865ad52c82.svg)

## Post-merge coordination

```mermaid
flowchart TD
    PUSH["development push"] --> BASE["diff since last successful push CI, including deploys"]
    BASE --> SAME{"did a successful PR validate this exact tree?"}
    SAME -->|yes| SKIP["no repeated validation: pending deploys only"]
    SAME -->|no| CHECK["affected validation + Repository checks"]
    SKIP --> GATE{"CI quality gate passed"}
    CHECK --> GATE
    GATE --> BE["backend if affected: build + exact scan + deploy"]
    GATE --> WEBWAIT["web if affected"]
    BE --> ORDER{"backend passed or not required"}
    WEBWAIT --> ORDER
    ORDER --> WEB["dev build + readiness + CloudFront/S3"]
    BE --> DONE["overall CI result"]
    WEB --> DONE
    DONE --> NEXT["future baseline only on overall success"]
```

[View the full “Post-merge coordination” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-ci-cd-pipeline-1ba63fde6cba.svg)

Adapters verify the remote development tip before using credentials. A superseded run
skips its remaining steps and ends green; per-resource queues do not interrupt an
active deployment.

## Backend development deploy

```mermaid
sequenceDiagram
    participant G as GitHub Actions
    participant E as ECR
    participant A as EC2/SSM
    participant D as deploy.sh
    participant H as Public health
    G->>G: same-commit CI quality gate passed
    G->>G: buildx load and scan exact image
    G->>G: verify current SHA and retain report/SBOM
    G->>E: push scanned image dev-SHA + dev-latest
    G->>A: start and wait status-ok
    G->>A: sync scripts + SHA256 verify
    G->>A: Run Command deploy
    A->>D: refresh env, pull, up DB/API
    D->>D: wait health, then up proxy
    D-->>G: success/failure diagnostics
    G->>H: repeated curl
```

[View the full “Backend development deploy” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-ci-cd-pipeline-41af0c88b539.svg)

## Web development deploy

```mermaid
flowchart LR
    SEC["CI passed + backend passed or not required"] --> BUILD
    BUILD["dev-configured build; no repeated tests"] --> VERIFY["artifact/config + current SHA + readiness"]
    VERIFY --> HEADERS["test/publish function + wait for CloudFront"]
    HEADERS --> ASSET["S3 assets immutable"]
    ASSET --> ENTRY["S3 entry no-cache"]
    ASSET --> INVALIDATE["CloudFront invalidation"]
    ENTRY --> INVALIDATE
    INVALIDATE --> SMOKE["public curl"]
```

[View the full “Web development deploy” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-ci-cd-pipeline-ce730c934d5e.svg)

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

[View the full “Production release” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-ci-cd-pipeline-eb4cef1ebc58.svg)
