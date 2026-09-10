import { prisma } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"
import type { Harness } from "../../generated/prisma/enums"
import type { Prisma } from "../../generated/prisma/client"

export async function listHarnessKeys(organizationId: string) {
    const rows = await prisma.apiKey.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
    })
    return rows.map((row) => ({
        id: row.id,
        harness: row.harness,
        hasKey: Boolean(row.apiKey),
        preview: row.apiKey ? `${row.apiKey.slice(0, 6)}…${row.apiKey.slice(-4)}` : "",
        additionalConfig: (row.additionalConfig ?? {}) as Record<string, unknown>,
        updatedAt: row.updatedAt,
    }))
}

export async function getHarnessKey(organizationId: string, harness: Harness) {
    return prisma.apiKey.findFirst({
        where: { organizationId, harness },
    })
}

export async function upsertHarnessKey(input: {
    organizationId: string
    harness: Harness
    apiKey: string
    additionalConfig?: Record<string, unknown>
}) {
    const existing = await prisma.apiKey.findFirst({
        where: { organizationId: input.organizationId, harness: input.harness },
    })
    const additionalConfig = (input.additionalConfig ?? {}) as Prisma.InputJsonValue
    if (existing) {
        return prisma.apiKey.update({
            where: { id: existing.id },
            data: { apiKey: input.apiKey, additionalConfig },
        })
    }
    return prisma.apiKey.create({
        data: {
            id: uuidv4(),
            organizationId: input.organizationId,
            harness: input.harness,
            apiKey: input.apiKey,
            additionalConfig,
        },
    })
}

export async function deleteHarnessKey(organizationId: string, harness: Harness) {
    const existing = await prisma.apiKey.findFirst({
        where: { organizationId, harness },
    })
    if (!existing) return
    await prisma.apiKey.delete({ where: { id: existing.id } })
}
