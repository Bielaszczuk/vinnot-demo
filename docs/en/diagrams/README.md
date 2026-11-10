# Diagrams

Diagrams live on the page that explains them. This catalog lists them by type, with the
section where each one is. Page diagrams are drawn with Mermaid; the component diagrams
per use case are in Lucidchart.

## Use cases

| Diagram | Page |
|---|---|
| Activity | [Activity · Use cases](../modules/activity/use-cases/README.md) |
| Administration and moderation | [Administration and moderation · Use cases](../modules/admin/use-cases/README.md) |
| AI profiles and comparisons | [AI profiles and comparisons · Use cases](../modules/ai/use-cases/README.md) |
| Cellar | [Cellar · Use cases](../modules/cellar/use-cases/README.md) |
| Community | [Community · Use cases](../modules/community/use-cases/README.md) |
| Events and tickets | [Events and tickets · Use cases](../modules/events/use-cases/README.md) |
| Points and seals | [Points and seals · Use cases](../modules/gamification/use-cases/README.md) |
| Legal | [Legal · Use cases](../modules/legal/use-cases/README.md) |
| Social media marketing | [Social media marketing · Use cases](../modules/marketing/use-cases/README.md) |
| Notifications | [Notifications · Use cases](../modules/notifications/use-cases/README.md) |
| Partners | [Partners · Use cases](../modules/partner/use-cases/README.md) |
| Payments | [Payments · Use cases](../modules/payments/use-cases/README.md) |
| Reviews · Readers and authors | [Reviews · Use cases](../modules/reviews/use-cases/README.md) |
| Reviews · Moderation | [Reviews · Use cases](../modules/reviews/use-cases/README.md) |
| Reviews · Activity notices | [Reviews · Use cases](../modules/reviews/use-cases/README.md) |
| Sharing | [Sharing · Use cases](../modules/sharing/use-cases/README.md) |
| Support and public information | [Support and public information · Use cases](../modules/support/use-cases/README.md) |
| Users and account · Sign-up and sign-in | [Users and account · Use cases](../modules/users/use-cases/README.md) |
| Users and account · Session | [Users and account · Use cases](../modules/users/use-cases/README.md) |
| Users and account · Profile and account | [Users and account · Use cases](../modules/users/use-cases/README.md) |
| Users and account · Navigation | [Users and account · Use cases](../modules/users/use-cases/README.md) |
| Wine routes | [Wine routes · Use cases](../modules/wine-routes/use-cases/README.md) |
| Wineries and regions | [Wineries and regions · Use cases](../modules/wineries/use-cases/README.md) |
| Wines | [Wines · Use cases](../modules/wines/use-cases/README.md) |

## Sequence

Each use case has its sequence diagram on its page. By module:

- [Activity](../modules/activity/use-cases/README.md): 3 use cases
- [Administration and moderation](../modules/admin/use-cases/README.md): 15 use cases
- [AI profiles and comparisons](../modules/ai/use-cases/README.md): 4 use cases
- [Cellar](../modules/cellar/use-cases/README.md): 6 use cases
- [Community](../modules/community/use-cases/README.md): 4 use cases
- [Events and tickets](../modules/events/use-cases/README.md): 9 use cases
- [Points and seals](../modules/gamification/use-cases/README.md): 4 use cases
- [Legal](../modules/legal/use-cases/README.md): 8 use cases
- [Social media marketing](../modules/marketing/use-cases/README.md): 12 use cases
- [Notifications](../modules/notifications/use-cases/README.md): 7 use cases
- [Partners](../modules/partner/use-cases/README.md): 6 use cases
- [Payments](../modules/payments/use-cases/README.md): 6 use cases
- [Reviews](../modules/reviews/use-cases/README.md): 7 use cases
- [Sharing](../modules/sharing/use-cases/README.md): 3 use cases
- [Support and public information](../modules/support/use-cases/README.md): 3 use cases
- [Users and account](../modules/users/use-cases/README.md): 23 use cases
- [Wine routes](../modules/wine-routes/use-cases/README.md): 4 use cases
- [Wineries and regions](../modules/wineries/use-cases/README.md): 3 use cases
- [Wines](../modules/wines/use-cases/README.md): 9 use cases

