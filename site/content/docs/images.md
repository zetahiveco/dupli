# Images

Dupli's TUI can attach images to your prompt, Claude Code style. The model
sees them on the next message — great for screenshots, mockups, and
"make it look like this" workflows.

## Attach

```text
» /image screenshot.png
Image attached (1 pending) — it will be sent with your next message.
» make the hero section match this screenshot
```

Tab completes image files in the current directory (`.png`, `.jpg`,
`.jpeg`, `.gif`, `.webp`).

URLs work too — Dupli fetches the image over HTTP(S):

```text
» /image https://example.com/mockup.png
```

Attach several images before sending (up to 5, 5 MB each), then send your
prompt as usual. Cleared after each message.

## Provider support

| Provider | Images |
| --- | --- |
| Anthropic | ✅ base64 image blocks |
| OpenAI | ✅ `image_url` data URLs |
| Gemini | ✅ `inline_data` parts |
| Fireworks | ❌ ignored with a warning |

## Notes

- Formats are detected by magic bytes (PNG, JPEG, GIF, WebP) — extensions
  are ignored.
- Images are stored in the session file (base64), so resumed sessions keep
  them; session files can get large if you attach a lot.
- Image input is TUI-only for now; the web UI's `/api/chat` takes text.
