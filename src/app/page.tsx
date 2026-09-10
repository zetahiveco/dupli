"use client"

import Footer from "@/components/shared/footer"
import Navbar from "@/components/shared/navbar"
import LandingFaq from "@/components/shared/landing-faq"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import HeroBackground from "@/components/shared/hero-background"
import { BookDemoButton } from "@/components/shared/book-demo-button"
import { MarketingShell } from "@/components/shared/marketing-shell"
import {
  AgentFleetIllustration,
  AnalyticsIllustration,
  ComputerUseIllustration,
  EnvironmentIllustration,
  FleetIllustration,
  ManifestIllustration,
  SurfacesIllustration,
  TerminalIllustration,
} from "@/components/shared/illustrations"
import { CAPABILITIES, ENTERPRISE_CONTROLS, HARNESSES, SURFACES } from "@/components/shared/platform"
import { HarnessLogo } from "@/components/shared/harness-logo"

const brandButton = "bg-brand text-white hover:bg-brand/90"
const edgeCell = "p-6 md:p-8 lg:p-10"

const howItWorks = [
  {
    step: "01",
    title: "Assign from anywhere",
    body: "From Linear, Slack, GitHub, GitLab, the dashboard or the CLI. No new workflow — Dupli reads the ticket and starts the run in the thread you already live in.",
  },
  {
    step: "02",
    title: "Work with any harness",
    body: "Claude Code, Codex, DeepSeek Harness, opencode or Gemini CLI — each in its own Linux VM. Swap the agent without rebuilding the environment.",
  },
  {
    step: "03",
    title: "Review what comes back",
    body: "A pull request, a reply, a recording. Merge it, comment on it, or send it again. Every command, diff and screenshot lands on a run page your team can read.",
  },
]

const laptopPoints = [
  "One agent at a time, because the second one fights it for the same working tree.",
  "A long refactor holds your machine hostage until it finishes or fails.",
  "The agent cannot restart postgres or run the browser suite, so it guesses.",
  "Nobody can see what it did except the person whose laptop it ran on.",
]

const dupliPoints = [
  "Every task boots its own Linux machine, so forty runs never touch each other.",
  "Delegate and close the lid — the run keeps going in the cloud.",
  "The agent owns the box: it restarts services, drives a browser, verifies itself.",
  "Every command, diff and recording lands on a run page your team can read.",
]

const useCases = [
  {
    title: "Platform teams",
    body: "Put the maintenance backlog on a schedule. Dependency bumps, lint sweeps and codemods arrive as small pull requests nobody had to start.",
  },
  {
    title: "Product engineers",
    body: "Hand off the scoped ticket you were never going to get to this sprint, keep your own machine for the work that needs your judgement.",
  },
  {
    title: "Engineering leaders",
    body: "See which harnesses, models and people actually shipped, measured in machine-minutes rather than vibes.",
  },
]

const personalFeatures = [
  "Unlimited runs, billed by machine-minute",
  "5,000 machine-minutes included per user",
  "All five harnesses, bring your own model keys",
  "Slack, Linear, GitHub and GitLab triggers",
  "Configurable environments with warm hooks",
  "Computer use with screenshots and recordings",
  "REST API, CLI and scheduled automations",
]

const enterpriseFeatures = [
  "SOC 2 Type II reporting and security review",
  "SAML SSO and SCIM provisioning",
  "Dedicated account manager and shared Slack",
  "Private VPC peering and egress allowlists",
  "Audit log export to your SIEM",
  "Volume machine-minutes and an uptime SLA",
]

function FeatureBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-slate-700">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center bg-brand/12 text-brand">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      {children}
    </li>
  )
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-brand-ink md:text-4xl">{title}</h2>
      {body && <p className="text-slate-600">{body}</p>}
    </div>
  )
}

