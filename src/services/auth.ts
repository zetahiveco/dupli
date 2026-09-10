import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"

export async function requireOrg() {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) throw new Error("Unauthorized")
    return { userId, orgId }
}

export function appUrl() {
    return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")
}

export function readBearer(req: Request) {
    const header = req.headers.get("authorization") || ""
    const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
    return bearer || req.headers.get("x-api-key")?.trim() || ""
}

export async function requireOrgApiKey(req: Request) {
    const apiKey = readBearer(req)
    if (!apiKey) throw new Error("Missing API key")
    const settings = await prisma.organizationSettings.findUnique({
        where: { apiKey },
    })
    if (!settings) throw new Error("Invalid API key")
    return settings
}
