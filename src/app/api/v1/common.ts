import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { appUrl, requireOrgApiKey } from "@/services/auth"
import type { WorkspaceRecord } from "@/services/workspace"
import type { AutomationRecord } from "@/services/automations"

export async function apiOrg(req: Request) {
    try {
        const org = await requireOrgApiKey(req)
        return { org }
    } catch (error) {
        return {
            error: NextResponse.json(
                { error: error instanceof Error ? error.message : "Unauthorized" },
                { status: 401 },
            ),
        }
    }
}

export async function apiUserId(organizationId: string) {
    const workspace = await prisma.workspace.findFirst({
        where: { organizationId },
        select: { userId: true },
    })
    if (workspace?.userId) return workspace.userId
    const automation = await prisma.automation.findFirst({
        where: { organizationId },
        select: { userId: true },
    })
    return automation?.userId || organizationId
}

export function publicWorkspace(row: WorkspaceRecord) {
    return {
        id: row.id,
        name: row.name,
        harness: row.harness,
        running: Boolean(row.sandboxId),
        messages: row.messages,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    }
}

export function publicAutomation(row: AutomationRecord & { workspaceName?: string | null }) {
    const secret = typeof row.integrationConfig.secret === "string" ? row.integrationConfig.secret : ""
    const base = appUrl()
    return {
        id: row.id,
        name: row.name,
        prompt: row.prompt,
        trigger: row.trigger,
        workspaceAction: row.workspaceAction,
        workspaceId: row.workspaceId,
        workspaceName: row.workspaceName ?? null,
        cron: row.cron,
        isRunning: row.isRunning,
        nextRunAt: row.nextRunAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        webhookUrl: `${base}/api/v1/automations/${row.id}`,
        webhookSecret: secret,
        runUrl: `${base}/api/v1/automations/run`,
    }
}

export function jsonError(error: unknown, status = 400) {
    return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed" },
        { status },
    )
}
