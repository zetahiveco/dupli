import { NextResponse } from "next/server"
import { uploadFileToS3, getPresignedUrlForUpload } from "@/lib/file"
import { apiOrg, jsonError } from "../common"

const MAX_BYTES = 20 * 1024 * 1024

export async function POST(req: Request) {
    const auth = await apiOrg(req)
    if (auth.error) return auth.error

    const contentType = req.headers.get("content-type") || ""
    if (contentType.includes("multipart/form-data")) {
        const form = await req.formData()
        const file = form.get("file")
        if (!(file instanceof File)) return jsonError("file is required")
        if (file.size > MAX_BYTES) return jsonError("File must be 20MB or smaller")
        const key = await uploadFileToS3(Buffer.from(await file.arrayBuffer()), file.name)
        return NextResponse.json({
            key,
            name: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
        })
    }

    let body: { filename?: string }
    try {
        body = await req.json()
    } catch {
        return jsonError("Invalid JSON")
    }
    if (!body.filename) return jsonError("filename is required")
    const signed = await getPresignedUrlForUpload(body.filename)
    return NextResponse.json({ key: signed.filename, uploadUrl: signed.url })
}
