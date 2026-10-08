# Themes

Dupli ships with six color themes. They style the prompt, status lines,
streamed thinking output, and errors.

| Theme | Vibe |
| --- | --- |
| `dupli` | The default violet |
| `nord` | Cool blues and frost |
| `dracula` | Purple and pink, loudly |
| `solarized` | Classic teal and ochre |
| `everforest` | Soft greens |
| `mono` | No color beyond weight |

## Switching

Live, for the current session:

```text
» /theme dracula
```

Or persist it in a config file:

```json
{ "theme": "nord" }
```

Or one-off from the shell:

```sh
dupli --theme everforest
```

If a theme name isn't recognized, Dupli lists the valid ones and falls
back to the default.
