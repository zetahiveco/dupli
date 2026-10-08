# Getting Started

Get Dupli running in your project in about two minutes.

## 1. Install

macOS / Linux:

```sh
curl -fsSL https://dupli-zetahive.vercel.app/install.sh | sh
```

Windows (PowerShell):

```powershell
powershell -c "irm https://dupli-zetahive.vercel.app/install.ps1 | iex"
```

Or build from source:

```sh
git clone https://github.com/zetahiveco/dupli
cd dupli
cargo install --path .
```

## 2. Add an API key

Dupli is bring-your-own-key. Export the key for the provider you want:

```sh
export ANTHROPIC_API_KEY="sk-..."
# or OPENAI_API_KEY, GEMINI_API_KEY, FIREWORKS_API_KEY
```

## 3. Run

From any project folder:

```sh
cd my-project
dupli
```

You'll pick a provider and model, then land at the `»` prompt. Say hello:

```text
» list the files in src and explain what this project does
```

## 4. Approve actions

Dupli asks before running any shell command:

```text
Allow command `cargo test`? [y/N]
```

File writes never need approval, and every write is reversible — see
[Undo / Redo](/docs/slash-commands#undo-redo).

## 5. Pick a theme

```text
» /theme dracula
```

## Tips

- Press **Tab** after typing `/` to autocomplete slash commands.
- `/exit` or **Ctrl+D** leaves the session; it's saved automatically.
- `dupli -c` resumes your most recent session next time.