| Diagram | Page |
|---|---|
| Request walkthrough | [System architecture](../architecture/README.md) |
| Recent administrator confirmation | [Authentication, identity, and account lifecycle](../backend/architecture/authentication-and-identity.md) |
| Credential registration | [Authentication, identity, and account lifecycle](../backend/architecture/authentication-and-identity.md) |
| Renewal, rotation, and logout | [Authentication, identity, and account lifecycle](../backend/architecture/authentication-and-identity.md) |
| HTTP boundary | [Errors, transactions and consistency](../backend/architecture/errors-transactions-and-consistency.md) |
| Cross-module contracts | [Backend module boundaries and dependencies](../backend/architecture/module-boundaries.md) |
| HTTP correlation | [Backend observability](../backend/architecture/observability.md) |
| Representative read flow | [Backend architecture](../backend/architecture/overview.md) |
| Representative write flow | [Backend architecture](../backend/architecture/overview.md) |
| AI admission, spending, and transport | [Resource protection and external transports](../backend/architecture/resource-protection.md) |
| Versioned sessions | [Sessions, publication and external effects](../backend/architecture/session-and-data-integrity.md) |
| Profile and comparison publication | [Sessions, publication and external effects](../backend/architecture/session-and-data-integrity.md) |
| wine_catalog_search | [Data model and persistence](../backend/data/database-model.md) |
| Event capacity under concurrency | [Data, locks, and consistency](../backend/diagrams/data-consistency.md) |
| Submission identity coordination | [Data, locks, and consistency](../backend/diagrams/data-consistency.md) |
| Database versus storage | [Data, locks, and consistency](../backend/diagrams/data-consistency.md) |
| Public paginated read | [Request and use-case lifecycle](../backend/diagrams/request-lifecycle.md) |
| Transactional command | [Request and use-case lifecycle](../backend/diagrams/request-lifecycle.md) |
| Scan multipart | [Request and use-case lifecycle](../backend/diagrams/request-lifecycle.md) |
| Distributed cached generation | [Request and use-case lifecycle](../backend/diagrams/request-lifecycle.md) |
| Cross-cutting HTTP pipeline | [Backend system maps](../backend/diagrams/system-map.md) |
| Reference catalogs | [Public files, quarantine and reference data](../backend/use-cases/uploads-and-reference-data.md) |
| Money flow of a sale | [Monetization and plans](../business/monetization.md) |
| Subscription purchase flow | [Monetization and plans](../business/monetization.md) |
| Bootstrap and restoration | [Mobile navigation, session and state](../frontend-mobile/architecture/navigation-and-state.md) |
| Read and write sequence | [Mobile remote state, operations and transport](../frontend-mobile/architecture/remote-state-and-transport.md) |
| Concurrent refresh | [Mobile application maps](../frontend-mobile/diagrams/application-map.md) |
| Tab reset versus contextual back | [Mobile navigation and session diagrams](../frontend-mobile/diagrams/navigation-and-session.md) |
| Social login | [Product sequences and states mobile](../frontend-mobile/diagrams/product-processes.md) |
| AI profile and localized representation | [Product sequences and states mobile](../frontend-mobile/diagrams/product-processes.md) |
| Cellar or review: write and cache | [Product sequences and states mobile](../frontend-mobile/diagrams/product-processes.md) |
| Cancellation sequence | [Scanner capture, cancellation and recovery](../frontend-mobile/diagrams/scan-lifecycle.md) |
| Technical interaction | [Mobile-only scanning diagrams](../frontend-mobile/diagrams/wine-label-scan.md) |
| Mutations and invalidation | [Web remote state and transport](../frontend-web/architecture/remote-state-and-transport.md) |
| Concurrent session | [Web application maps](../frontend-web/diagrams/application-map.md) |
| Mutation and invalidation | [Web application maps](../frontend-web/diagrams/application-map.md) |
| Social login | [Product sequences and states web](../frontend-web/diagrams/product-processes.md) |
| AI profile and localized representation | [Product sequences and states web](../frontend-web/diagrams/product-processes.md) |
| Cellar or review: write and cache | [Product sequences and states web](../frontend-web/diagrams/product-processes.md) |
| Partner ownership | [Web routing and access diagrams](../frontend-web/diagrams/routing-and-access.md) |
| Cookie restoration and tab isolation | [Web server-state and HTTP diagrams](../frontend-web/diagrams/server-state-and-http.md) |
| Identity change | [Web server-state and HTTP diagrams](../frontend-web/diagrams/server-state-and-http.md) |
| Migrations outside runtime | [AWS deployment architecture](../infra/architecture/aws-deployment.md) |
| Runtime flow | [Environments, configuration and secrets](../infra/architecture/environments-and-secrets.md) |
| Backend development deploy | [CI/CD diagrams](../infra/diagrams/ci-cd-pipeline.md) |
| Cover upload and reference | [User images: WebP and R2](../infra/operations/user-images-r2.md) |
| Creation: sequence and validation | [Administration and moderation · Architecture](../modules/admin/architecture.md) |
| Safe editing and view updates | [Administration and moderation · Architecture](../modules/admin/architecture.md) |
| Safe editing and view updates | [Administration and moderation · Architecture](../modules/admin/architecture.md) |
| Ensure versus forced regeneration | [AI profiles and comparisons · Architecture](../modules/ai/architecture.md) |
| Add flow | [Cellar · Architecture](../modules/cellar/architecture.md) |
| Discovery algorithm | [Events and tickets · Architecture](../modules/events/architecture.md) |
| Acceptance flow | [Legal · Architecture](../modules/legal/architecture.md) |
| Publishing to the networks | [Social media marketing · Architecture](../modules/marketing/architecture.md) |
| Accounts and OAuth | [Social media marketing · Architecture](../modules/marketing/architecture.md) |
| Create and metric propagation | [Reviews · Architecture](../modules/reviews/architecture.md) |
| Sequence | [Support and public information · Architecture](../modules/support/architecture.md) |
| Profile update | [Users and account · Architecture](../modules/users/architecture.md) |
| Search and detail | [Wineries and regions · Architecture](../modules/wineries/architecture.md) |
| Search flow | [Wines · Architecture](../modules/wines/architecture.md) |
| Catalog retrieval and aliases | [Wines · Architecture](../modules/wines/architecture.md) |
| Safe publication of a missing catalog image | [Wines · Architecture](../modules/wines/architecture.md) |
| End-to-end intake | [Wines · Proposed wines: submission, moderation and publishing](../modules/wines/submissions.md) |
| Sign-in | [Passwords and authentication](../security/passwords-and-authentication.md) |
| Refresh-token rotation | [Passwords and authentication](../security/passwords-and-authentication.md) |
| Step-up re-authentication | [Passwords and authentication](../security/passwords-and-authentication.md) |

