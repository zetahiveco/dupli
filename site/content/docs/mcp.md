# MCP

Dupli speaks the [Model Context Protocol](https://modelcontextprotocol.io)
over stdio. Configure servers once and their tools become available to the
model as regular actions — no extra flags needed at launch.

## Configuration

Add servers to any config file (global or per-folder):

```json
{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    },
    "files": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": { "SOME_VAR": "value" }
    }
  }
}
```

## What happens at startup

1. Dupli spawns each server process.
2. It performs the `initialize` handshake (protocol `2024-11-05`).
3. It calls `tools/list` and registers every tool.
4. The tools are listed in the system prompt, so the model can call:

```json
{"type": "mcp_tool", "server": "fetch", "tool": "fetch",
 "arguments": {"url": "https://example.com"}}
```

## Inspecting

```text
» /mcp
  fetch:
    fetch — Fetches a URL and returns its content
```

If a server fails to start, Dupli prints a warning and keeps going — a
broken MCP server never blocks your session.
