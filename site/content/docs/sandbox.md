# Sandbox

When Dupli runs shell commands on your host, it asks for approval first.
If you'd rather never run agent commands on your machine at all, start
with `--sandbox` and every shell command executes inside Docker instead.

```sh
dupli --sandbox
```

## How it works

Each command runs in a fresh container:

```sh
docker run --rm \
  --workdir /workspace \
  -v /abs/path/to/project:/workspace \
  ubuntu:24.04 \
  sh -c "cargo test"
```

- Your project is mounted read-write at `/workspace`.
- Each command gets a fresh container: no state leaks between commands.
- The image defaults to `ubuntu:24.04` and is configurable:

```json
{ "sandbox": true, "sandboxImage": "rust:1-bookworm" }
```

## Notes

- Dupli checks for `docker` on your `PATH` (plus Docker Desktop and Colima
  locations) and fails fast with a clear error if it can't find it.
- File tools (`read_file`, `write_file`, `list_dir`) still run natively —
  only shell commands are containerized.
- Pick a heavier base image if your project needs a toolchain:
  `node:22`, `golang:1.23`, `rust:1-bookworm`, etc.
