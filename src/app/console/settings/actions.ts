"use server"

import { prisma } from "@/lib/db"
import { requireOrg, appUrl } from "@/services/auth"
import { v4 as uuidv4 } from "uuid"
import { deleteHarnessKey, listHarnessKeys, upsertHarnessKey } from "@/services/api-keys"
import type { Harness } from "../../../../generated/prisma/enums"

export async function getSettings() {
    const { userId, orgId } = await requireOrg()
    const [organizationSettings, userSettings, harnessKeys] = await Promise.all([
        prisma.organizationSettings.findUnique({ where: { organizationId: orgId } }),
        prisma.userSettings.findUnique({ where: { userId } }),
        listHarnessKeys(orgId),
    ])
    return {
        organizationSettings,
        userSettings,
        harnessKeys,
        appUrl: appUrl(),
    }
}

export async function updateEmailNotify(emailNotify: boolean) {
    const { orgId } = await requireOrg()
    await prisma.organizationSettings.update({
        where: { organizationId: orgId },
        data: { emailNotify },
    })
    return { success: true }
}

export async function saveHarnessApiKey(input: {
    harness: Harness
    apiKey: string
    provider?: string
}) {
    const { orgId } = await requireOrg()
    await upsertHarnessKey({
        organizationId: orgId,
        harness: input.harness,
        apiKey: input.apiKey,
        additionalConfig: input.provider ? { provider: input.provider } : {},
    })
    return { success: true }
}

export async function removeHarnessApiKey(harness: Harness) {
    const { orgId } = await requireOrg()
    await deleteHarnessKey(orgId, harness)
    return { success: true }
}

export async function generateApiKey() {
    const { orgId } = await requireOrg()
    const apiKey = uuidv4()
    await prisma.organizationSettings.update({
        where: { organizationId: orgId },
        data: { apiKey },
    })
    return { apiKey }
}

export async function getApiKey() {
    const { orgId } = await requireOrg()
    const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId: orgId },
        select: { apiKey: true },
    })
    return { apiKey: settings?.apiKey || null }
}

export async function getAppUrl() {
    return { appUrl: appUrl() }
}
