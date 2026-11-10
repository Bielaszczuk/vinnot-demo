You are working on the Vinnot project.

Core project context:
- Vinnot is a wine discovery and management platform.
- The product includes a backend API, a React web frontend, a React Native / Expo mobile frontend, infrastructure configuration, import scripts, and living documentation.
- Main product areas may evolve, but the current domain includes wines, wineries, reviews, cellar, wine routes, events, event payments and tickets (Mercado Pago), public sharing, community, legal acceptance, support, users/auth, admin, partner flows, AI wine profiles/comparisons, and mobile label scanning.
- Do not assume the module list, docs list, or file names are fixed forever. Always inspect the current repository structure before making claims or changes.

Primary working rule:
- The current code is the source of truth.
- Documentation is useful but must be verified against the implementation.
- If documentation and code disagree, identify the mismatch clearly and update the relevant docs or code depending on what is actually wrong.
- Prefer architecture-preserving, behavior-preserving changes unless the user explicitly asks for behavior changes.

Communication style:
- Be direct, pragmatic, and technically precise.
- Do not overstate completion.
- Distinguish clearly between:
  - real bugs,
  - architecture violations,
  - acceptable pragmatic debt,
  - documentation drift,
  - future improvements.
- When auditing, provide concrete evidence: files, imports, dependency direction, validation commands, and observed flows.

Architecture principles:
- Respect Clean Architecture / Hexagonal Architecture / Ports and Adapters.
- Keep business/domain logic independent from frameworks, transport, persistence, routing, and UI.
- Keep adapters at the edges: HTTP controllers, API clients, persistence adapters, storage adapters, AI providers, maps providers, and platform APIs.
- Keep orchestration in application/use-case layers.
- Keep UI focused on rendering, user events, local presentation state, and calling presentation hooks/facades.
- Avoid moving infrastructure concerns inward.
- Avoid direct calls from UI/screens/pages to HTTP clients or raw infrastructure.
- Avoid direct dependencies from domain to application, infrastructure, presentation, React, Expo, Spring, JPA, or HTTP request/response types.

Backend architecture expectations:
- Backend should follow a modular hexagonal/CQRS style.
- Typical backend dependency flow:

  `Web Controller -> Input Port / Use Case -> Command or Query Handler -> Domain -> Output Port -> Infrastructure Adapter -> Persistence / External Service`

- HTTP request objects belong to the web adapter layer.
- Commands and queries should represent application intent, not HTTP transport details.
- Persistence entities, JPA repositories, native SQL, external AI clients, file storage, maps clients, security filters, and web controllers belong in infrastructure.
- Domain models and value objects should contain invariants and business rules without framework dependencies.
- Application handlers may pragmatically use framework annotations if that is the local convention, but do not introduce unnecessary deeper coupling.

Frontend architecture expectations:
- Web and mobile should follow layered frontend architecture.
- Typical frontend dependency flow:

  `Screen/Page -> Presentation Hook/ViewModel -> Application Service/Use Case -> Infrastructure API Client -> HTTP Transport -> Backend`

- Frontend domain should contain pure types, mappers, validators, and domain-facing models.
- Application services should orchestrate API calls, map DTOs to domain models, normalize pagination, and expose use-case-oriented methods.
- Infrastructure clients should only know endpoint paths, request params, DTOs, transport details, and raw backend contracts.
- Presentation hooks should connect UI to application services and state/cache mechanisms.
- Pages/screens/components should not call Axios/fetch/API clients directly.
- Shared UI components should stay reusable and not own business workflows.

React web architecture expectations:
- Use React pages/components for rendering and user interaction.
- Use presentation hooks and view-model hooks to keep pages thin.
- Use TanStack Query or the existing query mechanism for server state if present.
- Use the existing client-state solution from the codebase; do not introduce a new state library without a strong reason.
- Keep API DTOs out of presentation unless there is a deliberate, documented exception.
- Keep domain mappers and validators framework-agnostic.

React Native / Expo mobile architecture expectations:
- Expo Router `app/` should remain a routing/screen shell.
- Route groups such as `(app)`, `(auth)`, or `(tabs)` are valid Expo Router grouping folders and do not appear in the URL.
- Do not put tests, style-only helpers, non-screen helpers, or implementation-only files inside `app/` if Expo Router would treat them as routes.
- Screens should delegate behavior to presentation hooks/facades.
- Mobile infrastructure should isolate Axios, SecureStore, AsyncStorage, device APIs, camera, maps, and platform-specific behavior.
- Auth/token injection should avoid circular dependencies, usually by configuring HTTP auth handlers from a provider/composition layer.

End-to-end flow example: searching wines
- Web/mobile UI starts in a route page or screen such as a wine search/browse screen.
- The page/screen reads user input, route params, filters, pagination, and calls a presentation hook.
- The presentation hook handles cache/query state and delegates to an application service.
- The application service converts UI/domain filters into API params and calls an infrastructure API client.
- The infrastructure client calls the HTTP transport with endpoint and DTO contract.
- The backend controller receives `GET /wines` or the current equivalent route.
- The controller maps request params to a query object and calls an input port/use case.
- The query handler validates paging/filter rules and calls output ports.
- Persistence adapters translate the port call into JPA/native SQL/search queries.
- Database results are mapped from persistence entities to domain models.
- The handler projects domain data into response DTOs/page results.
- The controller returns the response.
- Frontend infrastructure receives raw DTOs.
- Application service maps DTOs into frontend domain models.
- Query hook updates cache/loading/error state.
- UI renders results, empty state, pagination, and errors.

End-to-end flow example: generating an AI wine profile
- UI starts from a wine detail/admin/profile screen and triggers profile generation or retrieval.
- Presentation hook delegates to an application service.
- Application service calls the wine/AI API client.
- Backend AI/profile controller receives the request.
- Controller maps HTTP input to command/query/use-case input.
- Application service/use case loads the wine through a repository/output port.
- It checks cached AI profile data through an output port.
- If cache exists, it returns the cached profile.
- If cache does not exist, it calls an AI provider port/adapter, such as OpenAI or a mock provider.
- AI response is parsed and normalized.
- Optional enrichment updates missing wine fields through domain/application rules.
- Profile and enrichment results are persisted through output ports/adapters.
- Backend returns an AI profile response DTO.
- Frontend maps the DTO into a frontend domain model before rendering.

## Shared memory: Engram

- Use the canonical project `vinnot`, configured in `.engram/config.json`.
- At session start confirm the current project, recover `mem_context` and search relevant prior decisions with `mem_search`. Read full observations before relying on previews.
- Current code is authoritative. Documentation snapshots and historical planning in memory must be rechecked against current files; never treat old validation as a current test result.
- Save durable decisions, fixes, discoveries and user constraints, with source paths and stable `topic_key` values. Update evolving topics instead of duplicating them.
- Before finishing, save a session summary covering goal, work, actual validation, pending work and relevant files.
- Keep credentials, tokens, personal data, database dumps and raw transcripts out of memory.
- With Codex plugin MCP writes, use only the runtime session ID confirmed by its hook. Never invent a session ID. If unavailable, follow the plugin recovery guidance; manual CLI bootstrap records are not agent-session attribution.
- Other local MCP clients use the same `engram mcp` executable and database; select project `vinnot`. See `docs/es/getting-started/shared-memory.md` (English mirror in `docs/en`).
