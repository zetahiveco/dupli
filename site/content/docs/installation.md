# Installation

## From source (the only way, for now)

```sh
git clone https://github.com/zetahiveco/dupli
cd dupli
cargo install --path .
```

This installs the `dupli` binary into `~/.cargo/bin`.

## Requirements

- Rust 1.75+ (2021 edition)
- An API key for at least one provider
- Optional: [Docker](https://docs.docker.com/get-docker/) for `--sandbox`
- Optional: language servers (e.g. `rust-analyzer`) for diagnostics

## Verify

```sh
dupli --version
dupli --help
```

## Platforms

macOS and Linux are supported. Windows works anywhere Rust works, but the
shell tool relies on `sh` — run it inside WSL or with `--sandbox`.
