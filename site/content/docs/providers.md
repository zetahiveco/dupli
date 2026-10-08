# Providers

Dupli talks to four providers out of the box, using your own API keys.
Model output streams token-by-token; reasoning/thinking streams are shown
in a dim style before the answer.

| Provider | `--provider` value | Environment variable |
| --- | --- | --- |
| Anthropic | `anthropic` (or `claude`) | `ANTHROPIC_API_KEY` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Google Gemini | `gemini` (or `google`) | `GEMINI_API_KEY` |
| Fireworks AI | `fireworks` | `FIREWORKS_API_KEY` |

## Choosing at launch

```sh
dupli --provider anthropic --model claude-sonnet-4-20250514
```

If you omit the flags, Dupli prompts for a provider and shows the default
model in gray — press Enter to accept it.

## Switching mid-session

```text
» /provider openai
» /model gpt-4.1
```

Dupli re-reads the provider's environment variable on the next request, so
switching providers on the fly just works as long as both keys are exported.

## Defaults

| Provider | Default model |
| --- | --- |
| Anthropic | `claude-sonnet-4-20250514` |
| OpenAI | `gpt-4.1` |
| Gemini | `gemini-2.5-flash` |
| Fireworks | `accounts/fireworks/models/glm-5p3-flash` |

You can pin the provider and model in
[config](/docs/configuration) so you never see the prompts.
