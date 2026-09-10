import { prisma } from "@/lib/db"
import type { Prisma } from "../../generated/prisma/client"
import { parseIntegrationsConfig, saveIntegrationsConfig } from "./integrations/config"

function asStringMap(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {}
    const out: Record<string, string> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (typeof entry === "string") out[key] = entry
    }
    return out
}

export function parseOrgVars(raw: unknown): Record<string, string> {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
    const o = raw as Record<string, unknown>
    if (o.vars && typeof o.vars === "object" && !Array.isArray(o.vars)) {
        return asStringMap(o.vars)
    }
    return asStringMap(o)
}

export function parseUserVars(raw: unknown): Record<string, string> {
    return asStringMap(raw)
}

export async function getOrgVars(organizationId: string): Promise<Record<string, string>> {
    const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId },
        select: { environmentVariables: true },
    })
    return parseOrgVars(settings?.environmentVariables)
}

export async function getMergedEnv(organizationId: string, userId: string) {
    const [org, user] = await Promise.all([
        getOrgVars(organizationId),
        prisma.userSettings.findUnique({
            where: { userId },
            select: { environmentVariables: true },
        }),
    ])
    return {
        ...org,
        ...parseUserVars(user?.environmentVariables),
    }
}

export async function setOrgVars(organizationId: string, vars: Record<string, string>) {
    const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId },
        select: { environmentVariables: true, integrationsConfig: true },
    })
    const leftover = parseIntegrationsConfig(settings?.environmentVariables)
    const existing = parseIntegrationsConfig(settings?.integrationsConfig)
    const shouldMigrate =
        (Object.keys(leftover.nango ?? {}).length > 0 || leftover.slackBot) &&
        Object.keys(existing.nango ?? {}).length === 0 &&
        !existing.slackBot

    const data = { environmentVariables: vars as Prisma.InputJsonValue }
    await prisma.organizationSettings.upsert({
        where: { organizationId },
        create: { organizationId, ...data },
        update: data,
    })
    if (shouldMigrate) await saveIntegrationsConfig(organizationId, leftover)
}

export async function setUserVars(userId: string, vars: Record<string, string>) {
    const data = { environmentVariables: vars as Prisma.InputJsonValue }
    await prisma.userSettings.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
    })
}

export async function getUserVars(userId: string) {
    const settings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { environmentVariables: true },
    })
    return parseUserVars(settings?.environmentVariables)
}