## Activity

| Diagram | Page |
|---|---|
| Activity diagram: registration and cancellation | [Events and tickets · Architecture](../modules/events/architecture.md) |
| Activity diagram: payment and refund | [Payments · Architecture](../modules/payments/architecture.md) |
| Activity diagram: sign-up, verification and sign-in | [Users and account · Architecture](../modules/users/architecture.md) |
| Activity diagram: label scan | [Wines · Architecture](../modules/wines/architecture.md) |
| Activity diagram: from proposal to publication | [Wines · Proposed wines: submission, moderation and publishing](../modules/wines/submissions.md) |

## Flows and architecture

| Diagram | Page |
|---|---|
| System map | [System architecture](../architecture/README.md) |
| Purpose and scope | [Authentication, identity, and account lifecycle](../backend/architecture/authentication-and-identity.md) |
| Social login | [Authentication, identity, and account lifecycle](../backend/architecture/authentication-and-identity.md) |
| Dependency topology | [Backend module boundaries and dependencies](../backend/architecture/module-boundaries.md) |
| Exact architectural classification | [Backend architecture](../backend/architecture/overview.md) |
| Module hexagon | [Backend architecture](../backend/architecture/overview.md) |
| Logical CQRS | [Backend architecture](../backend/architecture/overview.md) |
| Responsibilities | [Resource protection and external transports](../backend/architecture/resource-protection.md) |
| Actual HTTP pipeline | [Security, authorization, and abuse protection](../backend/architecture/security-and-authorization.md) |
| Roles, permissions, and ownership | [Security, authorization, and abuse protection](../backend/architecture/security-and-authorization.md) |
| External-effect outbox | [Sessions, publication and external effects](../backend/architecture/session-and-data-integrity.md) |
| roles, permissions, user_roles, role_permissions | [Data model and persistence](../backend/data/database-model.md) |
| Catalog search pipeline | [Query performance and indexing](../backend/data/query-performance.md) |
| Queries and weights | [Query performance and indexing](../backend/data/query-performance.md) |
| Transaction boundaries | [Data, locks, and consistency](../backend/diagrams/data-consistency.md) |
| AI single-flight | [Data, locks, and consistency](../backend/diagrams/data-consistency.md) |
| Sessions and tokens | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Account: independent axes | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Stable errors | [Request and use-case lifecycle](../backend/diagrams/request-lifecycle.md) |
| Product context | [Backend system maps](../backend/diagrams/system-map.md) |
| Logical containers | [Backend system maps](../backend/diagrams/system-map.md) |
| Domain modules | [Backend system maps](../backend/diagrams/system-map.md) |
| Facades and adapters | [Backend system maps](../backend/diagrams/system-map.md) |
| Hexagonal slice of one module | [Backend system maps](../backend/diagrams/system-map.md) |
| Logical CQRS separation over one database | [Backend system maps](../backend/diagrams/system-map.md) |
| Persistence and external effects | [Backend system maps](../backend/diagrams/system-map.md) |
| Pyramid and responsibilities | [Comprehensive testing strategy](../backend/testing/strategy.md) |
| Mirrored test architecture | [Comprehensive testing strategy](../backend/testing/strategy.md) |
| CI and gate order | [Comprehensive testing strategy](../backend/testing/strategy.md) |
| Scope and composition | [Public files, quarantine and reference data](../backend/use-cases/uploads-and-reference-data.md) |
| The Canvas as a board | [Business Model Canvas](../business/business-model-canvas.md) |
| Business sequence | [Business Model Canvas](../business/business-model-canvas.md) |
| Architecture evolution | [Capacity and cost projections](../business/capacity-and-cost-projections.md) |
| Which decision each platform solves | [Competitive analysis](../business/competitive-analysis.md) |
| Monthly cost split | [Current costs](../business/costs.md) |
| AWS bill over time | [Current costs](../business/costs.md) |
| From usage to revenue | [Key metrics](../business/key-metrics.md) |
| Commission roadmap | [Monetization and plans](../business/monetization.md) |
| Ecosystem and value flows | [Business model](../business/README.md) |
| Factor map | [SWOT analysis](../business/swot.md) |
| Runtime composition | [Mobile frontend architecture](../frontend-mobile/architecture/overview.md) |
| Runtime composition | [Mobile application maps](../frontend-mobile/diagrams/application-map.md) |
| Layers and dependency direction | [Mobile application maps](../frontend-mobile/diagrams/application-map.md) |
| Navigation tree | [Mobile application maps](../frontend-mobile/diagrams/application-map.md) |
| State and data | [Mobile application maps](../frontend-mobile/diagrams/application-map.md) |
| Per-module flows | [Mobile application maps](../frontend-mobile/diagrams/application-map.md) |
| Access tree | [Mobile navigation and session diagrams](../frontend-mobile/diagrams/navigation-and-session.md) |
| Search and pagination | [Product sequences and states mobile](../frontend-mobile/diagrams/product-processes.md) |
| Event registration | [Product sequences and states mobile](../frontend-mobile/diagrams/product-processes.md) |
| App submission and review | [Product sequences and states mobile](../frontend-mobile/diagrams/product-processes.md) |
| Routes and channels | [Public navigation and recovery](../frontend-mobile/diagrams/public-information.md) |
| Read results and visual states | [Public navigation and recovery](../frontend-mobile/diagrams/public-information.md) |
| Cancellation sequence | [Scanner capture, cancellation and recovery](../frontend-mobile/diagrams/scan-lifecycle.md) |
| Product workflow | [Mobile-only scanning diagrams](../frontend-mobile/diagrams/wine-label-scan.md) |
| Cache model | [Web routing, access and state](../frontend-web/architecture/navigation-and-state.md) |
| Composition | [Web frontend architecture](../frontend-web/architecture/overview.md) |
| Layers and dependencies | [Web application maps](../frontend-web/diagrams/application-map.md) |
| Route tree | [Web application maps](../frontend-web/diagrams/application-map.md) |
| Search and pagination | [Product sequences and states web](../frontend-web/diagrams/product-processes.md) |
| Event registration | [Product sequences and states web](../frontend-web/diagrams/product-processes.md) |
| App submission and review | [Product sequences and states web](../frontend-web/diagrams/product-processes.md) |
| Routes and channels | [Public navigation and recovery](../frontend-web/diagrams/public-information.md) |
| Read results and visual states | [Public navigation and recovery](../frontend-web/diagrams/public-information.md) |
| Guard decision | [Web routing and access diagrams](../frontend-web/diagrams/routing-and-access.md) |
| Query identity | [Web server-state and HTTP diagrams](../frontend-web/diagrams/server-state-and-http.md) |
| Error taxonomy | [Web server-state and HTTP diagrams](../frontend-web/diagrams/server-state-and-http.md) |
| Flow of a change | [Development process](../governance/development-process.md) |
| Flow of a signal | [Activity · Architecture](../modules/activity/architecture.md) |
| Architecture | [Administration and moderation · Architecture](../modules/admin/architecture.md) |
| Purpose and boundaries | [Administration and moderation · Architecture](../modules/admin/architecture.md) |
| Administrative dashboard | [Administration and moderation · Architecture](../modules/admin/architecture.md) |
| Suspension and reactivation | [Administration and moderation · Architecture](../modules/admin/architecture.md) |
| Events | [Administration and moderation · Architecture](../modules/admin/architecture.md) |
| Architecture | [AI profiles and comparisons · Architecture](../modules/ai/architecture.md) |
| Module boundaries | [AI profiles and comparisons · Architecture](../modules/ai/architecture.md) |
| Canonical pair | [AI profiles and comparisons · Architecture](../modules/ai/architecture.md) |
| Editorial depth and quick information | [AI profiles and comparisons · Architecture](../modules/ai/architecture.md) |
| Architecture | [Cellar · Architecture](../modules/cellar/architecture.md) |
| Architecture | [Community · Architecture](../modules/community/architecture.md) |
| Architecture | [Events and tickets · Architecture](../modules/events/architecture.md) |
| Registration preconditions and settings | [Events and tickets · Architecture](../modules/events/architecture.md) |
| Flow of an award | [Points and seals · Architecture](../modules/gamification/architecture.md) |
| Architecture | [Legal · Architecture](../modules/legal/architecture.md) |
| Architecture | [Social media marketing · Architecture](../modules/marketing/architecture.md) |
| Architecture | [Notifications · Architecture](../modules/notifications/architecture.md) |
| Responsibilities and boundaries | [Notifications · Architecture](../modules/notifications/architecture.md) |
| Architecture | [Partners · Architecture](../modules/partner/architecture.md) |
| Architecture | [Payments · Architecture](../modules/payments/architecture.md) |
| Receipt status | [Payments](../modules/payments/README.md) |
| Architecture | [Reviews · Architecture](../modules/reviews/architecture.md) |
| Architecture | [Sharing · Architecture](../modules/sharing/architecture.md) |
| Architecture | [Support and public information · Architecture](../modules/support/architecture.md) |
| Architecture | [Users and account · Architecture](../modules/users/architecture.md) |
| Architecture | [Wine routes · Architecture](../modules/wine-routes/architecture.md) |
| Creation | [Wine routes · Architecture](../modules/wine-routes/architecture.md) |
| Filter hierarchy | [Wine routes · Architecture](../modules/wine-routes/architecture.md) |
| Architecture | [Wineries and regions · Architecture](../modules/wineries/architecture.md) |
| Creation and update | [Wineries and regions · Architecture](../modules/wineries/architecture.md) |
| Architecture | [Wines · Architecture](../modules/wines/architecture.md) |
| Search-plan selection | [Wines · Architecture](../modules/wines/architecture.md) |
| Detail composition | [Wines · Architecture](../modules/wines/architecture.md) |
| Orchestration | [Wines · Architecture](../modules/wines/architecture.md) |
| Functional flow | [Wines · Architecture](../modules/wines/architecture.md) |
| Backend pipeline | [Wines · Architecture](../modules/wines/architecture.md) |
| Architecture | [Wines · Proposed wines: submission, moderation and publishing](../modules/wines/submissions.md) |
| Quarantine and image lifecycle | [Wines · Proposed wines: submission, moderation and publishing](../modules/wines/submissions.md) |
| Guided tour by role | [Product access](../project/deliverables-and-access.md) |
| Milestones | [Project plan](../project/project-plan.md) |
| Methodology | [Project plan](../project/project-plan.md) |
| System overview | [Project](../project/README.md) |
| Architecture conventions | [Repository organization](../project/repository-organization.md) |
| How they are identified | [Requirements index](../project/requirements-index.md) |
| Metric status | [Quality metrics](../quality/metrics.md) |
| Model map | [Quality model](../quality/quality-model.md) |
| Quality system | [Software quality](../quality/README.md) |
| Probability and impact | [Risk-based testing](../quality/risk-based-testing.md) |
| Test cycle per release | [Test plan](../quality/test-plan.md) |
| Defense layers | [Defense in depth](../security/defense-in-depth.md) |
| Trust boundaries | [Security](../security/README.md) |

