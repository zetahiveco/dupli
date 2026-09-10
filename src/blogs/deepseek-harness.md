---
image: "blog_bg.jpg"
title: "DeepSeek Harness: Everything Is a Plugin"
subtitle: "DeepSeek open-sourced the other half of the agent stack. Here is what dsh actually is, why the Cordis architecture matters, and how to run it on a cloud machine."
date: "2026-09-05"
author: "Harish Deivanayagam"
timeToRead: "9 min read"
slug: "deepseek-harness"
---

On 13 August 2026, DeepSeek released [**DeepSeek Harness**](https://github.com/deepseek-ai/deepseek-harness) — CLI name `dsh` — as a v0.1 developer preview under the MIT license. It is not a model. It is the runtime layer that wraps a model so it can act: the tools, sessions, sandboxes, storage, scheduling, orchestration and agent loop.

Which is the point. The equation the release makes explicit is:

> **agent = model + harness**

Everyone had been shipping the left half publicly and keeping the right half proprietary. DeepSeek open-sourced the right half.

## What a harness actually is

If you have only used coding agents as products, the harness is invisible, so it is worth naming what it does. Between your instruction and a merged diff, something has to:

- decide which tools the model can call, and describe them to it
- execute those calls — read a file, apply a patch, run a shell command, search the web
- feed results back and decide whether to loop again or stop
- manage the session: history, compaction, resume, interruption
- enforce a permission policy on anything destructive
- hold state across steps: plans, goals, subagent results

That is the harness. It is most of the engineering in a coding agent, and it is why two products on the same model produce very different results.

## The organising idea: everything is a plugin

DeepSeek Harness is built on [Cordis](https://github.com/cordiverse/cordis), a plugin meta-framework whose design is written up in [*A Programming Paradigm for Spatiotemporal Composability*](https://arxiv.org/abs/2608.25512). The tagline is literal: **models, tools, skills, sessions, sandboxes, filesystems, storage, loops, scheduling, orchestration and the UI are all plugins.**

Cordis provides the services-and-events layer that lets those plugins find and cooperate with each other, with real dependency handling between them. You select, swap or extend any capability through configuration — a `cordis.yml` that registers plugins, including local TypeScript files exporting an `apply` function — **without patching harness source**.

Compare that to how you customise most agent CLIs today: a config file with the options the vendor anticipated, and a fork if you need anything else. Here, the agent loop itself is a component you can replace.

### Four shipped modes

The modes are the clearest demonstration that the architecture is real, because each one is just a different plugin composition:

| Mode | What it is | Use it for |
|---|---|---|
| **Standard** | The full coding agent: file editing, shell, file and web search, skills, planning, goals, subagents, workflows | Day-to-day agentic coding |
| **Code** | Everything in Standard, but tools are exposed through a Code Mode SDK so the model writes one TypeScript program instead of many dupli tool calls | Multi-step operations where round-trip overhead dominates |
| **Minimal** | A shell tool and a file editor, nothing else | Benchmarking models in a bare environment |
| **Creator** | Inspect the live runtime, test Cordis plugins in memory, compose them into new modes | Building your own harness |

Code mode deserves a note. Instead of the model making twenty sequential tool calls and paying latency and token cost on each, it emits a single program that orchestrates the operations. On mechanical work — a codemod across ninety files, say — that is a materially different cost curve.

Minimal mode is the honest one. Strip the harness to a shell and an editor and you can measure what the *model* contributes versus what the scaffolding contributes. Very few vendors give you a switch that makes their own product look worse for the sake of a clean measurement.

## Running it

The quick start is one command. You need Node.js `^22.19.0` or `>=24.0.0`:

```sh
npx @deepseek-ai/dsh web
```

That starts the Web UI at `http://127.0.0.1:3080` and opens a browser. Pass `--no-open` to skip that; over SSH it prints the host URL instead, since the SSH client owns the forwarded address.

From a checkout:

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

For pipelines, drive `dsh` headless — no browser required. That headless path is the one that matters for anything resembling a [software factory](/blog/software-factory).

The harness is free: MIT licensed, commercial use and modification allowed. You still pay for whatever model you plug into it.

## Why this is a bigger deal than another CLI

**It decouples harness quality from model choice.** Today, picking a coding agent means accepting one vendor's judgement about tool design, context compaction and loop control alongside their model. Making the harness open and composable lets those decisions come apart.

**It makes agent evaluation honest.** Comparing "Claude Code vs Codex" conflates model and scaffolding. A shared minimal harness gives you a controlled variable, and Minimal mode exists specifically for that.

**Context engineering becomes yours.** Compaction strategy, what goes in the system prompt, how tool results are summarised — these drive both cost and quality more than most people realise, and they have been locked inside vendor products. Now they are plugins.

**Self-hosting becomes viable.** If you cannot send code to a third-party agent product, an MIT-licensed harness plus a model endpoint you control is a complete stack.

## The honest caveats

- **It is v0.1 and labelled a developer preview.** DeepSeek says core plugins and APIs will keep evolving. Do not pin production workflows to today's plugin interfaces.
- **Composability is a cost as well as a feature.** "Everything is a plugin" means everything is a decision. Claude Code and Codex ship opinions, and opinions are why they work out of the box.
- **The ecosystem is young.** There is a real community forming — the repository has drawn extraordinary attention, and third-party CLI wrappers like [deepseek-harness-cli](https://github.com/peiyuwang54/deepseek-harness-cli) already add terminal UIs, MCP support and nine interface languages — but plugin availability is nothing like the maturity of the mainstream harnesses.
- **You still need somewhere to run it.** A harness gives an agent tools; it does not give it a machine with your dependencies, your database and permission to break things.

## Where it fits on Dupli

That last caveat is our part of the stack, so here is the direct answer: `dsh` is a first-class harness on [Dupli](/#harnesses). We run it headless inside the same disposable Linux machine every other harness gets — your repository, your services, your seeded database, one VM per run, destroyed at the end.

```sh
dupli run --harness dsh "Add rate-limit middleware to the gateway"
```

Two things this combination is unusually good at:

**Comparing harnesses on identical footing.** Because the environment is defined by a file in your repository, sending the same task to `dsh`, Claude Code, Codex and opencode in parallel controls for everything except the harness. Four machines, four branches, four diffs, one variable.

```sh
dupli run --parallel-harness dsh,claude,codex,opencode \
  "Rewrite the auth guard, keep the tests green"
```

**Running experimental plugins safely.** Creator mode and in-memory plugin testing are exactly the sort of thing you want happening on a machine you are happy to throw away. Custom loops and half-finished tool plugins do unpredictable things; a disposable VM makes that a cheap experiment instead of a bad afternoon.

## The short version

DeepSeek Harness is the scaffolding around a model, released MIT and built so every part of it can be swapped. It is early, it is opinion-free in a way that is both its strength and its cost, and it is the most interesting thing to happen to the agent-runtime layer this year — because it is the first time the harness has been a component you can reason about rather than a black box you rent.

Bring your own plugins. We will bring the machine.

[Get started](https://dupli.dev/auth/signup) — $20/user/month, all five harnesses included.

*DeepSeek Harness details come from the project's public repository, documentation and [announcement page](https://www.deepseek.com/harness/en/) as of September 2026. It is a developer preview and moving quickly; check the docs before relying on any specific interface.*
