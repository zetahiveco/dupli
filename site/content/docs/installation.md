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

## Updating

Dupli checks GitHub releases in the background every time it starts. If a
newer version exists, the matching prebuilt tarball is downloaded and
installed over the current binary automatically — you'll see a note, and
the new version is used the next time you start `dupli`. The check is
silent offline and never blocks startup.

To control it:

```sh
dupli --update          # check and install right now
```

```json
{ "autoUpdate": false }   // or set DUPLI_NO_UPDATE_CHECK=1 to disable
```

The update only self-installs from an installed binary (e.g.
`~/.local/bin/dupli`); dev checkouts built with cargo don't self-replace.

## Platforms

Prebuilt binaries: macOS (Apple silicon and Intel). Windows and Linux work
from source — the shell tool relies on `sh`, so run it inside WSL or with
`--sandbox`.
