---
image: "blog_bg.jpg"
title: "Dupli vs Replicas"
subtitle: "Two cloud coding agent platforms, one honest comparison — including the parts where they are ahead of us."
date: "2026-09-07"
author: "Harish Deivanayagam"
timeToRead: "8 min read"
slug: "dupli-vs-replicas"
---

**Dupli** and [**Replicas**](https://replicas.dev/) are solving the same problem: coding agents are far more useful when they stop running on your laptop.

Both of us give an agent its own Linux machine in the cloud, preloaded with your repository and tooling. Both let you pick a harness — Claude Code, Codex, opencode — rather than locking you into one vendor's agent. Both start runs from Slack, Linear, GitHub and an API instead of asking your team to adopt a new tool. If you are evaluating us against them, the category question is settled; what is left is a set of narrower engineering decisions.

This post is our attempt at an honest version of that comparison, written by us, which you should read with the appropriate amount of scepticism.

## Quick comparison

| | Dupli | Replicas |
|---|---|---|
| Core unit | A run, on a machine that only that run touches | A workspace, with one or more agents inside it |
| Harnesses | Claude Code, Codex, DeepSeek Harness, opencode, Gemini CLI | Claude Code, Codex, Cursor, Opencode |
| Environment definition | `dupli.yml` committed to the repo, versioned with your code | Configured per environment, with warm hooks |
| Multiple agents per box | Never — one machine per run, by design | Supported; several agents can share one workspace |
| Triggers | Dashboard, Slack, Linear, GitHub, GitLab, CLI, API, schedules | Dashboard, Slack, Linear, GitHub, GitLab, automations, API |
| Computer use | Real desktop and browser, screenshots and recordings | Real desktop and browser, screenshots and recordings |
| Attribution | Per machine-minute, by person, harness, model and credential | Per minute, by source, person, harness, model, credential, skills and MCP |
| Pricing | $20/user/month, 5,000 machine-minutes included per user | Plan allowance of workspace minutes, usage-based beyond it |
| Free trial | None | 14 days, no card |
| Compliance | SOC 2 Type I and Type II in progress | SOC 2 Type I and Type II in progress |

## What Replicas does better than us

We are not going to pretend this section is empty.

- **They got here first, and it shows.** Replicas defined "cloud coding agent" as a product category, and their platform reflects a longer run of production feedback than ours does. Announcing a V1 and shipping the fourth iteration of a scheduler are different things.
- **Customer proof at real scale.** Teams like Mintlify, Knowunity, Composio, Cargo, Moda and Parrot are on the record with numbers — Knowunity attributes half of its pull requests to cloud agents, and Parrot reported 23,500 automated cloud-agent jobs in a single month. We have design partners and a shorter list.
- **Analytics depth.** Their attribution model breaks a minute down further than ours does today, including which skills and MCP servers an agent reached for. If your job is defending an AI budget line to a CFO, that granularity is genuinely useful and we are still catching up on it.
- **Workspace ergonomics for pairing.** Their model of a persistent workspace you can drop several agents into, then pair with in the browser, is nicer than ours for exploratory work. Our strict one-machine-per-run rule is a deliberate constraint, and constraints cost you something.

If you want the most proven cloud agent platform on the market today, buy theirs. That is a reasonable decision and we would rather you hear it from us.

## What Dupli does differently

### Isolation is a rule, not a setting

A run gets exactly one machine, that machine belongs to that run, and it is destroyed when the run ends. You cannot configure two agents onto the same box, because the moment you can, someone will, and then a bad `rm` in one agent's session is a bad `rm` in another's.

The practical consequences show up in the boring places. Credentials are minted per run and scoped to one repository, so a compromised agent session cannot reach your other repos. Egress is allowlisted per environment. There is no shared filesystem for one run to poison for the next. When you are asking a security team to approve autonomous agents with write access to source control, "the blast radius is one disposable VM" is the sentence that gets you through the review.

### The environment lives in your repository

Dupli reads a `dupli.yml` committed next to your code:

```yaml
image: node22-pg16
services: [postgres, redis]
warm:
  - pnpm install --frozen-lockfile
  - pnpm db:migrate
mcp: [linear, sentry]
```

That file is reviewed in a pull request like anything else, and it is versioned with the branch it belongs to. An agent working on a six-week-old release branch boots that branch's environment, not today's. Environment drift between what CI runs, what your laptop runs and what the agent runs is one of the main reasons agent output gets rejected, and the fix is to make the environment a code artifact rather than dashboard state.

Warm hooks run before the agent is assigned, so median boot on a cached image is under four seconds.

### Every harness, including the new ones

We support five harnesses rather than four, and the extras are deliberate. [DeepSeek Harness](/blog/deepseek-harness) is the first serious open-source runtime where the agent loop itself is a swappable plugin, which makes it the most interesting place to run experiments. Gemini CLI earns its slot on context window alone when a task needs a whole-repository read.

Because the environment layer is identical underneath, sending one task to four harnesses in parallel is a flag rather than a project:

```sh
dupli run --parallel-harness claude,codex,dsh,opencode \
  "Rewrite the auth guard, keep the tests green"
```

Four machines, four branches, four diffs to read side by side. On a hard problem this is a much better use of forty machine-minutes than one agent's best guess.

### API parity, not an API afterthought

Everything the dashboard does is a REST call, because the dashboard is a client of the same API you get. Provision a run, stream its log, read the diff, merge the branch. Teams building their own internal developer platform on top of agents need the platform to be a primitive, and that is easier to promise on day one than to retrofit later.

### Pricing you can predict before you deploy

$20 per user per month, 5,000 machine-minutes included per user, and metered compute beyond that. Machines sleep when idle, so a run sitting in your review queue costs nothing. Usage-based pricing on runtime minutes is the honest model for this category and both of us use it; we just try to make the seat price the number you have to remember.

## Where they genuinely overlap

It is worth being clear about how much of this is the same, because a comparison table can imply differences that do not exist in practice:

- Both give agents a real Linux VM with your dependencies and services.
- Both support real computer use, with screenshots and recordings handed back.
- Both trigger from Slack, Linear, GitHub, GitLab, the dashboard and an API.
- Both meter usage in runtime minutes and sleep idle workspaces.
- Both have SOC 2 Type I and Type II in progress.

Anyone telling you one of these platforms has a moat built on the feature list is selling something.

## How to choose

**Choose Replicas if** you want the most battle-tested option, you value a persistent workspace you can pair inside, and detailed spend analytics is the thing your organisation needs most right now.

**Choose Dupli if** hard isolation is a security requirement rather than a preference, you want the environment defined in a reviewed file in your repository, you care about running DeepSeek Harness or Gemini CLI alongside Claude Code and Codex, or you are building your own tooling on top of an API and need full parity from day one.

**Run both if** you are early in an evaluation. They install in an afternoon, and the fastest way to learn what your team actually needs from a cloud agent platform is to give the same three tickets to both and read the pull requests.

## Verdict

Replicas made the case that coding agents belong in the cloud, and they made it before we did. We are arguing about the next layer down: whether isolation should be strict, whether the environment belongs in git, and whether the API is the product or a feature of it. Those are the questions that decide whether a platform survives your security review and your second year of use — not whether it can boot a container.

[Get started](https://dupli.dev/auth/signup) — $20/user/month.

*Replicas details come from their publicly published product, customer and pricing pages as of September 2026 and may have changed since. If we have got something wrong about their platform, email [founders@dupli.dev](mailto:founders@dupli.dev) and we will correct it.*
