# Vinnot documentation

The documentation is maintained in two equivalent language trees. Choose a
language to start:

- [Español](es/README.md)
- [English](en/README.md)

## Organization rules

- `docs/es` and `docs/en` have the same relative Markdown paths.
- Every canonical document is linked directly from its language index.
- Product and architecture documents describe the current system and its
  versioned contracts.
- Reproducible commands and acceptance criteria belong in their relevant guide;
  ephemeral execution evidence is stored outside the canonical documentation.
- The implementation is the source of truth. Documentation changes that alter
  behavior claims must be checked against the code and tests.
- Diagrams use Mermaid and live with the architecture or use case they explain.

Local datasets under `docs/wines`, `docs/wineries` and `docs/dump*.sql` are
ignored development inputs. They are not part of the documentation catalog.
