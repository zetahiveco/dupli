"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ArrowRight, Check, GitPullRequest, MonitorPlay, Server, Zap } from "lucide-react"
import { SURFACES } from "./platform"

/** Card surface used inside a gradient frame — opaque so text stays legible */
const framedPanel = "border border-white/10 bg-[#0E0E12]"

/** Gradient backdrop the illustration cards float on */
export function IllustrationFrame({ children }: { children: ReactNode }) {
    return (
        <div
            className="relative h-full min-h-70 w-full min-w-0 overflow-hidden p-5 sm:p-8"
            style={{
                background:
                    "linear-gradient(135deg, #08080A 0%, #14100A 18%, #2E1508 42%, #7A3A1A 72%, #FF8437 100%)",
            }}
        >
            {children}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Hero — scrolling agent tags, one machine each                       */
/* ------------------------------------------------------------------ */

const AGENT_ACTIONS = [
    "REFACTORING",
    "RUNNING TESTS",
    "DEPLOYING",
    "LINTING",
    "CODING",
    "MERGING",
    "BOOTING",
    "REVIEW",
] as const

function buildAgentRow(seed: number, count: number) {
    return Array.from({ length: count }, (_, i) => {
        const id = String((seed * 19 + i * 11) % 100).padStart(2, "0")
        const action = AGENT_ACTIONS[(seed + i) % AGENT_ACTIONS.length]
        const live = (seed + i) % 5 === 0
        return { id, action, live }
    })
}

const AGENT_ROWS = [
    { seed: 3, duration: "28s", reverse: false },
    { seed: 8, duration: "34s", reverse: true },
    { seed: 1, duration: "26s", reverse: false },
    { seed: 12, duration: "32s", reverse: true },
    { seed: 5, duration: "30s", reverse: false },
]

export function AgentFleetIllustration() {
    return (
        <div className="relative mx-auto h-[168px] w-full min-w-0 max-w-2xl sm:h-[196px]">
            <div className="absolute inset-0 overflow-hidden border border-border bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
                <div
                    className="flex h-full flex-col justify-center gap-2 py-3"
                    style={{
                        WebkitMaskImage:
                            "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)",
                        maskImage:
                            "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)",
                    }}
                >
                    {AGENT_ROWS.map((row) => {
                        const items = buildAgentRow(row.seed, 10)
                        const doubled = [...items, ...items]
                        return (
                            <div key={row.seed} className="overflow-hidden">
                                <div
                                    className={`flex w-max gap-2 ${row.reverse ? "marquee-right" : "marquee-left"}`}
                                    style={{ animationDuration: row.duration }}
                                >
                                    {doubled.map((agent, i) => (
                                        <span
                                            key={`${agent.id}-${i}`}
                                            className={`inline-flex shrink-0 items-center gap-2 border px-2.5 py-1.5 font-mono text-[11px] tracking-wide backdrop-blur-md ${
                                                agent.live
                                                    ? "border-brand/40 bg-brand/20 text-brand"
                                                    : "border-white/15 bg-white/8 text-white/75"
                                            }`}
                                        >
                                            <span className={agent.live ? "text-brand" : "text-white/45"}>
                                                AGENT-{agent.id}
                                            </span>
                                            <span className={agent.live ? "text-brand-ink" : "text-white/85"}>
                                                {agent.action}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Environment — configure the machine once                            */
/* ------------------------------------------------------------------ */

const BOOT_STEPS = [
    { label: "Pull image · node22-pg16", ms: "0.4s" },
    { label: "Restore pnpm store from cache", ms: "0.9s" },
    { label: "Start postgres + redis", ms: "1.6s" },
    { label: "Seed database, run migrations", ms: "2.9s" },
    { label: "Mount skills, MCP servers, secrets", ms: "3.8s" },
]

const CONFIG_LINES = [
    { key: "image", value: '"node22-pg16"' },
    { key: "services", value: '["postgres", "redis"]' },
    { key: "warm", value: '"pnpm install --frozen"' },
    { key: "mcp", value: '["linear", "sentry"]' },
]

export function EnvironmentIllustration() {
    const [step, setStep] = useState(0)

    useEffect(() => {
        const id = setInterval(() => setStep((s) => (s + 1) % (BOOT_STEPS.length + 2)), 900)
        return () => clearInterval(id)
    }, [])

    const ready = step >= BOOT_STEPS.length

    return (
        <IllustrationFrame>
            <div className={`relative w-full min-w-0 overflow-hidden ${framedPanel} p-4`}>
                <div className="flex items-center justify-between gap-2 border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Server className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="font-mono text-[11px] text-slate-600">dupli.yml</span>
                    </div>
                    <span
                        className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide transition-colors duration-300 ${
                            ready ? "border-brand/35 bg-brand/12 text-brand" : "border-white/15 bg-white/[0.05] text-white/50"
                        }`}
                    >
                        {ready ? "ready 3.8s" : "booting"}
                    </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
                    <div className="space-y-1 border border-white/8 bg-white/[0.02] p-2.5 font-mono text-[10px] leading-relaxed">
                        {CONFIG_LINES.map((line) => (
                            <div key={line.key} className="truncate">
                                <span className="text-brand-soft">{line.key}</span>
                                <span className="text-slate-500">: </span>
                                <span className="text-slate-700">{line.value}</span>
                            </div>
                        ))}
                        <div className="truncate pt-1 text-slate-400">
                            # committed next to your code
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        {BOOT_STEPS.map((boot, i) => {
                            const done = i < step
                            const active = i === step
                            return (
                                <div
                                    key={boot.label}
                                    className={`flex items-center gap-2 border px-2 py-1.5 transition-all duration-300 ${
                                        done
                                            ? "border-brand/25 bg-brand/8"
                                            : active
                                              ? "border-white/20 bg-white/[0.06]"
                                              : "border-white/8 bg-white/[0.02] opacity-55"
                                    }`}
                                >
                                    <span
                                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-colors duration-300 ${
                                            done
                                                ? "border-brand bg-brand text-white"
                                                : "border-white/25 bg-transparent"
                                        }`}
                                    >
                                        {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                                    </span>
                                    <span
                                        className={`min-w-0 flex-1 truncate text-[10px] font-medium ${
                                            done ? "text-slate-700" : "text-slate-500"
                                        }`}
                                    >
                                        {boot.label}
                                    </span>
                                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-slate-400">
                                        {boot.ms}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </IllustrationFrame>
    )
}

/* ------------------------------------------------------------------ */
/* Fleet — the same task across harnesses, in parallel                 */
/* ------------------------------------------------------------------ */

const FLEET_ROWS = [
    { harness: "Claude Code", branch: "sep/auth-claude", diff: "+184 −41" },
    { harness: "Codex", branch: "sep/auth-codex", diff: "+121 −38" },
    { harness: "dsh", branch: "sep/auth-dsh", diff: "+140 −44" },
    { harness: "opencode", branch: "sep/auth-open", diff: "+166 −52" },
]

const QUEUE_ROWS = [
    { task: "Nightly lint sweep", trigger: "cron 02:00" },
    { task: "Sentry issue SEP-4182", trigger: "webhook" },
    { task: "Bump @types/node", trigger: "schedule" },
]

export function FleetIllustration() {
    const [tick, setTick] = useState(0)

    useEffect(() => {
        const id = setInterval(() => setTick((n) => n + 1), 1600)
        return () => clearInterval(id)
    }, [])

    const total = FLEET_ROWS.length + QUEUE_ROWS.length
    const active = tick % total
    const fleetLive = active < FLEET_ROWS.length ? active : -1
    const queueLive = active >= FLEET_ROWS.length ? active - FLEET_ROWS.length : -1

    return (
        <IllustrationFrame>
            <div className={`relative w-full min-w-0 overflow-hidden ${framedPanel} p-4`}>
                <div className="flex items-center justify-between gap-2 border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Server className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="text-[11px] font-semibold text-brand-ink">Rewrite the auth guard</span>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-brand">4 in parallel</span>
                </div>

                <div className="mt-2 space-y-1.5">
                    {FLEET_ROWS.map((row, i) => {
                        const live = i === fleetLive
                        return (
                            <div
                                key={row.harness}
                                className={`flex h-9 items-center gap-2 border px-2.5 transition-all duration-300 ${
                                    live ? "border-brand/30 bg-brand/10" : "border-white/8 bg-white/[0.03]"
                                }`}
                            >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-brand/12 text-[9px] font-bold text-brand">
                                    {row.harness.slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[11px] font-semibold text-brand-ink">{row.harness}</p>
                                    <p className="truncate font-mono text-[10px] text-slate-400">{row.branch}</p>
                                </div>
                                <span className="shrink-0 font-mono text-[9px] tabular-nums text-slate-500">
                                    {row.diff}
                                </span>
                                {live ? (
                                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-brand">
                                        live
                                    </span>
                                ) : (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-soft/70" />
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="text-[11px] font-semibold text-brand-ink">Unattended queue</span>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-brand">No one watching</span>
                </div>

                <div className="mt-2 space-y-1.5">
                    {QUEUE_ROWS.map((row, i) => {
                        const live = i === queueLive
                        return (
                            <div
                                key={row.task}
                                className={`flex h-9 items-center gap-2 border px-2.5 transition-all duration-300 ${
                                    live ? "border-brand/30 bg-brand/10" : "border-white/8 bg-white/[0.03]"
                                }`}
                            >
                                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-brand-ink">
                                    {row.task}
                                </span>
                                <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-slate-400">
                                    {row.trigger}
                                </span>
                                {live ? (
                                    <span className="font-mono text-[9px] uppercase tracking-wide text-brand">run</span>
                                ) : (
                                    <span className="h-1.5 w-1.5 rounded-full bg-brand-soft/70" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </IllustrationFrame>
    )
}

/* ------------------------------------------------------------------ */
/* Surfaces — work arrives from everywhere                             */
/* ------------------------------------------------------------------ */

export function SurfacesIllustration() {
    return (
        <IllustrationFrame>
            <div className={`relative w-full min-w-0 overflow-hidden ${framedPanel} p-4`}>
                <div className="mb-3 flex items-center justify-between border border-white/8 bg-white/3 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Server className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="text-[11px] font-semibold text-brand-ink">Fresh machine</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">run.provisioned</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {SURFACES.map((surface, i) => (
                        <div
                            key={surface.id}
                            className="flex items-center gap-2 border border-white/10 bg-[#15151B] px-2.5 py-2"
                        >
                            <surface.icon className="h-3.5 w-3.5 shrink-0 text-brand" />
                            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-brand-ink">
                                {surface.label}
                            </span>
                            <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand animate-[pulse_2s_ease-in-out_infinite]"
                                style={{ animationDelay: `${i * 0.4}s` }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </IllustrationFrame>
    )
}

/* ------------------------------------------------------------------ */
/* API + CLI terminal                                                  */
/* ------------------------------------------------------------------ */

const TABS = [
    {
        id: "api",
        label: "REST API",
        command:
            'curl -X POST https://api.dupli.dev/v1/runs \\\n  -H "Authorization: Bearer $DUPLI_API_KEY" \\\n  -d \'{"repo":"acme/api","harness":"claude","task":"Fix the flaky auth test"}\'',
        output: [
            "{",
            '  "id": "run_8fa21c",',
            '  "machine": "node22-pg16",',
            '  "harness": "claude-code",',
            '  "branch": "dupli/fix-flaky-auth",',
            '  "status": "running",',
            '  "bootMs": 3812',
            "}",
        ],
    },
    {
        id: "cli",
        label: "CLI",
        command: "dupli run --harness codex --parallel 4 \\\n  \"Rewrite the auth guard, keep the tests green\"",
        output: [
            "{",
            '  "runs": 4,',
            '  "harness": "codex",',
            '  "branches": [',
            '    "dupli/auth-guard-1",',
            '    "dupli/auth-guard-2"',
            "  ],",
            '  "minutesBilled": 11',
            "}",
        ],
    },
]

function OutputLine({ text }: { text: string }) {
    const match = text.match(/^(\s*)"([^"]+)":\s?(.*)$/)
    if (!match) {
        return <span className="text-slate-500">{text}</span>
    }
    const [, indent, key, value] = match
    return (
        <span>
            {indent}
            <span className="text-brand-soft">&quot;{key}&quot;</span>
            <span className="text-slate-500">: </span>
            <span className="text-brand">{value}</span>
        </span>
    )
}

export function TerminalIllustration() {
    const [tab, setTab] = useState(0)
    const [auto, setAuto] = useState(true)
    const [typed, setTyped] = useState("")
    const [revealed, setRevealed] = useState(0)

    useEffect(() => {
        const active = TABS[tab]
        const timers: ReturnType<typeof setTimeout>[] = []
        setTyped("")
        setRevealed(0)

        let i = 0
        const typer = setInterval(() => {
            i += 1
            setTyped(active.command.slice(0, i))
            if (i < active.command.length) return

            clearInterval(typer)
            active.output.forEach((_, index) => {
                timers.push(setTimeout(() => setRevealed(index + 1), 120 * (index + 1)))
            })
            if (auto) {
                timers.push(
                    setTimeout(
                        () => setTab((current) => (current + 1) % TABS.length),
                        120 * active.output.length + 3200,
                    ),
                )
            }
        }, 24)

        return () => {
            clearInterval(typer)
            timers.forEach(clearTimeout)
        }
    }, [tab, auto])

    const active = TABS[tab]

    return (
        <div className="relative h-full min-h-70 w-full min-w-0 overflow-hidden border border-white/10 bg-[#0B0B0E]">
            <div
                className="pointer-events-none absolute inset-0 opacity-70"
                aria-hidden
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 15% 0%, rgba(255,132,55,0.22), transparent 62%)",
                }}
            />

            <div className="relative flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
                <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                </div>
                <div className="ml-auto flex gap-1">
                    {TABS.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                setAuto(false)
                                setTab(index)
                            }}
                            className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                                index === tab
                                    ? "bg-brand/20 text-brand"
                                    : "text-white/40 hover:text-white/70"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative h-62 overflow-hidden px-4 py-3 font-mono text-[11px] leading-relaxed">
                <div className="whitespace-pre-wrap break-all text-white/85">
                    <span className="mr-2 text-brand">$</span>
                    {typed}
                    <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-px bg-brand animate-[caret-blink_1s_step-end_infinite]" />
                </div>
                <div className="mt-3 space-y-0.5">
                    {active.output.slice(0, revealed).map((line, index) => (
                        <div
                            key={`${active.id}-${index}`}
                            className="whitespace-pre opacity-0"
                            style={{ animation: "row-in 220ms ease-out forwards" }}
                        >
                            <OutputLine text={line} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative flex items-center justify-between border-t border-white/10 px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-white/45">
                    <Zap className="h-3 w-3 text-brand-soft" /> billed per machine-minute
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-brand">
                    201 Created <ArrowRight className="h-3 w-3" />
                </span>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Computer use — desktop, browser, recording                          */
/* ------------------------------------------------------------------ */

const BROWSER_STEPS = [
    { label: "Open localhost:3000/billing", status: "done" },
    { label: "Click Upgrade → confirm dialog", status: "done" },
    { label: "Assert toast + Stripe redirect", status: "live" },
    { label: "Attach recording to the run", status: "queued" },
]

export function ComputerUseIllustration() {
    const [frame, setFrame] = useState(0)

    useEffect(() => {
        const id = setInterval(() => setFrame((n) => (n + 1) % 4), 1400)
        return () => clearInterval(id)
    }, [])

    return (
        <IllustrationFrame>
            <div className={`relative w-full min-w-0 overflow-hidden ${framedPanel} p-4`}>
                <div className="flex items-center justify-between gap-2 border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2">
                        <MonitorPlay className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="text-[11px] font-semibold text-brand-ink">Desktop session</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-brand">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                        rec 00:1{frame}
                    </span>
                </div>

                <div className="mt-3 overflow-hidden border border-white/8 bg-[#08080A]">
                    <div className="flex items-center gap-2 border-b border-white/8 px-3 py-1.5">
                        <span className="h-2 w-2 rounded-full bg-white/15" />
                        <span className="h-2 w-2 rounded-full bg-white/15" />
                        <span className="h-2 w-2 rounded-full bg-white/15" />
                        <span className="ml-2 truncate font-mono text-[10px] text-slate-500">
                            localhost:3000/billing
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_0.9fr] gap-3 p-3">
                        <div className="space-y-2">
                            <div className="h-3 w-24 bg-brand/40" />
                            <div className="h-2 w-full bg-white/8" />
                            <div className="h-2 w-4/5 bg-white/8" />
                            <div
                                className={`mt-3 inline-flex border px-2 py-1 font-mono text-[9px] uppercase tracking-wide transition-colors ${
                                    frame >= 2
                                        ? "border-brand/40 bg-brand/15 text-brand"
                                        : "border-white/10 bg-white/[0.04] text-white/50"
                                }`}
                            >
                                Upgrade plan
                            </div>
                        </div>
                        <div className="space-y-1.5 border border-white/8 bg-white/[0.03] p-2">
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                Screenshot {frame + 1}/4
                            </p>
                            <div className="grid grid-cols-3 gap-1">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className={`h-8 border ${
                                            i === frame % 3
                                                ? "border-brand/40 bg-brand/20"
                                                : "border-white/8 bg-white/[0.04]"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-3 space-y-1.5">
                    {BROWSER_STEPS.map((step, i) => {
                        const done = i < frame
                        const live = i === frame
                        return (
                            <div
                                key={step.label}
                                className={`flex items-center gap-2 border px-2.5 py-1.5 ${
                                    live
                                        ? "border-brand/30 bg-brand/10"
                                        : done
                                          ? "border-white/8 bg-white/[0.03]"
                                          : "border-white/8 bg-transparent opacity-50"
                                }`}
                            >
                                <span
                                    className={`flex h-3.5 w-3.5 items-center justify-center border ${
                                        done || live
                                            ? "border-brand bg-brand text-white"
                                            : "border-white/20"
                                    }`}
                                >
                                    {(done || live) && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                                </span>
                                <span className="text-[11px] text-brand-ink">{step.label}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </IllustrationFrame>
    )
}

/* ------------------------------------------------------------------ */
/* Analytics — every minute attributed                                 */
/* ------------------------------------------------------------------ */

const ANALYTICS_ROWS = [
    { source: "Slack", person: "maya", harness: "claude", model: "sonnet", min: 18 },
    { source: "Linear", person: "erik", harness: "codex", model: "gpt-5", min: 12 },
    { source: "API", person: "cron", harness: "dsh", model: "v3.1", min: 41 },
    { source: "GitHub", person: "lucas", harness: "gemini", model: "2.5-pro", min: 9 },
    { source: "CLI", person: "maya", harness: "opencode", model: "kimi", min: 7 },
]

export function AnalyticsIllustration() {
    const [active, setActive] = useState(0)

    useEffect(() => {
        const id = setInterval(() => setActive((n) => (n + 1) % ANALYTICS_ROWS.length), 1600)
        return () => clearInterval(id)
    }, [])

    const total = ANALYTICS_ROWS.reduce((sum, row) => sum + row.min, 0)

    return (
        <IllustrationFrame>
            <div className={`relative w-full min-w-0 overflow-hidden ${framedPanel}`}>
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                    <p className="text-[11px] font-semibold text-brand-ink">Machine-minutes · today</p>
                    <p className="font-mono text-[11px] tabular-nums text-brand">{total} min</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-80 text-left font-mono text-[10px]">
                        <thead>
                            <tr className="border-b border-white/8 text-slate-500">
                                <th className="px-4 py-2 font-medium">Source</th>
                                <th className="px-2 py-2 font-medium">Person</th>
                                <th className="px-2 py-2 font-medium">Harness</th>
                                <th className="px-2 py-2 font-medium">Model</th>
                                <th className="px-4 py-2 text-right font-medium">Min</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ANALYTICS_ROWS.map((row, i) => (
                                <tr
                                    key={`${row.source}-${row.person}`}
                                    className={`border-b border-white/6 transition-colors ${
                                        i === active ? "bg-brand/12" : "bg-transparent"
                                    }`}
                                >
                                    <td className="px-4 py-2 text-brand-ink">{row.source}</td>
                                    <td className="px-2 py-2 text-slate-500">{row.person}</td>
                                    <td className="px-2 py-2 text-brand-soft">{row.harness}</td>
                                    <td className="px-2 py-2 text-slate-500">{row.model}</td>
                                    <td className="px-4 py-2 text-right tabular-nums text-brand-ink">{row.min}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5">
                    <span className="text-[10px] text-slate-500">Attributed to credential · org/prod</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-brand">
                        <GitPullRequest className="h-3 w-3" /> 11 PRs merged
                    </span>
                </div>
            </div>
        </IllustrationFrame>
    )
}

/* ------------------------------------------------------------------ */
/* Manifest — $ cat dupli.md                                        */
/* ------------------------------------------------------------------ */

const MANIFEST_LINES = [
    { kind: "h1", text: "# The Cloud Coding Agent" },
    { kind: "kv", text: "backed-by: isolation, not a shared box" },
    { kind: "blank", text: "" },
    { kind: "quote", text: "> One machine per agent. Delegate from Slack, Linear, GitHub or the API." },
    { kind: "blank", text: "" },
    { kind: "li", text: "* [Get Started](/auth/signup)" },
    { kind: "li", text: "* [How It Works](/docs)" },
    { kind: "blank", text: "" },
    { kind: "h2", text: "## 01 | How it works" },
    { kind: "li", text: "* delegate — Linear, Slack, GitHub, GitLab, dashboard, CLI" },
    { kind: "li", text: "* sandbox — Claude Code, Codex, dsh, opencode, each on its own VM" },
    { kind: "li", text: "* pull_request — a diff, a reply, a recording. Merge or send it again." },
]

export function ManifestIllustration() {
    const [revealed, setRevealed] = useState(0)

    useEffect(() => {
        const id = setInterval(() => {
            setRevealed((n) => (n >= MANIFEST_LINES.length ? 0 : n + 1))
        }, 280)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="relative h-90 w-full min-w-0 overflow-hidden border border-white/10 bg-[#0B0B0E]">
            <div
                className="pointer-events-none absolute inset-0 opacity-70"
                aria-hidden
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 15% 0%, rgba(255,132,55,0.22), transparent 62%)",
                }}
            />
            <div className="relative flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
                <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wide text-white/45">
                    dupli.md
                </span>
            </div>
            <div className="relative h-[calc(100%-2.75rem)] overflow-hidden px-4 py-4 font-mono text-[11px] leading-relaxed">
                <p className="text-white/85">
                    <span className="mr-2 text-brand">$</span>cat dupli.md
                </p>
                <div className="mt-3 space-y-1">
                    {MANIFEST_LINES.slice(0, revealed).map((line, i) => {
                        const color =
                            line.kind === "h1" || line.kind === "h2"
                                ? "text-brand-ink"
                                : line.kind === "quote"
                                  ? "text-brand-soft"
                                  : line.kind === "kv"
                                    ? "text-slate-500"
                                    : "text-white/70"
                        return (
                            <p
                                key={`${line.text}-${i}`}
                                className={`${color} whitespace-pre-wrap`}
                                style={{ animation: "row-in 220ms ease-out forwards" }}
                            >
                                {line.text || "\u00a0"}
                            </p>
                        )
                    })}
                    {revealed < MANIFEST_LINES.length && (
                        <span className="inline-block h-3 w-1.5 translate-y-px bg-brand animate-[caret-blink_1s_step-end_infinite]" />
                    )}
                </div>
            </div>
        </div>
    )
}
