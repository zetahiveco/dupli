import {
    Activity,
    BarChart3,
    Boxes,
    GitPullRequest,
    Layers,
    MonitorPlay,
    Server,
    ShieldCheck,
    SlidersHorizontal,
    Terminal,
    Webhook,
    Workflow,
    type LucideIcon,
} from "lucide-react"

const brandAccent = "border-brand/30 bg-brand/10 text-brand"
const plainAccent = "border-white/15 bg-white/[0.05] text-white/75"

export type Capability = {
    id: string
    label: string
    href: string
    icon: LucideIcon
    /** Short description used on the landing cards */
    blurb: string
    /** One-line nav description */
    nav: string
    /** Config keys surfaced on the card footer */
    fields: string[]
    accent: string
}

export const CAPABILITIES: Capability[] = [
    {
        id: "isolation",
        label: "One VM Per Agent",
        href: "/#isolation",
        icon: Server,
        blurb:
            "Every task boots its own Linux machine. Agents install packages, drop databases and break things without touching your laptop or anybody else's run.",
        nav: "A dedicated Linux machine per task",
        fields: ["image", "vcpu", "memory", "ttl"],
        accent: brandAccent,
    },
    {
        id: "environments",
        label: "Warm Environments",
        href: "/#environments",
        icon: Boxes,
        blurb:
            "Configure the box once. Warm hooks preinstall dependencies, seed databases and start services so an agent is writing code seconds after it is assigned.",
        nav: "Dependencies and services preinstalled",
        fields: ["setup", "services", "cache", "boot_ms"],
        accent: plainAccent,
    },
    {
        id: "harnesses",
        label: "Any Harness, Any Model",
        href: "/#harnesses",
        icon: Terminal,
        blurb:
            "Claude Code, Codex, DeepSeek Harness, opencode or Gemini CLI — same environment primitives underneath, your own API keys on top.",
        nav: "Five harnesses on one runtime",
        fields: ["harness", "model", "byok", "version"],
        accent: brandAccent,
    },
    {
        id: "computer-use",
        label: "Real Computer Use",
        href: "/#computer-use",
        icon: MonitorPlay,
        blurb:
            "Agents drive a real desktop and browser to check their own work, then hand back screenshots and screen recordings alongside the diff.",
        nav: "A real desktop, browser and recorder",
        fields: ["browser", "screenshot", "recording", "viewport"],
        accent: plainAccent,
    },
    {
        id: "fleet",
        label: "Fleet Orchestration",
        href: "/#fleet",
        icon: Workflow,
        blurb:
            "Run one task across four harnesses, or forty tasks in parallel. Each gets its own branch, its own machine and its own reviewable output.",
        nav: "Parallel runs, branches and queues",
        fields: ["parallel", "queue", "branch", "strategy"],
        accent: brandAccent,
    },
    {
        id: "analytics",
        label: "Minute-Level Attribution",
        href: "/#analytics",
        icon: BarChart3,
        blurb:
            "Every minute of runtime is attributable to a person, a source, a harness, a model, the credential that paid for it and the tools the agent reached for.",
        nav: "Where every runtime minute went",
        fields: ["minutes", "actor", "model", "credential"],
        accent: plainAccent,
    },
]

export type Surface = {
    id: string
    label: string
    href: string
    icon: LucideIcon
    description: string
    detail: string
}

/** Where work gets handed to an agent. */
export const SURFACES: Surface[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        href: "/#surfaces",
        icon: Layers,
        description: "Chat, watch the diff, steer the plan",
        detail:
            "Pair with a run in the browser. Read the diff as it lands, interrupt with a correction, or take the shell yourself.",
    },
    {
        id: "slack",
        label: "Slack",
        href: "/#surfaces",
        icon: Activity,
        description: "Start a run from any channel",
        detail:
            "Mention Dupli in the thread where the bug was reported. The run replies in that thread with a branch and a summary.",
    },
    {
        id: "linear",
        label: "Linear",
        href: "/#surfaces",
        icon: SlidersHorizontal,
        description: "Turn issues into running agents",
        detail:
            "Assign a ticket to Dupli and it reads the description, gathers context from the repo and opens a pull request against it.",
    },
    {
        id: "git",
        label: "GitHub & GitLab",
        href: "/#surfaces",
        icon: GitPullRequest,
        description: "Tag it on a PR or an issue",
        detail:
            "Comment on a review thread and the agent investigates in a fresh machine, runs the suite and pushes a fixup commit.",
    },
    {
        id: "api",
        label: "Automations & API",
        href: "/#api",
        icon: Webhook,
        description: "Schedules, webhooks and one REST call",
        detail:
            "Fire a run from cron, a webhook or POST /v1/runs. Nightly lint sweeps and dependency bumps with nobody in the room.",
    },
    {
        id: "cli",
        label: "CLI",
        href: "/#api",
        icon: Terminal,
        description: "Delegate from the terminal you live in",
        detail:
            "`dupli run` hands the current branch to a cloud machine and streams the log back, so you keep working locally.",
    },
]

export type Harness = {
    id: string
    name: string
    vendor: string
    note: string
    /** Command Dupli runs inside the machine */
    command: string
}

export const HARNESSES: Harness[] = [
    {
        id: "claude-code",
        name: "Claude Code",
        vendor: "Anthropic",
        note: "Long-horizon refactors and codebase-wide edits.",
        command: "claude -p",
    },
    {
        id: "codex",
        name: "Codex",
        vendor: "OpenAI",
        note: "Tight, test-driven loops on a scoped diff.",
        command: "codex exec",
    },
    {
        id: "deepseek-harness",
        name: "DeepSeek Harness",
        vendor: "DeepSeek",
        note: "Everything-is-a-plugin runtime, swap the loop itself.",
        command: "dsh --headless",
    },
    {
        id: "opencode",
        name: "opencode",
        vendor: "Open source",
        note: "Provider-agnostic, good for BYOK and local models.",
        command: "opencode run",
    },
    {
        id: "gemini-cli",
        name: "Gemini CLI",
        vendor: "Google",
        note: "Very large context windows for whole-repo reads.",
        command: "gemini -p",
    },
]

export type EnterpriseControl = {
    label: string
    detail: string
    icon: LucideIcon
}

export const ENTERPRISE_CONTROLS: EnterpriseControl[] = [
    {
        label: "SOC 2 Type II",
        detail: "Type I and Type II in progress. Report available under NDA.",
        icon: ShieldCheck,
    },
    {
        label: "SAML SSO & SCIM",
        detail: "Okta, Entra ID or any SAML provider, with directory-synced deprovisioning.",
        icon: ShieldCheck,
    },
    {
        label: "Scoped credentials",
        detail: "Per-environment secrets, short-lived git tokens and an egress allowlist per machine.",
        icon: ShieldCheck,
    },
    {
        label: "Audit log export",
        detail: "Every prompt, tool call, shell command and merge streamed to your SIEM.",
        icon: ShieldCheck,
    },
]