## Deployment and infrastructure

| Diagram | Page |
|---|---|
| Development-environment goal | [AWS deployment architecture](../infra/architecture/aws-deployment.md) |
| Production database roles | [Environments, configuration and secrets](../infra/architecture/environments-and-secrets.md) |
| Dependency map | [External services](../infra/architecture/external-services.md) |
| Production end to end | [Hosting and runtime](../infra/architecture/hosting-and-runtime.md) |
| Development end to end | [Hosting and runtime](../infra/architecture/hosting-and-runtime.md) |
| Pull request | [CI/CD diagrams](../infra/diagrams/ci-cd-pipeline.md) |
| Post-merge coordination | [CI/CD diagrams](../infra/diagrams/ci-cd-pipeline.md) |
| Web development deploy | [CI/CD diagrams](../infra/diagrams/ci-cd-pipeline.md) |
| Production release | [CI/CD diagrams](../infra/diagrams/ci-cd-pipeline.md) |
| Development runtime | [Deployment maps](../infra/diagrams/deployment-map.md) |
| Isolated production runtime | [Deployment maps](../infra/diagrams/deployment-map.md) |
| UML deployment diagram | [Deployment maps](../infra/diagrams/deployment-map.md) |
| Control plane | [Deployment maps](../infra/diagrams/deployment-map.md) |
| Data boundary | [Deployment maps](../infra/diagrams/deployment-map.md) |
| Safe development startup order | [Runtime and recovery diagrams](../infra/diagrams/runtime-and-recovery.md) |
| Database recovery | [Runtime and recovery diagrams](../infra/diagrams/runtime-and-recovery.md) |
| Production application recovery | [Runtime and recovery diagrams](../infra/diagrams/runtime-and-recovery.md) |
| Production isolation | [Backup and disaster recovery](../infra/operations/backup-and-disaster-recovery.md) |
| Architecture and scope | [Infrastructure observability and incidents](../infra/operations/observability-and-incidents.md) |

