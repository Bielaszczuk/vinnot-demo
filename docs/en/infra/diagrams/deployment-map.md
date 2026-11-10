# Deployment maps

## Development runtime

```mermaid
flowchart LR
    subgraph Clients
      WEB["Browser"]
      MOBILE["Mobile app"]
    end
    WEB --> CF["CloudFront"]
    CF --> S3WEB["S3 static web"]
    WEB --> DNS["api-dev.vinnot.com"]
    MOBILE --> DNS
    DNS --> CADDY["Caddy :443"]
    subgraph EC2["EC2 low-cost host"]
      CADDY --> BACKEND["Spring Boot :8080"]
      BACKEND --> PG["PostgreSQL :5432 internal"]
      PG --> VOL["persistent volume / EBS"]
    end
    subgraph EXTERNAL["External services"]
      MEDIA["Private R2 dev uploads"]
      LEGACY["Legacy S3 dev media"]
      AI["OpenAI"]
      MAIL["SES"]
    end
    BACKEND --> EXTERNAL
    MOBILE --> IMAGES["images.vinnot.com Worker"]
    WEB --> IMAGES
    IMAGES --> MEDIA
    IMAGES --> CATALOG["Shared R2 catalogue"]
```

[View the full “Development runtime” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-deployment-map-d3b0ca9f359d.svg)

## Isolated production runtime

Production templates define a host, network, volumes, secrets and storage separate
from development. Since 2026-10-30 the templates describe the public launch: the
API goes through the Cloudflare proxy and WAF, and the security group opens 80
and 443 only to the Cloudflare ranges. Until the owner applies the
[runbook](../architecture/aws-deployment.md#put-cloudflare-in-front-of-the-api),
clients reach Caddy directly. The development scheduler does not stop this host. This diagram
describes configuration rather than certifying a release or operational test.

```mermaid
flowchart TB
    WEB["Browser: vinnot.com"] --> EDGE["CloudFront + WAF"]
    EDGE --> STATIC["Private S3 production web"]
    WEB --> CFAPI["api.vinnot.com: Cloudflare proxy + WAF"]
    MOBILE["Production mobile"] --> CFAPI
    CFAPI -->|"80/443 only from Cloudflare"| API["Caddy :443"]
    subgraph HOST["Isolated production EC2"]
      API --> BACKEND["Backend: digest approved by release"]
      BACKEND --> PG["PostgreSQL: internal runtime network"]
      PG --> VOL["Production EBS volume"]
      PG --> DUMP["Daily database backup"]
      COLLECTOR["systemd collector"] --> BACKEND
    end
    DUMP --> BACKUP["Private S3 production backups"]
    BACKEND --> MEDIA["Private R2 production uploads"]
    BACKEND --> LEGACY["Legacy S3 production media"]
    WEB --> IMAGES["images.vinnot.com Worker"]
    MOBILE --> IMAGES
    IMAGES --> MEDIA
    IMAGES --> CATALOG["Shared R2 catalogue"]
    PROBE["Independent Lambda edge probe"] --> EDGE
    PROBE --> CFAPI
    PROBE --> CW["CloudWatch"]
    COLLECTOR --> CW
    CW --> SNS["SNS: ALARM and OK"]
```

[View the full “Isolated production runtime” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-deployment-map-b2f942e9253e.svg)

## UML deployment diagram

Shows in UML deployment notation the physical and execution nodes, the artifacts that run on each one and the protocols that connect them. Development and production repeat the EC2 node on separate hosts; monitoring and the control plane are left out.

```mermaid
flowchart LR
    subgraph PHONE["«device» iOS / Android phone"]
        APP["«artifact» Vinnot app (Expo)"]
    end
    subgraph PC["«device» Computer"]
        subgraph BROWSER["«executionEnvironment» Browser"]
            SPA["«artifact» Web SPA (React)"]
        end
    end
    subgraph AWS["«cloud» AWS"]
        CDN["«executionEnvironment» CloudFront + WAF"]
        WEBS3["«artifact» web bundle in private S3"]
        subgraph EC2["«device» EC2 per environment"]
            subgraph DOCKER["«executionEnvironment» Docker Compose"]
                CADDY["«artifact» Caddy :443"]
                API["«artifact» Spring Boot backend :8080"]
                PG["«artifact» PostgreSQL :5432"]
            end
        end
        ECR["«executionEnvironment» ECR"]
        SECRETS["«executionEnvironment» Secrets Manager"]
        SES["«executionEnvironment» Amazon SES"]
        BACKUPS["«artifact» backups in private S3"]
    end
    subgraph CF["«cloud» Cloudflare"]
        WORKER["«executionEnvironment» Worker images.vinnot.com"]
        R2["«artifact» R2: catalogue, dev and prod uploads, diagrams and videos"]
        PAGES["«executionEnvironment» Pages vinnot-docs"]
        CFAPI["«executionEnvironment» proxy + WAF api.vinnot.com"]
    end
    subgraph EXT["«cloud» External services"]
        MP["«executionEnvironment» Mercado Pago API"]
        OAI["«executionEnvironment» OpenAI API"]
        EXPO["«executionEnvironment» Expo: push and OTA updates"]
    end
    SPA ---|"HTTPS"| CDN
    CDN ---|"HTTPS"| WEBS3
    SPA ---|"HTTPS + cookie"| CFAPI
    APP ---|"HTTPS + Bearer"| CFAPI
    CFAPI ---|"HTTPS Full strict"| CADDY
    CADDY ---|"HTTP"| API
    API ---|"JDBC"| PG
    PG ---|"daily backup (production)"| BACKUPS
    SPA ---|"HTTPS"| WORKER
    APP ---|"HTTPS"| WORKER
    WORKER ---|"R2 binding"| R2
    API ---|"HTTPS (S3 API)"| R2
    API ---|"HTTPS"| MP
    API ---|"HTTPS"| OAI
    API ---|"HTTPS"| SES
    API ---|"HTTPS"| EXPO
    APP ---|"HTTPS"| EXPO
    DOCKER ---|"HTTPS (image pull)"| ECR
    DOCKER ---|"HTTPS (runtime.env)"| SECRETS
    BROWSER ---|"HTTPS"| PAGES
```

[View the full “UML deployment diagram” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-deployment-map-82cba128f0e3.svg)

## Control plane

```mermaid
flowchart LR
    GH["GitHub Actions"] --> IAM["AWS credentials"]
    GH --> ECR["ECR images"]
    GH --> SSM["SSM command"]
    SSM --> HOST["EC2 agent"]
    SCHED["Development EventBridge Scheduler"] --> HOST
    HOST --> SECRET["Secrets Manager runtime.env"]
    HOST --> ECR
```

[View the full “Control plane” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-deployment-map-5e97f7a29005.svg)

## Data boundary

```mermaid
flowchart LR
    REBUILD["reproducible: image, bundle"] --> REPO["Git/ECR/S3 web"]
    CRITICAL["critical: DB, media, secrets"] --> PGVOL["EBS volume"]
    CRITICAL --> MEDIA["R2 uploads/catalogue + legacy S3"]
    CRITICAL --> SSM["Secrets Manager"]
    PGVOL --> BACKUP["encrypted off-host backup"]
```

[View the full “Data boundary” diagram](https://images.vinnot.com/docs/diagrams/v1/en/infra-diagrams-deployment-map-c6fef61b5b99.svg)

