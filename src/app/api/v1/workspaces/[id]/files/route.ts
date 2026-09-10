import { NextResponse } from "next/server"
import { getWorkspace, uploadWorkspaceBytes } from "@/services/workspace"
import { apiOrg, jsonError } from "../../../common"

const MAX_BYTES = 20 * 1024 * 1024

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error
    const { id } = await params

    const workspace = await getWorkspace(auth.org.organizationId, id)
    if (!workspace) return jsonError("Workspace not found", 404)

    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) return jsonError("multipart file is required")

    const form = await req.formData()
    const dir = String(form.get("path") || "")
    const incoming = form.getAll("file").concat(form.getAll("files"))
    const files = incoming.filter((item): item is File => item instanceof File)
    if (!files.length) return jsonError("file is required")

    try {
        const uploaded = []
        for (const file of files) {
            if (file.size > MAX_BYTES) return jsonError(`${file.name} must be 20MB or smaller`)
            uploaded.push(
                await uploadWorkspaceBytes(
                    auth.org.organizationId,
                    id,
                    file.name,
                    Buffer.from(await file.arrayBuffer()),
                    dir,
                ),
            )
        }
        return NextResponse.json({ files: uploaded })
    } catch (error) {
        return jsonError(error, error instanceof Error && error.message === "Workspace not found" ? 404 : 500)
    }
}