## Entity-relationship (ERD)

| Diagram | Page |
|---|---|
| Identity and access | [Data model and persistence](../backend/data/database-model.md) |
| Catalog | [Data model and persistence](../backend/data/database-model.md) |
| Reviews and cellar | [Data model and persistence](../backend/data/database-model.md) |
| Events and payments | [Data model and persistence](../backend/data/database-model.md) |
| Routes | [Data model and persistence](../backend/data/database-model.md) |
| AI and submissions | [Data model and persistence](../backend/data/database-model.md) |
| Online payments (V29–V38) | [Data model and persistence](../backend/data/database-model.md) |
| Public support enquiries | [Data model and persistence](../backend/data/database-model.md) |
| Identity and credentials | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Authorization | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Geography and catalog | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Community and cellar | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Events and registrations | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Routes and stops | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Submissions and generated content | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| AI monetary reservations | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Session and external-effect control | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Community and private evidence (V24) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Publication decisions (V26) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Image inventory and budgets (V27) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Online payments (V29–V38) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Preferences, consent, and suppressions (V42–V43) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Push devices and delivery (V46–V68) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Per-type push switches (V59) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Announcements and digests (V49, V56, V60) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Nearby event areas (V50) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Engagement and activity (V52, V66–V67) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Digest cursors (V54–V55) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Minimum app versions (V69) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Social publishing (V82–V84) | [Detailed ERD by context](../backend/diagrams/relational-model.md) |
| Data | [Administration and moderation](../modules/admin/README.md) |
| Data | [AI profiles and comparisons](../modules/ai/README.md) |
| Data | [Cellar](../modules/cellar/README.md) |
| Data | [Community](../modules/community/README.md) |
| Data | [Events and tickets](../modules/events/README.md) |
| Relational model | [Legal · Architecture](../modules/legal/architecture.md) |
| Data | [Legal](../modules/legal/README.md) |
| Data | [Social media marketing](../modules/marketing/README.md) |
| Data | [Notifications](../modules/notifications/README.md) |
| Data | [Partners](../modules/partner/README.md) |
| Data | [Payments](../modules/payments/README.md) |
| Data | [Reviews](../modules/reviews/README.md) |
| Data | [Support and public information](../modules/support/README.md) |
| Data | [Users and account](../modules/users/README.md) |
| Data | [Wine routes](../modules/wine-routes/README.md) |
| Data | [Wineries and regions](../modules/wineries/README.md) |
| Data | [Wines](../modules/wines/README.md) |

