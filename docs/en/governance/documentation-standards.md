# Technical documentation standard

## Principles

1. Current code is the source of truth.
2. Behavioral claims reference a layer, contract or file.
3. `docs/es` and `docs/en` preserve equivalent paths.
4. Canonical documents use objective, system-oriented technical language.
5. Execution evidence is retained as separate reproducible artifacts.
6. Incidents, defects, technical debt and improvement plans are recorded in the
   local Git-ignored planning file, not canonical documentation.

## Expected depth

Architecture documents cover purpose, boundaries, dependencies, composition,
decisions, failures, security, performance, tests, evolution and evidence. Use
cases cover actors, preconditions, happy path, alternatives, states, invariants,
transaction, authorization, observability and tests. Runbooks include trigger,
diagnosis, mitigation, restore, verification and escalation.

## Diagrams

Use the smallest diagram that removes ambiguity:

- flowchart for composition/decision;
- sequence for temporal interaction;
- stateDiagram for lifecycle;
- ER for data;
- deployment/context for infrastructure.

Text explains invariants not represented visually. Diagrams never invent absent
components or embed one-off run results. Each Mermaid block carries the link to
its full-size image right below it; see
[Documentation site](documentation-site.md#full-size-diagrams).

## Update cycle

When code changes:

1. identify affected contracts/routes/states;
2. update ES and EN in the same change;
3. link every new page from its section index (each section is linked from the
   root index) and update traceability for new modules;
4. run `python3 scripts/validate_documentation.py`;
5. inspect links, Mermaid and path references, and build the
   [documentation site](documentation-site.md) with
   `npm --prefix docs-site run build`;
6. record any unresolved mismatch in local planning; versioned documentation
   retains supported contracts only.

## Location

The book goes from the general to the technical. At the root: `README.md`
presents Vinnot; `manuals` and `videos` show how it is used; `modules` documents
each product module (use cases, requirements, architecture and tests);
`architecture` gives the system view and the `technologies` catalog; `backend`,
`frontend-web`, `frontend-mobile`, `infra` and `shared` hold the technical detail
of each platform; `getting-started` covers local development; `diagrams` is the
diagram catalog (each diagram lives in the page that explains it);
`important-urls`, `gantt` and `governance` close the book.

Inside an area, `architecture` explains structure/policy; `use-cases` behavior;
`data` model/queries; `diagrams` visual views; `testing` strategy; `guides`
development and deployment procedures; `operations` runbooks; `design` visual
system.

Canonical documents are centralized under `docs/`, except for files that
must remain in locations recognized by their consumers: the root `README.md` as
the repository entry point, the root `AGENTS.md` as the instructions coding
agents discover, and `.github/pull_request_template.md` as the template GitHub
discovers automatically. The documentation validator
(`scripts/validate_documentation.py`) explicitly allows these exceptions.

## Evidence and language

Avoid claims such as “perfect” or “100% safe” without a reproducible gate.
Distinguish implemented, verified, accepted, pending and out of scope. Examples
contain no secrets or PII. English and Spanish convey equivalent semantics even
when not translated line by line.

## Taxonomy and certainty level

Every normative or descriptive claim belongs to a verifiable category:

| Form | Required use |
|---|---|
| **implements / executes / returns** | existing behavior verified in code |
| **must** | invariant enforced by code, constraint, test, or current architectural decision; evidence is cited |
| **may / can** | supported branch; the same sentence names the exact enabling condition |
| **verified** | a named reproducible gate exists; this does not automatically mean production-ready |

An unimplemented capability, pending correction, or evolution proposal does not
belong in this corpus. It remains in the local Git-ignored planning file until
implemented code makes it a supported contract.

Scoped exception: the [business model](../business/README.md),
[quality](../quality/README.md) and [security](../security/README.md) chapters
also document business decisions, plans, proposed targets, estimates and known
limitations. Each such statement carries an explicit status (**implemented**,
**planned**, **proposed target**, **estimate** or **pending**) and the date it
was gathered, and is never presented as behavior of the code.

The [timeline](../gantt/README.md) chapter applies the same exception to the
approved roadmap: Gantt diagrams of planned work and its critical path. It
follows these rules:

- it includes only work approved by the product owner; ideas, drafts and
  discarded alternatives stay in the local planning file;
- each diagram states its horizon and the date the plan was approved;
- a finished task carries the `done` tag and verifiable evidence (a merged pull
  request or a release); a task without that tag is **planned** work;
- critical-path tasks carry the `crit` tag, and the page lists that sequence
  with its dependencies and the zero-day slack that defines it;
- a change of scope or dates updates the diagram and its revision date in the
  same change, in Spanish and English.

Phrases such as “under the current policy,” “when applicable,” “handled
appropriately,” or “respects relationships” are prohibited unless the same
statement identifies the exact condition, owner, and mechanism. Authorization
documentation names the permission, identity source, and ownership check.
Persistence documentation names the handler, port, adapter, transaction, and
foreign-key effect. Failure documentation names the condition, code/status, and
recovery owner.

The canonical backend classification is: **modular monolith** for deployment
topology, **Hexagonal Architecture** for dependency direction inside modules,
and **logical CQRS** for command/query separation over one PostgreSQL database.
None replaces another or implies microservices, event sourcing, or two
datastores.
