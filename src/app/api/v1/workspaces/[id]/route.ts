import { NextResponse } from "next/server"
import { deleteWorkspace, getWorkspace, renameWorkspace } from "@/services/workspace"
import { apiOrg, jsonError, publicWorkspace } from "../../common"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const { id } = await params
    const workspace = await getWorkspace(auth.org.organizationId, id)
    if (!workspace) return jsonError("Workspace not found", 404)
    return NextResponse.json({ workspace: publicWorkspace(workspace) })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const { id } = await params
    let body: { name?: string }
    try {
        body = await req.json()
    } catch {
        return jsonError("Invalid JSON")
    }
    if (!body.name?.trim()) return jsonError("name is required")
    try {
        const workspace = await renameWorkspace(auth.org.organizationId, id, body.name.trim())
        return NextResponse.json({ workspace: publicWorkspace(workspace) })
    } catch (error) {
        return jsonError(error, error instanceof Error && error.message === "Workspace not found" ? 404 : 500)
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const { id } = await params
    await deleteWorkspace(auth.org.organizationId, id)
    return NextResponse.json({ success: true })
}
