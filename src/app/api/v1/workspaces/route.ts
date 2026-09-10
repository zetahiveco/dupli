import { NextResponse } from "next/server"
import { createWorkspace, listWorkspaces, NeedsApiKeyError } from "@/services/workspace"
import { InsufficientMinutesError } from "@/services/common/billing"
import type { Harness } from "../../../../../generated/prisma/enums"
import { apiOrg, apiUserId, jsonError, publicWorkspace } from "../common"

export async function GET(req: Request) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const rows = await listWorkspaces(auth.org.organizationId)
    return NextResponse.json({ workspaces: rows.map(publicWorkspace) })
}

export async function POST(req: Request) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error

    let body: { name?: string; harness?: Harness }
    try {
        body = await req.json()
    } catch {
        return jsonError("Invalid JSON")
    }
    if (!body.harness) return jsonError("harness is required")

    try {
        const workspace = await createWorkspace({
            organizationId: auth.org.organizationId,
            userId: await apiUserId(auth.org.organizationId),
            name: body.name || "Untitled",
            harness: body.harness,
        })
        return NextResponse.json({ workspace: publicWorkspace(workspace) }, { status: 201 })
    } catch (error) {
        if (error instanceof NeedsApiKeyError) {
            return NextResponse.json({ error: "API key required", harness: error.harness }, { status: 409 })
        }
        if (error instanceof InsufficientMinutesError) {
            return jsonError(error, 402)
        }
        return jsonError(error, 500)
    }
}
