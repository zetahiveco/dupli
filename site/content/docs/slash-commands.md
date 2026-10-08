# Slash Commands

Slash commands control the harness; anything else you type goes to the
model. Type `/` and press **Tab** to see them all — arguments complete too
(providers, themes, session ids).

| Command | Arguments | Description |
| --- | --- | --- |
| `/help` | — | Show all slash commands |
| `/exit`, `/quit` | — | Leave Dupli (the session is saved) |
| `/provider` | `[name]` | Switch or show the active provider |
| `/model` | `[model]` | Switch or show the active model |
| `/diff` | — | View file changes made this session |
| `/undo` | — | Revert the last file write |
| `/redo` | — | Re-apply an undone write |
| `/navigate` | `[turn]` | Rewind the conversation to a turn |
| `/sessions` | — | List saved sessions |
| `/resume` | `[id]` | Resume a saved session |
| `/theme` | `[name]` | Switch the color theme |
| `/skills` | — | List available skills |
| `/mcp` | — | List connected MCP servers and tools |
| `/sandbox` | `[on\|off]` | Toggle the Docker sandbox |
| `/diagnostics` | `[path]` | LSP diagnostics for a file |
| `/image` | `<path\|url>` | Attach an image to your next message |

## Navigate

`/navigate` with no arguments lists your prompts in order. With a number it
rewinds the conversation to just before that turn, dropping everything
after it — a lightweight version of a session tree.

```text
» /navigate 3
Rewound to turn 3. The messages after it were dropped; continue with a new prompt.
```

## Diff, Undo, Redo

Every `write_file` action is recorded:

- `/diff` prints a unified diff of all touched files against their
  pre-session state.
- `/undo` steps back one write (removing files the agent created).
- `/redo` steps forward again.
