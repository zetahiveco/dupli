import type { AutomationTrigger } from "../../../generated/prisma/enums"

export const NANGO_PROVIDERS = [
    { id: "slack", name: "Slack", description: "Slash commands only. Type /dupli for workspaces and automations.", icon: "/integrations/slack.svg" },
    { id: "github", name: "GitHub", trigger: "VIA_GITHUB" as const, description: "Issues, PRs and comments", icon: "/integrations/github.svg" },
    { id: "gitlab", name: "GitLab", trigger: "VIA_GITLAB" as const, description: "Merge requests and issues", icon: "/integrations/gitlab.svg" },
    { id: "bitbucket", name: "Bitbucket", trigger: "VIA_BITBUCKET" as const, description: "PRs and workspace events", icon: "/integrations/bitbucket.svg" },
    { id: "linear", name: "Linear", trigger: "VIA_LINEAR" as const, description: "Assign issues to an agent", icon: "/integrations/linear.svg" },
    { id: "sentry", name: "Sentry", trigger: "VIA_SENTRY" as const, description: "Turn errors into runs", icon: "/integrations/sentry.svg" },
] as const

export type NangoProviderId = (typeof NANGO_PROVIDERS)[number]["id"]

const INTEGRATION_TRIGGERS = new Set<AutomationTrigger>([
    "VIA_GITHUB",
    "VIA_GITLAB",
    "VIA_BITBUCKET",
    "VIA_LINEAR",
    "VIA_SENTRY",
])

export function triggerNeedsIntegration(trigger: AutomationTrigger) {
    return INTEGRATION_TRIGGERS.has(trigger)
}

export function triggerIntegrationName(trigger: AutomationTrigger) {
    return NANGO_PROVIDERS.find((item) => "trigger" in item && item.trigger === trigger)?.name ?? trigger
}

export function oursFromNangoKey(key: string, provider?: string) {
    const values = [key, provider]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase())
    const exact = NANGO_PROVIDERS.find((item) => values.includes(item.id))
    if (exact) return exact.id
    return NANGO_PROVIDERS.find((item) => values.some((value) => value.startsWith(`${item.id}-`)))?.id ?? null
}

export function integrationTriggers() {
    return [...INTEGRATION_TRIGGERS]
}