## States

| Diagram | Page |
|---|---|
| Row lifecycle | [Sessions, publication and external effects](../backend/architecture/session-and-data-integrity.md) |
| event_registrations | [Data model and persistence](../backend/data/database-model.md) |
| Events | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Registrations and payment | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Registration payment | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Checkout attempt | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Payment reported by the provider | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Refund intent | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Wine submissions | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Account action tokens | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Community reports | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Review and comment publication | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Wine routes | [Domain state machines](../backend/diagrams/domain-state-machines.md) |
| Quarantine, promotion and compensation | [Public files, quarantine and reference data](../backend/use-cases/uploads-and-reference-data.md) |
| Refresh queue | [Mobile navigation and session diagrams](../frontend-mobile/diagrams/navigation-and-session.md) |
| Comparison | [Product sequences and states mobile](../frontend-mobile/diagrams/product-processes.md) |
| Contact state machine | [Public navigation and recovery](../frontend-mobile/diagrams/public-information.md) |
| Contract review | [Public navigation and recovery](../frontend-mobile/diagrams/public-information.md) |
| Recovery states | [Mobile-only scanning diagrams](../frontend-mobile/diagrams/wine-label-scan.md) |
| Comparison | [Product sequences and states web](../frontend-web/diagrams/product-processes.md) |
| Contact state machine | [Public navigation and recovery](../frontend-web/diagrams/public-information.md) |
| External-map preference | [Public navigation and recovery](../frontend-web/diagrams/public-information.md) |
| Contract review | [Public navigation and recovery](../frontend-web/diagrams/public-information.md) |
| States and timing | [AI profiles and comparisons · Architecture](../modules/ai/architecture.md) |
| API | [Community · Architecture](../modules/community/architecture.md) |
| Review and comment publication | [Community · Architecture](../modules/community/architecture.md) |
| Report states | [Community](../modules/community/README.md) |
| Event states | [Events and tickets](../modules/events/README.md) |
| Registration states | [Events and tickets](../modules/events/README.md) |
| Acceptance status of an account | [Legal](../modules/legal/README.md) |
| Transitions | [Social media marketing · Architecture](../modules/marketing/architecture.md) |
| Checkout attempt states | [Payments](../modules/payments/README.md) |
| Refund states | [Payments](../modules/payments/README.md) |
| Mercado Pago payment status | [Payments](../modules/payments/README.md) |
| Likes | [Reviews · Architecture](../modules/reviews/architecture.md) |
| Publication states | [Reviews](../modules/reviews/README.md) |
| Account states | [Users and account](../modules/users/README.md) |
| Route states | [Wine routes](../modules/wine-routes/README.md) |
| States of a proposed wine | [Wines](../modules/wines/README.md) |
| States and transitions | [Wines · Proposed wines: submission, moderation and publishing](../modules/wines/submissions.md) |

