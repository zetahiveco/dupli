# Sessions

Every conversation is persisted as JSON under your data directory
(`~/Library/Application Support/dupli/sessions` on macOS,
`~/.local/share/dupli/sessions` on Linux).

## Resuming

```sh
dupli -c                # continue the most recent session
dupli --session <id>    # resume a specific one
```

Or from inside Dupli:

```text
» /sessions
» /resume 18f2a1c9e4b-3f01
```

## What's saved

- All messages (yours, the model's, and action results)
- The provider and model used
- The session title (taken from your first prompt)

Rewinding with `/navigate` truncates the saved history too, so a resumed
session picks up exactly where you left off.

## Files

Sessions are plain JSON — you can open, diff, or copy them. The id is
timestamp-based so sessions sort naturally in `/sessions`.
