import { NextResponse } from "next/server"
import { getWorkspace, NeedsApiKeyError, sendWorkspaceMessage, uploadWorkspaceBytes } from "@/services/workspace"
import { InsufficientMinutesError } from "@/services/common/billing"
import { apiOrg, apiUserId, jsonError, publicWorkspace } from "../../../common"

const MAX_BYTES = 20 * 1024 * 1024

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const { id } = await params
    const workspace = await getWorkspace(auth.org.organizationId, id)
    if (!workspace) return jsonError("Workspace not found", 404)
    return NextResponse.json({ messages: workspace.messages })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const { id } = await params

    const workspace = await getWorkspace(auth.org.organizationId, id)
    if (!workspace) return jsonError("Workspace not found", 404)

    let content = ""
    let model: string | undefined
    const uploaded: { path: string; name: string }[] = []

    const contentType = req.headers.get("content-type") || ""
    if (contentType.includes("multipart/form-data")) {
        const form = await req.formData()
        content = String(form.get("content") || "")
        const modelValue = form.get("model")
        if (typeof modelValue === "string" && modelValue.trim()) model = modelValue.trim()
        const dir = String(form.get("path") || "")
        const files = form.getAll("file").concat(form.getAll("files"))
        for (const file of files) {
            if (!(file instanceof File)) continue
            if (file.size > MAX_BYTES) return jsonError(`${file.name} must be 20MB or smaller`)
            try {
                uploaded.push(
                    await uploadWorkspaceBytes(
                        auth.org.organizationId,
                        id,
                        file.name,
                        Buffer.from(await file.arrayBuffer()),
                        dir,
                    ),
                )
            } catch (error) {
                return jsonError(error, 500)
            }
        }
    } else {
        let body: { content?: string; model?: string }
        try {
            body = await req.json()
        } catch {
            return jsonError("Invalid JSON")
        }
        content = body.content || ""
        model = body.model
    }

    if (!content.trim()) return jsonError("content is required")

    try {
        const updated = await sendWorkspaceMessage({
            organizationId: auth.org.organizationId,
            userId: await apiUserId(auth.org.organizationId),
            workspaceId: id,
            content: content.trim(),
            model,
        })
        return NextResponse.json({
            workspace: publicWorkspace(updated),
            ...(uploaded.length ? { files: uploaded } : {}),
        })
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
