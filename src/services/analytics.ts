import { prisma } from "@/lib/db"
import { harnessName } from "./harness"

export async function getAnalytics(organizationId: string) {
    const [workspaces, automations, keys] = await Promise.all([
        prisma.workspace.findMany({
            where: { organizationId },
            select: { harness: true, createdAt: true, updatedAt: true, messages: true },
        }),
        prisma.automation.findMany({
            where: { organizationId },
            select: { trigger: true, isRunning: true, createdAt: true },
        }),
        prisma.apiKey.count({ where: { organizationId } }),
    ])

    const byHarness: Record<string, number> = {}
    let messageCount = 0
    for (const workspace of workspaces) {
        byHarness[workspace.harness] = (byHarness[workspace.harness] ?? 0) + 1
        if (Array.isArray(workspace.messages)) messageCount += workspace.messages.length
    }

    const byTrigger: Record<string, number> = {}
    for (const automation of automations) {
        byTrigger[automation.trigger] = (byTrigger[automation.trigger] ?? 0) + 1
    }

    return {
        workspaceCount: workspaces.length,
        automationCount: automations.length,
        runningAutomations: automations.filter((item) => item.isRunning).length,
        messageCount,
        harnessKeys: keys,
        harnesses: Object.entries(byHarness).map(([id, count]) => ({
            id,
            name: harnessName(id as never),
            count,
        })),
        triggers: Object.entries(byTrigger).map(([id, count]) => ({ id, count })),
        recent: workspaces
            .slice()
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 8)
            .map((row) => ({
                harness: harnessName(row.harness),
                updatedAt: row.updatedAt,
            })),
    }
}
