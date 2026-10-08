# LSP & Diagnostics

Unlike most minimal agents, Dupli ships its own lightweight LSP client.
It spawns language servers on demand and pipes their diagnostics straight
into your session — great for "fix the errors" style prompts.

## Configure a server

In `dupli.json` (global or per-folder), map a language id to a server:

```json
{
  "lspServers": {
    "rust": { "command": "rust-analyzer" },
    "typescript": { "command": "typescript-language-server", "args": ["--stdio"] }
  }
}
```

## Use it

From the prompt:

```text
» /diagnostics src/main.rs
Diagnostics from 'rust-analyzer' for src/main.rs:
  L42 [error] cannot borrow `x` as mutable twice at a time
```

Or ask the model — it can run the same machinery itself:

```json
{"type": "diagnostics", "path": "src/main.rs", "language": "rust"}
```

## How it works

1. The language server is started on first use (per language, per session).
2. Dupli performs the `initialize`/`initialized` handshake.
3. The file is opened via `textDocument/didOpen`.
4. `textDocument/publishDiagnostics` notifications are collected and
   formatted with line numbers and severities.

Only diagnostics are wired in today; hover and completions are natural
next steps. PRs welcome.
