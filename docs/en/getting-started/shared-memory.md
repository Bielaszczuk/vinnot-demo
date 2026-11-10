# Shared memory across models

Vinnot uses [Engram](https://github.com/Gentleman-Programming/engram) for local persistent memory. The canonical project is `vinnot`, configured in `.engram/config.json`. Current code remains the source of truth.

## Local setup

```bash
brew install gentleman-programming/tap/engram
engram setup codex
```

Restart Codex after configuring MCP and the plugin. Other agents use their matching setup, such as `engram setup claude-code` or `engram setup gemini-cli`. A generic MCP client runs executable `engram` with arguments `mcp`, `--project`, `vinnot`. Clients must use the same user/data directory to share `~/.engram/engram.db`. On another machine, import an export; MCP does not automatically replicate memory across computers.

## Working protocol

At startup confirm the project with `mem_current_project`, recover `mem_context`, and search previous knowledge with `mem_search`. Retrieve full observations before relying on them. Save durable decisions, fixes, findings and constraints with source paths and stable `topic_key` values. Finish with `mem_session_summary`, including checks actually run and pending work. Follow the session binding confirmed by the Codex plugin; never invent a session ID.

The initial load contains architecture instructions, a repository map, development commands, the working tree path list and a per-document index with excerpts from `docs/es`, `README.md`, and Markdown planning notes. It is not a full document or conversation-history copy. Documentation references do not certify behavior; planning is historical. Read original files and verify current implementation. `docs/en` contains the corresponding English documents.

## Queries and portability

```bash
engram context --project vinnot
engram search 'arquitectura' --project vinnot
engram stats --project vinnot
engram export /private/path/vinnot-memory.json --project vinnot
# On another machine after installing Engram:
engram import /private/path/vinnot-memory.json
```

Exports may contain internal notes and planning. Keep them private. Do not store secrets, credentials, personal data, dumps or raw transcripts. CLI bootstrap is a manual load and does not replace plugin session attribution. New decisions and summaries require the agent to follow this protocol; memory does not update automatically when code changes.
