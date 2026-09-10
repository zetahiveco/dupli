import { prisma } from "@/lib/db"
import type { Prisma } from "../../../generated/prisma/client"

export type SlackBotState = {
    workspaceId?: string
    expect?: "chat" | "action_create" | "action_edit"
    automationId?: string
    processed?: string[]
    cursor?: Record<string, string>
}

export type NangoSavedConnection = {
    connectionId: string
    providerConfigKey: string
    teamId?: string
    botUserId?: string
}

export type IntegrationsConfig = {
    nango?: Record<string, NangoSavedConnection>
    slackBot?: SlackBotState
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parseIntegrationsConfig(raw: unknown): IntegrationsConfig {
    if (!isRecord(raw)) return {}
    return {
        nango: isRecord(raw.nango) ? (raw.nango as Record<string, NangoSavedConnection>) : undefined,
        slackBot: isRecord(raw.slackBot) ? (raw.slackBot as SlackBotState) : undefined,
    }
}

export function mergeIntegrationsConfig(primary: IntegrationsConfig, fallback: IntegrationsConfig): IntegrationsConfig {
    const nango = { ...(fallback.nango ?? {}), ...(primary.nango ?? {}) }
    return {
        nango: Object.keys(nango).length > 0 ? nango : undefined,
        slackBot: primary.slackBot ?? fallback.slackBot,
    }
}

export function integrationsFromSettings(settings: {
    integrationsConfig?: unknown
    environmentVariables?: unknown
} | null): IntegrationsConfig {
    return mergeIntegrationsConfig(
        parseIntegrationsConfig(settings?.integrationsConfig),
        parseIntegrationsConfig(settings?.environmentVariables),
    )
}

export function hasConnectedIntegration(config: IntegrationsConfig) {
    return Object.values(config.nango ?? {}).some((row) => Boolean(row?.connectionId))
}

export async function getIntegrationsConfig(organizationId: string): Promise<IntegrationsConfig> {
    const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId },
        select: { integrationsConfig: true, environmentVariables: true },
    })
    return integrationsFromSettings(settings)
}

export async function saveIntegrationsConfig(organizationId: string, config: IntegrationsConfig) {
    const data = { integrationsConfig: config as Prisma.InputJsonValue }
    await prisma.organizationSettings.upsert({
        where: { organizationId },
        create: { organizationId, ...data },
        update: data,
    })
}
