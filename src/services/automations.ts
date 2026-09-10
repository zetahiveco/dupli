import { prisma } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"
import type { AutomationTrigger, AutomationWorkspace, Harness } from "../../generated/prisma/enums"
import type { Prisma } from "../../generated/prisma/client"
import { assertTriggerConnected } from "./integrations/connected"

export type NewWorkspaceConfig = {
    name?: string
    harness?: Harness
    api_key?: string
}

export type AutomationRecord = {
    id: string
    organizationId: string
    userId: string
    integrationConfig: Record<string, unknown>
    trigger: AutomationTrigger
    workspaceAction: AutomationWorkspace
    name: string
    prompt: string
    workspaceId: string | null
    newWorkspaceConfig: NewWorkspaceConfig
    cron: string | null
    isRunning: boolean
    nextRunAt: Date | null
    createdAt: Date
    updatedAt: Date
}

function asObject(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
    return raw as Record<string, unknown>
}

function toRecord(row: {
    id: string
    organizationId: string
    userId: string
    integrationConfig: unknown
    trigger: AutomationTrigger
    workspaceAction: AutomationWorkspace
    name: string
    prompt: string
    workspaceId: string | null
    newWorkspaceConfig: unknown
    cron: string | null
    isRunning: boolean
    nextRunAt: Date | null
    createdAt: Date
    updatedAt: Date
}): AutomationRecord {
    return {
        ...row,
        integrationConfig: asObject(row.integrationConfig),
        newWorkspaceConfig: asObject(row.newWorkspaceConfig) as NewWorkspaceConfig,
    }
}

export async function getAutomation(organizationId: string, id: string) {
    const row = await prisma.automation.findFirst({
        where: { id, organizationId },
        include: { workspace: true },
    })
    if (!row) return null
    return {
        ...toRecord(row),
        workspaceName: row.workspace?.name ?? null,
    }
}

export async function listDueCronAutomations(now = new Date()) {
    const rows = await prisma.automation.findMany({
        where: {
            trigger: "VIA_CRON",
            isRunning: true,
            nextRunAt: { lte: now },
        },
    })
    return rows.map(toRecord)
}

export async function listAutomationsByTrigger(organizationId: string, trigger: AutomationTrigger) {
    const rows = await prisma.automation.findMany({
        where: { organizationId, trigger, isRunning: true },
    })
    return rows.map(toRecord)
}

export async function listAutomations(organizationId: string) {
    const rows = await prisma.automation.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        include: { workspace: true },
    })
    return rows.map((row) => ({
        ...toRecord(row),
        workspaceName: row.workspace?.name ?? null,
    }))
}

export async function createAutomation(input: {
    organizationId: string
    userId: string
    name: string
    prompt: string
    trigger: AutomationTrigger
    workspaceAction: AutomationWorkspace
    workspaceId?: string | null
    cron?: string | null
    integrationConfig?: Record<string, unknown>
    newWorkspaceConfig?: NewWorkspaceConfig
}) {
    const newWorkspaceConfig = input.newWorkspaceConfig ?? {}

    if (input.trigger === "VIA_SLACK") {
        throw new Error("Slack is not an automation trigger. Type /dupli in Slack to manage workspaces and automations.")
    }
    await assertTriggerConnected(input.organizationId, input.trigger)

    const row = await prisma.automation.create({
        data: {
            id: uuidv4(),
            organizationId: input.organizationId,
            userId: input.userId,
            name: input.name,
            prompt: input.prompt,
            trigger: input.trigger,
            workspaceAction: input.workspaceAction,
            workspaceId: input.workspaceAction === "USE_EXISTING" ? input.workspaceId || null : null,
            cron: input.trigger === "VIA_CRON" ? input.cron || null : null,
            integrationConfig: ({
                secret: uuidv4(),
                ...(input.integrationConfig ?? {}),
            }) as Prisma.InputJsonValue,
            newWorkspaceConfig: newWorkspaceConfig as Prisma.InputJsonValue,
            nextRunAt:
                input.trigger === "VIA_CRON" && input.cron
                    ? new Date(Date.now() + 60 * 60 * 1000)
                    : null,
        },
    })
    return toRecord(row)
}

export async function updateAutomation(
    organizationId: string,
    id: string,
    data: Partial<{
        name: string
        prompt: string
        trigger: AutomationTrigger
        workspaceAction: AutomationWorkspace
        workspaceId: string | null
        cron: string | null
        integrationConfig: Record<string, unknown>
        newWorkspaceConfig: NewWorkspaceConfig
        isRunning: boolean
    }>,
) {
    const existing = await prisma.automation.findFirst({ where: { id, organizationId } })
    if (!existing) throw new Error("Automation not found")
    if (data.trigger === "VIA_SLACK") {
        throw new Error("Slack is not an automation trigger. Type /dupli in Slack to manage workspaces and automations.")
    }
    if (data.trigger) await assertTriggerConnected(organizationId, data.trigger)
    const row = await prisma.automation.update({
        where: { id },
        data: {
            ...data,
            integrationConfig: data.integrationConfig
                ? (data.integrationConfig as Prisma.InputJsonValue)
                : undefined,
            newWorkspaceConfig: data.newWorkspaceConfig
                ? (data.newWorkspaceConfig as Prisma.InputJsonValue)
                : undefined,
        },
    })
    return toRecord(row)
}

export async function deleteAutomation(organizationId: string, id: string) {
    const existing = await prisma.automation.findFirst({ where: { id, organizationId } })
    if (!existing) return
    await prisma.automation.delete({ where: { id } })
}
