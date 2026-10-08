# Dupli

**A minimal, hackable coding agent — written in Rust.**

Dupli runs in your project folder, streams from your own API keys, and
stays out of your way. No accounts, no telemetry, no permission theater —
just a fast Rust core you can read in an afternoon and bend to your
workflow.

Inspired by the minimalism of [Pi](https://pi.dev) with the practical
conveniences of [OpenCode](https://opencode.ai).

```text
» refactor the auth module and run the tests
⏺ Streams the plan, edits files, runs commands (dockerized with --sandbox)
```

---

## Features

- **Minimal core, powerful defaults** — one binary, four providers, and a
  small auditable toolbox: read files, list directories, write files, run
  shell commands.
- **MCP** — connect any [Model Context Protocol](https://modelcontextprotocol.io)
  server over stdio via config; its tools become available to the model
  automatically.
- **Docker sandbox** — start with `--sandbox` and every shell command runs
  inside a fresh container with your project mounted at `/workspace`.
- **Sessions** — every conversation is saved as plain JSON. Resume with
  `-c` / `--session`, browse with `/sessions`, rewind with `/navigate`.
- **Themes** — six built-in color themes (`dupli`, `nord`, `dracula`,
  `solarized`, `everforest`, `mono`), switchable live with `/theme`.
- **Skills** — drop a `SKILL.md` into `.dupli/skills/` and the agent loads
  your playbook on demand (progressive disclosure, no prompt bloat).
- **Own LSP client** — point `lspServers` at rust-analyzer or friends and
  get real diagnostics into your session (`/diagnostics`).
- **Undo / redo / diff** — every file write is recorded: `/undo`, `/redo`,
  and `/diff` show a unified diff against the session's starting state.
- **Slash commands with autocomplete** — `/provider`, `/exit`, `/navigate`,
  `/diff`, and more. Press Tab after `/`.
- **Web UI** — `dupli --web` serves an axum + leptos (SSR) interface with
  token streaming and a session browser.
- **Layered config** — global `~/.config/dupli/dupli.json`, per-folder
  `dupli.json` (or `.dupli/dupli.json`), CLI flags. Last one wins.

## Providers

| Provider | Flag value | Environment variable |
| --- | --- | --- |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Google Gemini | `gemini` | `GEMINI_API_KEY` |
| Fireworks AI | `fireworks` | `FIREWORKS_API_KEY` |

## Getting started

Requires Rust. 

```sh
git clone https://github.com/zetahiveco/dupli
cd dupli
cargo install --path .

export ANTHROPIC_API_KEY="sk-..."
cd your-project
dupli
```

Full walkthrough in the [Getting Started guide](site/content/docs/getting-started.md).

## CLI usage

```text
dupli [OPTIONS] [PROMPT]

  -p, --provider <NAME>    anthropic | openai | gemini | fireworks
  -m, --model <MODEL>      model ID for the provider
  -t, --theme <NAME>       color theme
      --sandbox            run shell commands in a Docker sandbox
      --web                start the web UI instead of the TUI
      --web-port <PORT>    port for the web UI (default: 8620)
  -c, --continue           resume the most recent session
  -s, --session <ID>       resume a specific session
      --print <PROMPT>     run one prompt and exit
```

## Slash commands

Type `/` and press **Tab** to autocomplete.

| Command | Arguments | Description |
| --- | --- | --- |
| `/help` | | Show all commands |
| `/exit`, `/quit` | | Leave Dupli (session is saved) |
| `/provider` | `[name]` | Switch or show the provider |
| `/model` | `[model]` | Switch or show the model |
| `/diff` | | Unified diff of session file changes |
| `/undo` | | Revert the last file write |
| `/redo` | | Re-apply an undone write |
| `/navigate` | `[turn]` | Rewind the conversation |
| `/sessions` | | List saved sessions |
| `/resume` | `[id]` | Resume a session |
| `/theme` | `[name]` | Switch color theme |
| `/skills` | | List skills |
| `/mcp` | | List MCP servers and tools |
| `/sandbox` | `[on\|off]` | Toggle the Docker sandbox |
| `/diagnostics` | `[path]` | LSP diagnostics for a file |

## Configuration

Config layers in this order (later wins): defaults → global → project → CLI.

```sh
~/.config/dupli/dupli.json   # global
./dupli.json                 # per-folder (or .dupli/dupli.json)
```

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "theme": "dracula",
  "sandbox": false,
  "sandboxImage": "ubuntu:24.04",
  "maxTurns": 8,
  "autoApprove": false,
  "webPort": 8620,
  "mcpServers": {
    "fetch": { "command": "uvx", "args": ["mcp-server-fetch"] }
  },
  "lspServers": {
    "rust": { "command": "rust-analyzer" }
  }
}
```

## Web UI

```sh
dupli --web
# Dupli web UI: http://127.0.0.1:8620
```

The same agent core powers both interfaces: leptos-rendered app shell,
token streaming over SSE, session sidebar, action feed. The server binds
to `127.0.0.1` only and doesn't authenticate — keep it local.

## Project layout

```text
├── src/
│   ├── cli.rs          REPL, slash dispatch, startup flow
│   ├── config.rs       providers, layered config, CLI flags
│   ├── agent.rs        the agent loop (stream → act → feed results)
│   ├── protocol.rs     message formats and the system prompt
│   ├── providers/      streamed API clients (Anthropic/OpenAI/Gemini/Fireworks)
│   ├── tools.rs        read/list/write/run with path confinement
│   ├── mcp.rs          MCP client (stdio, JSON-RPC 2.0)
│   ├── lsp.rs          LSP client (diagnostics collection)
│   ├── sandbox.rs      Docker sandbox execution
│   ├── session.rs      session persistence
│   ├── history.rs      undo/redo/unified diff tracking
│   ├── skills.rs       SKILL.md discovery and loading
│   ├── themes.rs       color themes
│   ├── slash.rs        slash commands + rustyline completer
│   ├── report.rs       output sinks (terminal / web)
│   └── web/            axum server + leptos SSR UI
├── site/               Rust-based static site generator (docs + landing)
│   ├── content/docs/   markdown documentation
│   ├── src/main.rs     the SSG
│   └── dist/           generated output
└── Cargo.toml
```

## The website

The marketing site and docs are generated by a small Rust SSG that lives
in `site/`:

```sh
cargo run -p dupli-site     # writes site/dist
```

Markdown source is in `site/content/docs/`. Add a `.md` file, register it
in `site/src/main.rs`, rebuild.

## Development

```sh
cargo build              # the agent
cargo test               # unit tests
cargo run -p dupli-site  # regenerate the website
cargo run -- --sandbox   # try it with commands containerized
```

## Security notes

- File tools refuse paths outside the project, symlinks, and parent traversal.
- Shell commands require approval on the host, or run in Docker with `--sandbox`.
- API keys are read from environment variables only; they are never written
  to config or session files.

## License

MIT
