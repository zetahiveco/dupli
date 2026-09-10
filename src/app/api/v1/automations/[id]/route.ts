import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { readBearer } from "@/services/auth"
import { NeedsApiKeyError, runAutomation } from "@/services/automation-run"
import { InsufficientMinutesError } from "@/services/common/billing"
import { deleteAutomation, getAutomation, updateAutomation } from "@/services/automations"
import type { AutomationTrigger, AutomationWorkspace } from "../../../../../../generated/prisma/enums"
import { apiOrg, jsonError, publicAutomation } from "../../common"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const { id } = await params
    const automation = await getAutomation(auth.org.organizationId, id)
    if (!automation) return jsonError("Automation not found", 404)
    return NextResponse.json({ automation: publicAutomation(automation) })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const { id } = await params
    let body: Partial<{
        name: string
        prompt: string
        trigger: AutomationTrigger
        workspaceAction: AutomationWorkspace
        workspaceId: string | null
        cron: string | null
        isRunning: boolean
    }>
    try {
        body = await req.json()
    } catch {
        return jsonError("Invalid JSON")
    }
    try {
        const automation = await updateAutomation(auth.org.organizationId, id, body)
        return NextResponse.json({ automation: publicAutomation(automation) })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed"
        const status = message === "Automation not found"
            ? 404
            : message.includes("Connect ")
                ? 409
                : message.includes("not an automation trigger")
                    ? 400
                    : 500
        return jsonError(error, status)
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const { id } = await params
    await deleteAutomation(auth.org.organizationId, id)
    return NextResponse.json({ success: true })
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params
    const automation = await prisma.automation.findUnique({ where: { id } })
    if (!automation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const url = new URL(req.url)
    const secret =
        url.searchParams.get("secret") ||
        req.headers.get("x-webhook-secret") ||
        readBearer(req)
    const stored = (automation.integrationConfig as { secret?: string } | null)?.secret
    const org = await prisma.organizationSettings.findUnique({
        where: { organizationId: automation.organizationId },
        select: { apiKey: true },
    })
    const allowed = Boolean(
        secret && (secret === stored || (org?.apiKey && secret === org.apiKey)),
    )
    if (!allowed) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let payload: unknown = null
    try {
        payload = await req.json()
    } catch {
        payload = null
    }

    try {
        const result = await runAutomation({
            organizationId: automation.organizationId,
            automationId: automation.id,
            payload,
        })
        return NextResponse.json(result)
    } catch (error) {
        if (error instanceof NeedsApiKeyError) {
            return NextResponse.json({ error: "API key required", harness: error.harness }, { status: 409 })
        }
        if (error instanceof InsufficientMinutesError) {
            return NextResponse.json({ error: error.message }, { status: 402 })
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed" },
            { status: 500 },
        )
    }
}