export default function Home() {
  return (
    <MarketingShell footer={<Footer />}>
      <Navbar />
      <main className="min-w-0">
        <div className="marketing-rule">
        <HeroBackground>
          <div className="flex min-h-svh min-w-0 w-full items-center justify-center px-6 pt-24 pb-10 md:px-10 md:pb-14">
            <div className="pointer-events-auto flex w-full min-w-0 max-w-6xl animate-in fade-in slide-in-from-bottom-4 flex-col items-center space-y-6 text-center duration-700">
              <h1 className="whitespace-nowrap text-[clamp(1.7rem,6.4vw,4.25rem)] font-semibold leading-none tracking-tight text-brand-ink">
                The Cloud Coding Agent
              </h1>

              <p className="max-w-4xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
                Run coding agents inside isolated cloud machines with your codebases, tooling and
                dependencies. One machine per agent — nothing shared, nothing broken. Delegate, iterate,
                review from anywhere.
              </p>

              <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <Button size="lg" className={`w-full px-8 ${brandButton} sm:w-auto`}>
                    Get started
                  </Button>
                </Link>
                <BookDemoButton
                  variant="outline"
                  size="lg"
                  className="w-full border-white/15 bg-white/[0.04] px-8 text-brand-ink backdrop-blur-md hover:bg-white/[0.08] sm:w-auto"
                >
                  Book a demo
                </BookDemoButton>
              </div>

              <p className="text-sm text-slate-500">
                $20/mo per user. Personal plan, billed monthly.
              </p>

              <div className="w-full min-w-0 pt-2">
                <AgentFleetIllustration />
              </div>
            </div>
          </div>
        </HeroBackground>
        </div>

        <section className="marketing-rule relative z-20 px-6 py-12 md:px-10 md:py-14">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            The harnesses your team already trusts
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
            {HARNESSES.map((harness) => (
              <span
                key={harness.id}
                className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-slate-500 transition-colors duration-300 hover:text-brand-ink md:text-xl"
              >
                <HarnessLogo harness={harness.id} className="h-6 w-6" />
                {harness.name}
              </span>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="marketing-rule scroll-mt-28">
          <div className="px-6 py-16 md:px-10 md:py-20">
            <SectionHeading
              eyebrow="How it works"
              title="Delegate to any coding agent. Get engineering work back."
              body="Assign from the tools you already use. Each harness boots its own Linux VM. You review a pull request, a reply or a recording."
            />
          </div>
          <div className="edge-grid edge-grid-3 marketing-split">
            {howItWorks.map((item) => (
              <article key={item.step} className={`${edgeCell} flex flex-col gap-3`}>
                <p className="font-mono text-[11px] tracking-[0.18em] text-brand">{item.step}</p>
                <h3 className="text-xl font-semibold text-brand-ink">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="platform" className="marketing-rule scroll-mt-28">
          <div className="px-6 py-16 md:px-10 md:py-20">
            <SectionHeading
              eyebrow="Platform"
              title="Six primitives, one runtime"
              body="Every harness runs on the same machines, the same environment config and the same audit trail. Swap the agent without rebuilding the platform."
            />
          </div>
          <div className="edge-grid edge-grid-3 marketing-split">
            {CAPABILITIES.map((capability) => (
              <article key={capability.id} className={`${edgeCell} flex flex-col gap-4`}>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-10 w-10 items-center justify-center border ${capability.accent}`}>
                    <capability.icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-semibold text-brand-ink">{capability.label}</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{capability.blurb}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[var(--marketing-line)] pt-4">
                  {capability.fields.map((field) => (
                    <span
                      key={field}
                      className="border border-[var(--marketing-line)] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-slate-500"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="environments" className="marketing-rule scroll-mt-28">
          <div className="edge-grid edge-grid-2">
            <div className={`${edgeCell} flex flex-col justify-center space-y-5`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Sandboxed environments</p>
              <h2 className="text-3xl font-semibold tracking-tight text-brand-ink md:text-4xl">
                Every agent gets its own machine
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-slate-600">
                Commit a <span className="font-mono text-[0.9em] text-brand-soft">dupli.yml</span> next to
                your code and every run starts from the same box: image pinned, dependencies restored from
                cache, postgres and redis already listening, migrations already applied. An agent that can run
                your test suite stops guessing whether the change works.
              </p>
              <ul className="space-y-2.5">
                <FeatureBullet>Isolated VMs — every task boots its own Linux machine, sharing nothing</FeatureBullet>
                <FeatureBullet>Warm hooks preinstall packages, images, MCPs, skills and secrets</FeatureBullet>
                <FeatureBullet>Real services, real migrations, real seed data inside the machine</FeatureBullet>
              </ul>
            </div>
            <div className={`${edgeCell} min-w-0 w-full overflow-hidden`}>
              <EnvironmentIllustration />
            </div>
          </div>
        </section>

        <section id="computer-use" className="marketing-rule scroll-mt-28">
          <div className="edge-grid edge-grid-2">
            <div className={`${edgeCell} order-2 min-w-0 w-full overflow-hidden md:order-1`}>
              <ComputerUseIllustration />
            </div>
            <div className={`${edgeCell} order-1 flex flex-col justify-center space-y-5 md:order-2`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Computer use</p>
              <h2 className="text-3xl font-semibold tracking-tight text-brand-ink md:text-4xl">
                Agents drive a real desktop and browser
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-slate-600">
                Each machine can run a full desktop session. The agent opens your app, clicks through the
                flow it just changed, and hands back screenshots and a screen recording alongside the diff.
                That is the difference between claiming a fix works and showing you that it does.
              </p>
              <ul className="space-y-2.5">
                <FeatureBullet>Real browser, real viewport, real user flows</FeatureBullet>
                <FeatureBullet>Screenshots and recordings attached to every run</FeatureBullet>
                <FeatureBullet>The machine is destroyed when the run ends — no leftover session</FeatureBullet>
              </ul>
            </div>
          </div>
        </section>

        <section id="fleet" className="marketing-rule scroll-mt-28">
          <div className="edge-grid edge-grid-2">
            <div className={`${edgeCell} flex flex-col justify-center space-y-5`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Fleet</p>
              <h2 className="text-3xl font-semibold tracking-tight text-brand-ink md:text-4xl">
                Run four agents on one problem, or forty on the backlog
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-slate-600">
                Send the same task to Claude Code, Codex, DeepSeek Harness and opencode at once and read four
                diffs side by side before you pick one. Or point a schedule at the maintenance queue and let
                unattended runs open small pull requests overnight. Isolation is what makes both safe.
              </p>
              <ul className="space-y-2.5">
                <FeatureBullet>Every run gets its own branch, machine and reviewable output</FeatureBullet>
                <FeatureBullet>Best-of-N across harnesses when the problem is worth the minutes</FeatureBullet>
                <FeatureBullet>Cron, webhook and queue triggers for work nobody wants to start</FeatureBullet>
              </ul>
            </div>
            <div className={`${edgeCell} min-w-0 w-full overflow-hidden`}>
              <FleetIllustration />
            </div>
          </div>
        </section>

        <section id="surfaces" className="marketing-rule scroll-mt-28">
          <div className="edge-grid edge-grid-2">
            <div className={`${edgeCell} order-2 min-w-0 w-full overflow-hidden md:order-1`}>
              <SurfacesIllustration />
            </div>
            <div className={`${edgeCell} order-1 flex flex-col justify-center space-y-5 md:order-2`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Integrations</p>
              <h2 className="text-3xl font-semibold tracking-tight text-brand-ink md:text-4xl">
                Start agents wherever work already shows up
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-slate-600">
                Nobody adopts a new workflow. So Dupli lives in the ones you have: mention it in the Slack
                thread where the bug was reported, assign it the Linear ticket, tag it on the review comment.
                It provisions a machine and answers in the same place you asked.
              </p>
              <ul className="space-y-2.5">
                <FeatureBullet>Dashboard, Slack, Linear, GitHub, GitLab, CLI and API</FeatureBullet>
                <FeatureBullet>Replies land in the thread that started the run, with the diff attached</FeatureBullet>
                <FeatureBullet>Automations fire from a schedule or a webhook with nobody in the room</FeatureBullet>
              </ul>
            </div>
          </div>
        </section>

        <section id="analytics" className="marketing-rule scroll-mt-28">
          <div className="edge-grid edge-grid-2">
            <div className={`${edgeCell} flex flex-col justify-center space-y-5`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Analytics</p>
              <h2 className="text-3xl font-semibold tracking-tight text-brand-ink md:text-4xl">
                Visibility into how your team works
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-slate-600">
                Every minute is attributable — to a source, a person, a harness, a model, the credential that
                paid for it, and the skills and MCP servers the agent reached for. Defend the budget line with
                numbers instead of anecdotes.
              </p>
              <ul className="space-y-2.5">
                <FeatureBullet>Machine-minutes by person, harness, model and trigger</FeatureBullet>
                <FeatureBullet>Idle machines sleep — a run waiting on review costs nothing</FeatureBullet>
                <FeatureBullet>Export the audit trail to the SIEM you already answer for</FeatureBullet>
              </ul>
            </div>
            <div className={`${edgeCell} min-w-0 w-full overflow-hidden`}>
              <AnalyticsIllustration />
            </div>
          </div>
        </section>

        <section id="harnesses" className="marketing-rule scroll-mt-28">
          <div className="px-6 py-16 md:px-10 md:py-20">
            <SectionHeading
              eyebrow="Harnesses"
              title="Bring the agent your team already trusts"
              body="Models move every few weeks. Dupli keeps the environment stable underneath so switching harness is a dropdown, not a migration."
            />
          </div>
          <div className="edge-grid edge-grid-3 marketing-split">
            {HARNESSES.map((harness) => (
              <div key={harness.id} className={`${edgeCell} flex flex-col gap-3`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-brand-ink">
                    <HarnessLogo harness={harness.id} className="h-5 w-5 text-brand-ink" />
                    {harness.name}
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {harness.vendor}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{harness.note}</p>
                <p className="mt-auto border-t border-[var(--marketing-line)] pt-4 font-mono text-[11px] text-brand-soft">
                  <span className="mr-1.5 text-brand">$</span>
                  {harness.command}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="api" className="marketing-rule scroll-mt-28">
          <div className="edge-grid edge-grid-2">
            <div className={`${edgeCell} order-2 min-w-0 w-full overflow-hidden md:order-1`}>
              <TerminalIllustration />
            </div>
            <div className={`${edgeCell} order-1 scroll-mt-28 flex flex-col justify-center space-y-5 md:order-2`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">API &amp; CLI</p>
              <h2 className="text-3xl font-semibold tracking-tight text-brand-ink md:text-4xl">
                One POST starts a machine. One command starts four.
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-slate-600">
                Everything the dashboard does is an API call: provision a run, stream its log, read the diff,
                merge the branch. The CLI wraps the same endpoints so you can hand off the branch you are on
                without leaving the terminal, and CI can delegate the same way a person does.
              </p>
              <ul className="space-y-2.5">
                <FeatureBullet>REST endpoints for runs, environments, branches and artifacts</FeatureBullet>
                <FeatureBullet>Streaming logs and webhooks on every run state change</FeatureBullet>
                <FeatureBullet>Billed per machine-minute, so idle runs cost nothing</FeatureBullet>
              </ul>
            </div>
          </div>
        </section>

        <section id="usecases" className="marketing-rule scroll-mt-28">
          <div className="px-6 py-16 md:px-10 md:py-20">
            <SectionHeading
              eyebrow="Who it is for"
              title="Built for teams that already delegate"
            />
          </div>
          <div className="edge-grid edge-grid-3 marketing-split">
            {useCases.map((useCase) => (
              <div key={useCase.title} className={`${edgeCell} space-y-3`}>
                <h3 className="text-xl font-semibold text-brand-ink">{useCase.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{useCase.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="isolation" className="marketing-rule scroll-mt-28">
          <div className="px-6 py-16 md:px-10 md:py-20">
            <SectionHeading
              eyebrow="Isolation"
              title="The laptop is the bottleneck"
              body="A coding agent is only as capable as the machine it is allowed to break."
            />
          </div>
          <div className="edge-grid edge-grid-2 marketing-split">
            <div className={`${edgeCell} space-y-4`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Agents on your machine
              </p>
              <h3 className="text-xl font-semibold text-brand-ink">One working tree, one operator</h3>
              <ul className="space-y-3">
                {laptopPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-2 h-1 w-3 shrink-0 bg-slate-300" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${edgeCell} space-y-4`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Dupli</p>
              <h3 className="text-xl font-semibold text-brand-ink">One machine per agent</h3>
              <ul className="space-y-3">
                {dupliPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-2 h-1 w-3 shrink-0 bg-brand" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="pricing" className="marketing-rule scroll-mt-28 px-6 py-16 md:px-10 md:py-20">
          <SectionHeading
            eyebrow="Pricing"
            title="$20 per user, per month"
            body="Start on Personal with your own model keys. Move to Enterprise when procurement, SSO or an SLA becomes the constraint."
          />
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="relative flex flex-col border border-(--marketing-line) bg-[#0E0E12]">
              <span className="absolute right-0 top-0 bg-brand px-3 py-1 text-[11px] font-semibold text-white">
                Most popular
              </span>
              <div className="border-b border-(--marketing-line) px-8 py-8">
                <p className="text-sm font-medium text-slate-500">Personal</p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-brand-ink">
                  $20<span className="text-2xl font-medium text-slate-500">/mo</span>
                </p>
                <p className="mt-3 text-sm text-slate-600">Per user, billed monthly</p>
              </div>
              <ul className="grow space-y-3 px-8 py-7">
                {personalFeatures.map((feature) => (
                  <FeatureBullet key={feature}>{feature}</FeatureBullet>
                ))}
              </ul>
              <div className="px-8 pb-8">
                <Link href="/auth/signup" className="block">
                  <Button size="lg" className={`w-full ${brandButton}`}>
                    Get started
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex flex-col border border-(--marketing-line) bg-[#0E0E12]">
              <div className="border-b border-(--marketing-line) px-8 py-8">
                <p className="text-sm font-medium text-slate-500">Enterprise</p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-brand-ink">Contact</p>
                <p className="mt-3 text-sm text-slate-600">SOC 2, SAML SSO, dedicated account manager</p>
              </div>
              <ul className="grow space-y-3 px-8 py-7">
                {enterpriseFeatures.map((feature) => (
                  <FeatureBullet key={feature}>{feature}</FeatureBullet>
                ))}
              </ul>
              <div className="px-8 pb-8">
                <BookDemoButton
                  variant="outline"
                  size="lg"
                  className="w-full border-(--marketing-line) bg-transparent text-brand-ink hover:bg-white/[0.06]"
                >
                  Contact sales
                </BookDemoButton>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="marketing-rule scroll-mt-28">
          <div className="px-6 py-16 md:px-10 md:py-20">
            <SectionHeading
              eyebrow="Enterprise"
              title="Agents run under the controls you already answer for"
              body="Isolation is a security property before it is a performance one. Every machine is disposable, scoped and logged."
            />
          </div>
          <div className="edge-grid edge-grid-2 marketing-split">
            {ENTERPRISE_CONTROLS.map((control) => (
              <div key={control.label} className={`${edgeCell} flex items-start gap-4`}>
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center border border-brand/30 bg-brand/10 text-brand">
                  <control.icon className="h-4 w-4" />
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-brand-ink">{control.label}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{control.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <LandingFaq />

        <section className="marketing-rule">
          <div className="edge-grid edge-grid-2">
            <div className={`${edgeCell} min-h-90 overflow-hidden`}>
              <ManifestIllustration />
            </div>
            <div className={`${edgeCell} flex flex-col justify-center space-y-5 text-left`}>
              <h2 className="text-3xl font-semibold tracking-tight text-brand-ink md:text-4xl">
                Bring coding agents to the cloud
              </h2>
              <p className="max-w-lg text-slate-600">
                Connect a repo, pick a harness, and watch the first run boot in under four seconds. Every
                surface your team already works in.
              </p>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <Button size="lg" className={`w-full px-8 ${brandButton} sm:w-auto`}>
                    Get started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <BookDemoButton
                  variant="outline"
                  size="lg"
                  className="w-full border-[var(--marketing-line)] bg-transparent px-8 text-brand-ink hover:bg-white/[0.06] sm:w-auto"
                >
                  Book a demo
                </BookDemoButton>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {SURFACES.map((surface) => surface.label).join(" · ")}
              </p>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  )
}
