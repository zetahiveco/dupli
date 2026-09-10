---
image: "blog_bg.jpg"
title: "What Is a Software Factory?"
subtitle: "The architecture behind agent-run software delivery — the loops, the gates, the org chart, and the failure modes nobody advertises."
date: "2026-09-06"
author: "Harish Deivanayagam"
timeToRead: "10 min read"
slug: "software-factory"
---

"Software factory" is the term that stuck in 2026, and like most terms that stick, it is now used to mean four different things.

The useful definition is narrow. A software factory is **a managed system for producing software with repeatable inputs, standardised tooling and measurable output**, where AI coding agents do the execution inside that system and engineers own intent, verification and release. [Factory.ai](https://factory.ai/articles/what-is-a-software-factory-architecture) and [Warp](https://www.warp.dev/articles/modern-software-factory-architecture) both land on roughly this wording, and Tereza Tížková's framing at AI Engineer World's Fair 2026 — "the whole loop, the whole lifecycle of developing software with autonomy" — is the same idea said faster.

The distinction that matters: **a coding assistant operates on the editor surface. A factory operates on the work itself.** An assistant suggests a completion. A factory accepts a scoped task, plans it, executes it across the lifecycle, and emits a change with a traceable record. What separates the two is the surrounding system, not the model.

## The anatomy of a factory

Every implementation looks slightly different, but the components are stable. Think of it as a pipeline that a single **unit of intent** flows through.

### 1. Intake

Scoped work enters the system as a specification: a Linear ticket, a Sentry issue, a review comment, a row in a migration checklist. The quality of everything downstream is capped here, which is why the O'Reilly write-up on [running a software factory](https://www.oreilly.com/radar/inside-a-software-factory/) insists that planning stays human-driven. If the spec is vague, the agent will confidently build the wrong thing very quickly.

### 2. Standardised environment

The agent needs a machine that behaves identically every time: pinned image, restored dependency cache, running services, seeded database. This is the component teams under-invest in and then blame the model for. An agent that cannot run your test suite is guessing, and a factory built on guesses produces volume without reliability.

This is the layer [Dupli](/) provides — one disposable Linux VM per run, defined by a file committed next to your code.

### 3. Execution

The harness. Claude Code, Codex, [DeepSeek Harness](/blog/deepseek-harness), opencode, Gemini CLI: the thing that actually reads files, edits code, runs commands and iterates. Modern execution layers are model-agnostic and bring-your-own-key, because the leading model changes faster than you can re-platform.

Crucially, the harness is *interchangeable*. If swapping yours is a migration project, you have built a factory around a vendor rather than around your work.

### 4. Review and policy gates

Before a change merges it runs through the suite, the linter, security scanning and an automated review against policy. This is the stage that holds an agent-authored change to the same standard as a human-authored one — and the stage most teams discover they never really had, because human authorship was doing the quality work implicitly.

### 5. Delivery and observability

CI/CD, artifacts, deployment, post-deployment verification. Agents act in CI under service accounts with scoped permissions. Every run leaves a trace: the prompt, the commands, the diff, the test output, the recording.

## It is an org chart made of loops

The sharpest framing I have read is Addy Osmani's, in [Software Factories, Light and Dark](https://addyosmani.com/blog/software-factories/):

> A software factory is many harnessed loops running at once, fed by a queue of work and drained through a review gate into production, with humans owning the whole thing from above. It is not a bigger agent; it is an org chart made of loops.

That reframe changes what you optimise. A bigger agent is a model problem. An org chart made of loops is a systems problem — queueing, isolation, gating, throughput, blast radius — and systems problems are the kind engineering organisations already know how to solve.

Osmani also gives the taxonomy worth internalising:

- A **light factory** keeps humans in the loop, trading some speed for judgement and comprehension.
- A **dark factory** lets agents scope, build and ship without anyone really reading the details.

The dark version is not automatically wrong. There are tight, low-risk loops you can safely run unattended — a nightly job that fixes exactly one lint violation and opens one small pull request, so the team wakes up to a marginally better codebase and a diff short enough to actually read. Nobody needs to supervise that.

But the failure mode is real: *if people stop reading, they stop understanding your software.* Turning the lights off on the auth system, the billing engine or a public API contract is how you end up with a codebase your team can no longer reason about. The hard judgement call in running a factory is not which agent to buy. It is **which loops get to run unattended, and which checks you build before they do.**

### Inner loop, outer loop

Osmani's other useful cut: agents are now genuinely good at the **inner loop** — investigate the bug, write the diagnosis, implement the fix, run the tests, produce a report. Engineers should own the **outer loop**: decide whether this is the right way to address the problem, verify the diagnosis and implementation are sound, approve the change, and carry the consequences of being wrong.

The boundary between the two is *evidence*: the diff, the tests, the logs, and a short explanation connecting them. Which is a design requirement for your factory, not a nice-to-have. If a run cannot hand back evidence, its output cannot be reviewed at the speed it was produced, and your review gate becomes the bottleneck that eats the entire gain.

## Who staffs the line

Headcount does not drop; composition changes. [Augment Code's write-up on factory org design](https://www.augmentcode.com/guides/software-factory-org-design) names four accountabilities that need to land on real people before a line runs unattended. They are jobs, not job titles — on a small team one engineer carries two of them.

| Role | Owns | Failure mode if unowned |
|---|---|---|
| Spec author | The quality of what enters the system | Agents build the wrong thing, fast |
| Verifier | Whether output meets the bar | Volume ships, reliability quietly degrades |
| Fleet operator | Environments, triggers, credentials, the kill switch | Runaway runs nobody can stop |
| Line owner | Merge authority and the authority to halt | No one is accountable for what shipped |

The line owner detail is the one people skip: **merge authority and halt authority belong to the same person**, because a halt is a merge decision made under time pressure.

## Measure the system, not the person

Individual productivity metrics stop meaning anything in a factory. One engineer running twelve parallel runs is not "12x more productive"; they are operating a line. The metrics that survive are system-level: throughput of merged changes, review latency, rework rate, incident rate, and machine-minutes spent per merged pull request.

Watch the ratio between generated volume and merged volume especially closely. A factory that triples output and quadruples rework has made things worse, and it will look like a triumph on any dashboard that only counts the numerator.

## A pragmatic build order

If you are starting from coding agents on laptops, this is the sequence that tends to work:

1. **Standardise the environment first.** One file, in the repo, that defines the machine. Nothing else you build is trustworthy until a run is reproducible.
2. **Move execution off laptops.** One machine per run, so isolation is structural and parallelism is possible at all.
3. **Write the gates down.** Tests, lint, security scan, policy review. Make them identical for human and agent authorship — an agent-authored change should not get a discount, and it should not get a penalty either.
4. **Instrument the trace.** Prompt, commands, diff, test output, recording. This is what makes review fast enough to keep up.
5. **Add unattended loops last, narrowest first.** Dependency bumps, lint sweeps, codemods, flaky test triage. Small diffs, low stakes, easily reverted.
6. **Name the four owners.** Then write down which loops may run with the lights off.

Most teams try step 5 first, get a pile of unreviewable pull requests, and conclude agents do not work.

## The short version

A software factory is not a better agent. It is the system around the agent: standardised inputs, reproducible environments, interchangeable execution, real gates, and traceable output — with humans holding intent at the front and release at the back.

The architecture does not change when agents arrive. The actors do.

---

Dupli is the environment and execution layer for a factory: one isolated Linux machine per run, defined by a file in your repository, running whichever harness you prefer, with the full trace handed back for review. [Get started](https://dupli.dev/auth/signup) — $20/user/month.
