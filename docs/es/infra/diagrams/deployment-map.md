# Mapas de despliegue

## Runtime development

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

[Ver diagrama de «Runtime development» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-deployment-map-d3b0ca9f359d.svg)

## Runtime productivo aislado

La topología definida en las plantillas productivas tiene host, red, volúmenes,
secretos y almacenamiento separados de development. Desde el 2026-10-30 las
plantillas describen el lanzamiento público: la API pasa por el proxy y el WAF de
Cloudflare, y el security group abre 80 y 443 solo a los rangos de Cloudflare.
Hasta que el responsable aplique el
[runbook](../architecture/aws-deployment.md#poner-cloudflare-delante-de-la-api),
los clientes llegan directo a Caddy. El scheduler de development no detiene este
host. El diagrama describe la configuración, no certifica una
publicación ni una prueba operativa concreta.

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

[Ver diagrama de «Runtime productivo aislado» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-deployment-map-b2f942e9253e.svg)

## Diagrama de despliegue UML

Muestra en notación de despliegue UML los nodos físicos y de ejecución, los artefactos que corren en cada uno y los protocolos que los comunican. Development y producción repiten el nodo EC2 en hosts separados; se omiten el monitoreo y el plano de control.

```mermaid
flowchart LR
    subgraph PHONE["«device» Teléfono iOS / Android"]
        APP["«artifact» App Vinnot (Expo)"]
    end
    subgraph PC["«device» Computadora"]
        subgraph BROWSER["«executionEnvironment» Navegador"]
            SPA["«artifact» SPA web (React)"]
        end
    end
    subgraph AWS["«cloud» AWS"]
        CDN["«executionEnvironment» CloudFront + WAF"]
        WEBS3["«artifact» bundle web en S3 privado"]
        subgraph EC2["«device» EC2 por entorno"]
            subgraph DOCKER["«executionEnvironment» Docker Compose"]
                CADDY["«artifact» Caddy :443"]
                API["«artifact» backend Spring Boot :8080"]
                PG["«artifact» PostgreSQL :5432"]
            end
        end
        ECR["«executionEnvironment» ECR"]
        SECRETS["«executionEnvironment» Secrets Manager"]
        SES["«executionEnvironment» Amazon SES"]
        BACKUPS["«artifact» respaldos en S3 privado"]
    end
    subgraph CF["«cloud» Cloudflare"]
        WORKER["«executionEnvironment» Worker images.vinnot.com"]
        R2["«artifact» R2: catálogo, uploads dev y prod, diagramas y videos"]
        PAGES["«executionEnvironment» Pages vinnot-docs"]
        CFAPI["«executionEnvironment» proxy + WAF api.vinnot.com"]
    end
    subgraph EXT["«cloud» Servicios externos"]
        MP["«executionEnvironment» API de Mercado Pago"]
        OAI["«executionEnvironment» API de OpenAI"]
        EXPO["«executionEnvironment» Expo: push y actualizaciones OTA"]
    end
    SPA ---|"HTTPS"| CDN
    CDN ---|"HTTPS"| WEBS3
    SPA ---|"HTTPS + cookie"| CFAPI
    APP ---|"HTTPS + Bearer"| CFAPI
    CFAPI ---|"HTTPS Full strict"| CADDY
    CADDY ---|"HTTP"| API
    API ---|"JDBC"| PG
    PG ---|"respaldo diario (producción)"| BACKUPS
    SPA ---|"HTTPS"| WORKER
    APP ---|"HTTPS"| WORKER
    WORKER ---|"binding R2"| R2
    API ---|"HTTPS (API S3)"| R2
    API ---|"HTTPS"| MP
    API ---|"HTTPS"| OAI
    API ---|"HTTPS"| SES
    API ---|"HTTPS"| EXPO
    APP ---|"HTTPS"| EXPO
    DOCKER ---|"HTTPS (pull de imagen)"| ECR
    DOCKER ---|"HTTPS (runtime.env)"| SECRETS
    BROWSER ---|"HTTPS"| PAGES
```

[Ver diagrama de «Diagrama de despliegue UML» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-deployment-map-82939a16bbdf.svg)

## Plano de control

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

[Ver diagrama de «Plano de control» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-deployment-map-5e97f7a29005.svg)

## Frontera de datos

```mermaid
flowchart LR
    REBUILD["reconstruible: image, bundle"] --> REPO["Git/ECR/S3 web"]
    CRITICAL["crítico: DB, media, secrets"] --> PGVOL["EBS volume"]
    CRITICAL --> MEDIA["R2 uploads/catalogue + legacy S3"]
    CRITICAL --> SSM["Secrets Manager"]
    PGVOL --> BACKUP["encrypted off-host backup"]
```

[Ver diagrama de «Frontera de datos» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-deployment-map-5ac92d9ec8c0.svg)

