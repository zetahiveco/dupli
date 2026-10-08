# Installation

## One-liner (recommended)

macOS / Linux:

```sh
curl -fsSL https://dupli.dev/install.sh | sh
```

Windows (PowerShell):

```powershell
powershell -c "irm https://dupli.dev/install.ps1 | iex"
```

The installer downloads a prebuilt binary from
[GitHub releases](https://github.com/zetahiveco/dupli/releases) into
`~/.local/bin` (override with `DUPLI_INSTALL_DIR`). If there's no prebuilt
binary for your platform, it falls back to building from source with cargo.

## With cargo

```sh
cargo install --locked --git https://github.com/zetahiveco/dupli dupli
```

## From source

```sh
git clone https://github.com/zetahiveco/dupli
cd dupli
cargo install --path .
```

## Requirements

- An API key for at least one provider
- Optional: [Docker](https://docs.docker.com/get-docker/) for `--sandbox`
- Optional: language servers (e.g. `rust-analyzer`) for diagnostics

## Verify

```sh
dupli --version
dupli --help
```

## Platforms

Prebuilt binaries: macOS (Apple silicon and Intel). Windows and Linux work
from source — the shell tool relies on `sh`, so run it inside WSL or with
`--sandbox`.
