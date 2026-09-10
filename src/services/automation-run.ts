import { prisma } from "@/lib/db"
import { upsertHarnessKey } from "./api-keys"
import {
    getAutomation,
    listAutomationsByTrigger,
    type AutomationRecord,
} from "./automations"
import {
    createWorkspace,
    NeedsApiKeyError,
    sendWorkspaceMessage,
} from "./workspace"
import type { AutomationTrigger, Harness } from "../../generated/prisma/enums"

function interpolatePrompt(prompt: string, payload: unknown) {
    if (payload == null) return prompt
    const extra = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)
    if (!extra || extra === "{}" || extra === "null") return prompt
    return `${prompt}\n\nIncoming event:\n${extra.slice(0, 12000)}`
}

function nextCronDate(cron: string | null, from = new Date()) {
    if (!cron) return new Date(from.getTime() + 60 * 60 * 1000)
    const parts = cron.trim().split(/\s+/)
    if (parts.length >= 5) {
        const minute = Number(parts[0])
        const hour = Number(parts[1])
        if (Number.isFinite(minute) && Number.isFinite(hour) && parts[0] !== "*" && parts[1] !== "*") {
            const next = new Date(from)
            next.setSeconds(0, 0)
            next.setHours(hour, minute, 0, 0)
            if (next <= from) next.setDate(next.getDate() + 1)
            return next
        }
    }
    return new Date(from.getTime() + 60 * 60 * 1000)
}

async function markCronRan(id: string, cron: string | null) {
    await prisma.automation.update({
        where: { id },
        data: { nextRunAt: nextCronDate(cron) },
    })
}

export async function runAutomation(input: {
    organizationId: string
    automationId: string
    payload?: unknown
}) {
    const automation = await getAutomation(input.organizationId, input.automationId)
    if (!automation) throw new Error("Automation not found")
    return executeAutomation(automation, input.payload)
}

export async function runAutomationsForTrigger(input: {
    organizationId: string
    trigger: AutomationTrigger
    payload?: unknown
}) {
    const rows = await listAutomationsByTrigger(input.organizationId, input.trigger)
    const results = []
    for (const row of rows) {
        try {
            results.push(await executeAutomation(row, input.payload))
        } catch (error) {
            results.push({
                automationId: row.id,
                error: error instanceof Error ? error.message : "Failed",
            })
        }
    }
    return results
}

async function executeAutomation(automation: AutomationRecord, payload?: unknown) {
    const content = interpolatePrompt(automation.prompt, payload)
    let workspaceId = automation.workspaceId

    if (automation.workspaceAction === "CREATE_NEW" || !workspaceId) {
        const config = automation.newWorkspaceConfig ?? {}
        const harness = (config.harness ?? "CLAUDE_CODEX") as Harness
        if (config.api_key) {
            await upsertHarnessKey({
                organizationId: automation.organizationId,
                harness,
                apiKey: config.api_key,
            })
        }
        const workspace = await createWorkspace({
            organizationId: automation.organizationId,
            userId: automation.userId,
            name: config.name || automation.name,
            harness,
        })
        workspaceId = workspace.id
        if (automation.workspaceAction === "USE_EXISTING") {
            await prisma.automation.update({
                where: { id: automation.id },
                data: { workspaceId },
            })
        }
    }

    if (!workspaceId) throw new Error("Automation has no workspace")

    const workspace = await sendWorkspaceMessage({
        organizationId: automation.organizationId,
        userId: automation.userId,
        workspaceId,
        content,
    })

    if (automation.trigger === "VIA_CRON") {
        await markCronRan(automation.id, automation.cron)
    }

    return {
        automationId: automation.id,
        workspaceId: workspace.id,
        needsApiKey: false as const,
    }
}

export { NeedsApiKeyError }
