"use server"

import { requireOrg, appUrl } from "@/services/auth"
import {
    createAutomation,
    deleteAutomation,
    listAutomations,
    updateAutomation,
    type NewWorkspaceConfig,
} from "@/services/automations"
import { NeedsApiKeyError, runAutomation } from "@/services/automation-run"
import { connectedTriggerMap } from "@/services/integrations/connected"
import type { AutomationTrigger, AutomationWorkspace } from "../../../../generated/prisma/enums"

export async function listOrgAutomations() {
    const { orgId } = await requireOrg()
    const rows = await listAutomations(orgId)
    const base = appUrl()
    return rows.map((row) => ({
        ...row,
        webhookUrl: `${base}/api/v1/automations/${row.id}`,
        webhookSecret: typeof row.integrationConfig.secret === "string" ? row.integrationConfig.secret : "",
        apiUrl: `${base}/api/v1/automations/run`,
    }))
}

export async function listConnectedAutomationTriggers() {
    const { orgId } = await requireOrg()
    return connectedTriggerMap(orgId)
}

export async function runOrgAutomation(id: string) {
    const { orgId } = await requireOrg()
    try {
        const result = await runAutomation({ organizationId: orgId, automationId: id })
        return { ...result, needsApiKey: false as const }
    } catch (error) {
        if (error instanceof NeedsApiKeyError) {
            return { workspaceId: null, needsApiKey: true as const, harness: error.harness }
        }
        throw error
    }
}

export async function createOrgAutomation(input: {
    name: string
    prompt: string
    trigger: AutomationTrigger
    workspaceAction: AutomationWorkspace
    workspaceId?: string | null
    cron?: string | null
    newWorkspaceConfig?: NewWorkspaceConfig
}) {
    const { orgId, userId } = await requireOrg()
    return createAutomation({
        organizationId: orgId,
        userId,
        ...input,
    })
}

export async function toggleAutomation(id: string, isRunning: boolean) {
    const { orgId } = await requireOrg()
    return updateAutomation(orgId, id, { isRunning })
}

export async function removeAutomation(id: string) {
    const { orgId } = await requireOrg()
    await deleteAutomation(orgId, id)
    return { success: true }
}