## Classes

| Diagram | Page |
|---|---|
| Foundations, catalog, and community | [UML domain model](../backend/diagrams/domain-class-model.md) |
| Identity and events | [UML domain model](../backend/diagrams/domain-class-model.md) |
| Routes, submissions, and AI | [UML domain model](../backend/diagrams/domain-class-model.md) |
| Application collaboration: scanning | [UML domain model](../backend/diagrams/domain-class-model.md) |
| Payments | [UML domain model](../backend/diagrams/domain-class-model.md) |
| Community, legal, notifications, and support | [UML domain model](../backend/diagrams/domain-class-model.md) |
| Engagement and activity | [UML domain model](../backend/diagrams/domain-class-model.md) |

## Packages

| Diagram | Page |
|---|---|
| Package diagram | [Backend module boundaries and dependencies](../backend/architecture/module-boundaries.md) |

## Timeline

| Diagram | Page |
|---|---|
| Timeline | [Timeline](../gantt/README.md) |
| Technical roadmap | [Timeline](../gantt/README.md) |
| Business roadmap | [Timeline](../gantt/README.md) |

## Lucidchart

| Document | Content |
|---|---|
| [Component diagram](https://lucid.app/lucidchart/9f11a16b-bb5a-42fc-a9e8-0852b17bd241/edit) | One component diagram per web use case |
| [Component diagram - APK](https://lucid.app/lucidchart/e095dd25-e8ac-41ba-bf5b-396e1055f217/edit) | One component diagram per app use case |
| [Use case](https://lucid.app/lucidchart/7372c326-581e-4f33-bf02-9d7d75254b89/edit) | Use case diagram |

Each use case links its component diagram with the earlier Lucidchart ID (`WEB UC-…`, `APK UC-…`). Sequence diagrams are the Mermaid ones on each use case page, listed above.
