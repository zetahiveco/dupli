"use server"

import { clerkClient } from "@clerk/nextjs/server"
import { requireOrg } from "@/services/auth"
import {
    createNangoSession,
    deleteNangoConnection,
    connectedNangoIds,
    NANGO_PROVIDERS,
    saveNangoConnection,
} from "@/services/integrations/nango"

export async function listConsoleIntegrations() {
    const { orgId } = await requireOrg()
    const connected = await connectedNangoIds(orgId).catch(() => [] as string[])
    return { connected, providers: NANGO_PROVIDERS }
}

export async function completeNangoConnection(input: {
    connectionId: string
    providerConfigKey: string
    integrationId: string
}) {
    const { orgId } = await requireOrg()
    if (!input.connectionId || !input.providerConfigKey) throw new Error("Missing Nango connection")
    await saveNangoConnection({
        organizationId: orgId,
        connectionId: input.connectionId,
        providerConfigKey: input.providerConfigKey,
        integrationId: input.integrationId,
    })
    if (input.integrationId === "slack" || input.providerConfigKey.toLowerCase().includes("slack")) {
        const { greetSlackInstaller } = await import("@/services/integrations/slack-bot")
        await greetSlackInstaller(orgId).catch((error) => console.error("Slack greet failed", error))
    }
    return { success: true }
}

export async function startNangoConnect(integrationId: string) {
    const { orgId, userId } = await requireOrg()
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const email = user.emailAddresses[0]?.emailAddress
    const token = await createNangoSession({
        organizationId: orgId,
        userId,
        email,
        integrationId,
    })
    return { token }
}

export async function disconnectNango(providerConfigKey: string) {
    const { orgId } = await requireOrg()
    await deleteNangoConnection(orgId, providerConfigKey)
    return { success: true }
}
