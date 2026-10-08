# Configuration

Dupli layers configuration, and the last layer always wins:

1. Built-in defaults
2. Global config — `~/.config/dupli/dupli.json`
3. Per-folder config — `./dupli.json` or `./.dupli/dupli.json`
4. CLI flags — `--provider`, `--model`, `--theme`, `--sandbox`, `--web-port`

This works like OpenCode's config: one global file for your preferences,
one file per project for anything project-specific.

## Example

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

## Fields

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `provider` | string | — | `anthropic`, `openai`, `gemini`, `fireworks` |
| `model` | string | provider default | Model ID passed to the API |
| `theme` | string | `dupli` | See [Themes](/docs/themes) |
| `sandbox` | bool | `false` | Run shell commands in Docker |
| `sandboxImage` | string | `ubuntu:24.04` | Image for the sandbox |
| `maxTurns` | number | `8` | Action rounds per prompt |
| `autoApprove` | bool | `false` | Reserve for non-interactive flows |
| `webPort` | number | `8620` | Port for `--web` |
| `mcpServers` | object | `{}` | See [MCP](/docs/mcp) |
| `lspServers` | object | `{}` | See [LSP](/docs/lsp) |

## Project vs global

The per-folder file is ideal for project-specific servers and models:

```json
{ "provider": "fireworks", "mcpServers": { "db": { "command": "pg-mcp" } } }
```

Keep the global file for personal defaults like your theme. Both files are
plain JSON; `mcpServers` and `lspServers` maps are merged across layers.
