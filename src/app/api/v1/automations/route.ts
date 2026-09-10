import { NextResponse } from "next/server"
import {
    createAutomation,
    listAutomations,
    type NewWorkspaceConfig,
} from "@/services/automations"
import type { AutomationTrigger, AutomationWorkspace } from "../../../../../generated/prisma/enums"
import { apiOrg, apiUserId, jsonError, publicAutomation } from "../common"

export async function GET(req: Request) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const rows = await listAutomations(auth.org.organizationId)
    return NextResponse.json({ automations: rows.map(publicAutomation) })
}

export async function POST(req: Request) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error

    let body: {
        name?: string
        prompt?: string
        trigger?: AutomationTrigger
        workspaceAction?: AutomationWorkspace
        workspaceId?: string | null
        cron?: string | null
        newWorkspaceConfig?: NewWorkspaceConfig
    }
    try {
        body = await req.json()
    } catch {
        return jsonError("Invalid JSON")
    }
    if (!body.trigger) return jsonError("trigger is required")
    if (!body.prompt?.trim()) return jsonError("prompt is required")

    try {
        const automation = await createAutomation({
            organizationId: auth.org.organizationId,
            userId: await apiUserId(auth.org.organizationId),
            name: body.name?.trim() || "Untitled automation",
            prompt: body.prompt.trim(),
            trigger: body.trigger,
            workspaceAction: body.workspaceAction || "USE_EXISTING",
            workspaceId: body.workspaceId,
            cron: body.cron,
            newWorkspaceConfig: body.newWorkspaceConfig,
        })
        return NextResponse.json({ automation: publicAutomation(automation) }, { status: 201 })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed"
        const status = message.includes("Connect ")
            ? 409
            : message.includes("not an automation trigger")
                ? 400
                : 500
        return jsonError(error, status)
    }
}
