# Web UI

Dupli ships a web interface served by [axum](https://github.com/tokio-rs/axum).
The UI itself is a [leptos](https://leptos.dev) app (`web-client/`) compiled
to WebAssembly — there is no handwritten JavaScript anywhere in the repo.
It's the same agent core as the TUI — sessions, tools, approval rules and all.

## Run

```sh
dupli --web
# Dupli web UI: http://127.0.0.1:8620
```

Pick a port with `--web-port 9000` or in config:

```json
{ "webPort": 9000 }
```

## What you get

- **Chat** with token-streaming over Server-Sent Events
- **Session browser** in the sidebar — click any session to replay it
- **Action feed** — file writes and command results appear as status lines
- Dark, minimal, keyboard-first styling

## Endpoints

The UI is a thin layer over a small API, in case you want to script it:

| Route | Method | Description |
| --- | --- | --- |
| `/` | GET | HTML loader that boots the leptos WASM app |
| `/api/chat` | POST | Send `{ "message": "..." }`, receive an SSE stream |
| `/api/sessions` | GET | List saved sessions |
| `/api/session/:id` | GET | One session's full message history |

## Security

The server binds to `127.0.0.1` only. It doesn't authenticate — don't
expose it to the network without putting something in front of it.

## Hacking on the UI

The frontend lives in `web-client/` (leptos, client-side rendered). After
changing it, rebuild the WebAssembly assets the server embeds:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli
./scripts/build-web.sh
```

This regenerates `src/web/assets/pkg/`, which `cargo build` bakes into
the `dupli` binary.
