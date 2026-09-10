import { NextResponse } from "next/server"
import { requireOrgApiKey } from "@/services/auth"
import { NeedsApiKeyError, runAutomation } from "@/services/automation-run"
import { InsufficientMinutesError } from "@/services/common/billing"

export async function POST(req: Request) {
    let org
    try {
        org = await requireOrgApiKey(req)
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unauthorized" },
            { status: 401 },
        )
    }

    let body: { automationId?: string; payload?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    if (!body.automationId) {
        return NextResponse.json({ error: "automationId is required" }, { status: 400 })
    }

    try {
        const result = await runAutomation({
            organizationId: org.organizationId,
            automationId: body.automationId,
            payload: body.payload,
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
