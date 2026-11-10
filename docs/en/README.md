# Vinnot

Vinnot is a platform to discover and manage wines. It brings together the wine
catalog, wineries, wine routes and events, with a community that reviews and
shares, tools for event organizers and a panel for the team that looks after the
content.

It runs on the web, at [vinnot.com](https://vinnot.com), and as a mobile app
that can also scan a wine label to find the wine in the catalog.

## What you can do

| Area | What it offers |
|---|---|
| Wines | Search and filter by type, region, country, winery, grape and rating; see each wine's detail |
| Label scanning | From the app, photograph a label and find the wine in the catalog, or submit it if it is missing |
| Wineries and regions | Explore wineries with their location, contacts and wines, and wine regions |
| Reviews and community | Review wines, comment, like, report content and block accounts |
| Cellar | Keep your own wines with personal notes and ratings |
| Wine routes | Follow routes and their stops on the map |
| Events and tickets | Discover events, register, pay with Mercado Pago and keep the ticket on your phone |
| AI profiles | Read wine profiles and comparisons generated with artificial intelligence |
| Notifications | Receive push and email notices, and choose which ones |
| Sharing | Share wines, events and routes with a link that opens the web or the app |

## Who uses it

| Role | What they can do |
|---|---|
| Visitor | Sign up or sign in, read the public pages (help, contact, terms and policies), send support requests and open the preview of a shared link |
| User | Browse the catalog, wineries, routes and events; review, comment, build a cellar, register for events, scan labels and submit wines |
| Partner | Also: publish and manage their own events, registrations and Mercado Pago payments |
| Moderator | Review reviews, comments, reports and submitted wines, and maintain the catalog |
| Administrator | All of the above, plus user and role management, announcements and permanent deletions |

Roles come from
[`Role.java`](../../backend/src/main/java/com/vinnot/user/domain/valueobject/Role.java)
and each role's permissions from
[`SecurityConfig.java`](../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java)
and the controllers of each module.

## How it is built

| Part | Technology |
|---|---|
| Web | React, Vite and TypeScript |
| Mobile app | Expo and React Native |
| API | Spring Boot: a modular monolith with hexagonal architecture and logical CQRS |
| Data | PostgreSQL |
| Infrastructure | AWS for the API, the database and the web (S3 + CloudFront); Cloudflare for DNS, images (R2) and this documentation |

## How to read this documentation

The book goes from the general to the technical:

1. [Project](project/README.md): objectives, scope, deliverables, access and
   repository organization.
2. [Presentation](presentation/README.mdx): the oral presentation of the project as
   animated slides, with the rubric and a link to each topic.
3. [Manuals](manuals/README.md): how to use Vinnot, by role and platform.
4. [Videos](videos/README.md): demos and walkthroughs.
5. [Modules](modules/README.md): each part of the product with its use cases,
   requirements, architecture and tests.
6. [Business model](business/README.md): value proposition, competitors, SWOT,
   monetization, costs and projections at scale.
7. [System architecture](architecture/README.md): how the parts connect and which
   [technologies](architecture/technologies/README.md) are used.
8. Technical detail per platform: [Backend](backend/README.md),
   [Web](frontend-web/README.md), [Mobile app](frontend-mobile/README.md),
   [Infrastructure](infra/README.md) and [Shared design](shared/README.md).
9. [Security](security/README.md): how accounts, data and the platform are protected.
10. [Software quality](quality/README.md): quality model, non-functional
   requirements, metrics and test plan.
11. [Getting started](getting-started/README.md): how to run the project locally.
12. [Diagrams](diagrams/README.md): catalog of every diagram and where it lives.
13. [Important URLs](important-urls/README.md) and [Schedule](gantt/README.md).
14. [Governance](governance/README.md): how work happens in the repository.

[Leer en español](../es/README.md)
