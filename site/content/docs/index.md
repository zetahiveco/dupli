# Dupli Docs

Dupli is a minimal coding agent written in Rust. It runs in your project
folder, streams model output from your own API keys, and gives the model a
small, auditable toolbox: read files, write files, run shell commands, call
MCP tools, load skills, and ask language servers for diagnostics.

## Why Dupli?

Agent harnesses keep growing. Dupli takes the opposite path: a small core
you can read in an afternoon, with the features you actually need built in
and nothing else baked in.

- **Minimal by design** — one binary, no accounts, no telemetry.
- **Bring your own key** — Anthropic, OpenAI, Gemini, and Fireworks.
- **Extensible where it counts** — MCP servers, skills, themes, layered config.
- **Safety rails that make sense** — command approval, path confinement,
  Docker sandboxing, undo/redo for every write.

## Where to go next

- [Getting Started](/docs/getting-started) — install and run in two minutes.
- [Slash Commands](/docs/slash-commands) — everything you can type at the `»` prompt.
- [Configuration](/docs/configuration) — global and per-folder `dupli.json`.
- [MCP](/docs/mcp) — connect external tool servers.
- [Web UI](/docs/web) — the axum + leptos interface with `--web`.
