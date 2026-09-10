import { Nango } from "@nangohq/node"
import { appUrl } from "../auth"
import { getIntegrationsConfig, saveIntegrationsConfig } from "./config"
import { NANGO_PROVIDERS, oursFromNangoKey } from "./providers"

export { NANGO_PROVIDERS, oursFromNangoKey } from "./providers"
export type { NangoProviderId } from "./providers"

export function nangoClient() {
    const apiKey = process.env.NANGO_API_KEY
    if (!apiKey) throw new Error("NANGO_API_KEY is not configured")
    return new Nango({
        apiKey,
        webhookSigningKey: process.env.NANGO_WEBHOOK_SECRET,
    })
}

export async function createNangoSession(input: {
    organizationId: string
    userId: string
    email?: string
    integrationId: string
}) {
    const nango = nangoClient()
    const uniqueKey = await resolveIntegrationUniqueKey(nango, input.integrationId)
    const webhook = publicWebhookUrl()

    try {
        const { data } = await nango.createConnectSession({
            end_user: {
                id: input.userId,
                ...(input.email ? { email: input.email } : {}),
            },
            organization: { id: input.organizationId },
            tags: {
                end_user_id: input.userId,
                organization_id: input.organizationId,
                ...(input.email ? { end_user_email: input.email } : {}),
            },
            allowed_integrations: [uniqueKey],
            ...(webhook ? { webhook_url_override: webhook } : {}),
        } as Parameters<Nango["createConnectSession"]>[0])
        return data.token
    } catch (error) {
        throw nangoError(error)
    }
}

export function publicWebhookUrl() {
    const override = process.env.NANGO_WEBHOOK_URL?.trim()
    if (override) {
        const trimmed = override.replace(/\/$/, "")
        return trimmed.includes("/api/") ? trimmed : `${trimmed}/api/v1/complete-connection-nango`
    }
    const url = `${appUrl()}/api/v1/complete-connection-nango`
    if (!url.startsWith("https://")) return undefined
    try {
        const host = new URL(url).hostname
        if (host === "localhost" || host === "127.0.0.1") return undefined
    } catch {
        return undefined
    }
    return url
}

export async function setNangoWebhookOverride(connectionId: string, providerConfigKey: string) {
    const webhook = publicWebhookUrl()
    if (!webhook || !connectionId || !providerConfigKey) return
    try {
        await nangoClient().patchConnection(
            { connectionId, provider_config_key: providerConfigKey },
            { webhook_url_override: webhook },
        )
    } catch (error) {
        console.error("Nango webhook override failed", error)
    }
}

const SLACK_BOT_SCOPES = [
    "commands",
    "chat:write",
    "chat:write.public",
    "im:write",
    "users:read",
].join(",")

function slackOAuthCredentials() {
    const client_id = process.env.NANGO_SLACK_CLIENT_ID?.trim()
    const client_secret = process.env.NANGO_SLACK_CLIENT_SECRET?.trim()
    if (!client_id || !client_secret) return undefined
    return {
        type: "OAUTH2" as const,
        client_id,
        client_secret,
        scopes: SLACK_BOT_SCOPES,
    }
}

function matchIntegrationConfig(
    configs: Array<{ unique_key?: string; provider?: string }>,
    integrationId: string,
) {
    return configs.find((row) => oursFromNangoKey(row.unique_key || "", row.provider) === integrationId)
}

async function ensureOwnSlackApp(nango: Nango, uniqueKey: string) {
    const credentials = slackOAuthCredentials()
    if (!credentials) return
    try {
        await nango.updateIntegration({ uniqueKey }, { credentials, forward_webhooks: true })
    } catch (error) {
        console.error("Nango Slack credentials update failed", nangoError(error))
    }
}

async function resolveIntegrationUniqueKey(nango: Nango, integrationId: string) {
    const provider = NANGO_PROVIDERS.find((item) => item.id === integrationId)
    if (!provider) throw new Error(`Unknown integration "${integrationId}"`)

    let configs: Array<{ unique_key?: string; provider?: string }> = []
    try {
        const listed = await nango.listIntegrations()
        configs = listed.configs ?? []
    } catch (error) {
        throw nangoError(error)
    }

    const match = matchIntegrationConfig(configs, integrationId)
    if (match?.unique_key) {
        if (integrationId === "slack") await ensureOwnSlackApp(nango, match.unique_key)
        return match.unique_key
    }

    if (integrationId === "slack") {
        const credentials = slackOAuthCredentials()
        if (!credentials) {
            throw new Error("Slack OAuth client ID and secret are not configured")
        }
        try {
            const created = await nango.createIntegration({
                provider: integrationId,
                unique_key: integrationId,
                display_name: provider.name,
                forward_webhooks: true,
                credentials,
            })
            if (created.data?.unique_key) return created.data.unique_key
        } catch (error) {
            throw nangoError(error)
        }
        throw new Error(`Could not create Nango integration "${integrationId}".`)
    }

    try {
        const created = await nango.createQuickstartIntegration({
            provider: integrationId,
            unique_key: integrationId,
            display_name: provider.name,
            forward_webhooks: true,
        })
        if (created.data?.unique_key) return created.data.unique_key
    } catch (quickstartError) {
        try {
            const created = await nango.createIntegration({
                provider: integrationId,
                unique_key: integrationId,
                display_name: provider.name,
                forward_webhooks: true,
            })
            if (created.data?.unique_key) return created.data.unique_key
        } catch {
            throw nangoError(quickstartError)
        }
    }

    throw new Error(`Could not create Nango integration "${integrationId}".`)
}

function nangoError(error: unknown) {
    const response = (error as { response?: { data?: unknown } } | undefined)?.response?.data as
        | { error?: { message?: string; code?: string; errors?: Array<{ message?: string }> }; message?: string }
        | string
        | undefined
    if (typeof response === "string" && response.trim()) return new Error(response)
    if (response && typeof response === "object") {
        const nested = response.error?.errors?.map((item) => item.message).filter(Boolean).join("; ")
        const message = response.error?.message || nested || response.message
        if (message) return new Error(message)
    }
    return error instanceof Error ? error : new Error("Nango request failed")
}

export async function listNangoConnections(organizationId: string) {
    const nango = nangoClient()
    const byTags = await nango.listConnections({
        tags: { organization_id: organizationId },
        limit: 100,
    }).catch(() => ({ connections: [] as Array<{ connection_id: string; provider_config_key: string; provider?: string }> }))
    const byOrg = await nango.listConnections(undefined, undefined, {
        endUserOrganizationId: organizationId,
        limit: 100,
    }).catch(() => ({ connections: [] as typeof byTags.connections }))

    const rows = [...(byTags.connections ?? []), ...(byOrg.connections ?? [])]
    const seen = new Set<string>()
    const out: Array<{ connectionId: string; providerConfigKey: string; provider?: string }> = []
    for (const row of rows) {
        const connectionId = row.connection_id
        const providerConfigKey = row.provider_config_key
        if (!connectionId || !providerConfigKey) continue
        const id = `${providerConfigKey}:${connectionId}`
        if (seen.has(id)) continue
        seen.add(id)
        out.push({
            connectionId,
            providerConfigKey,
            provider: row.provider,
        })
    }
    return out
}

export async function connectedNangoIds(organizationId: string) {
    const config = await getIntegrationsConfig(organizationId)
    const ids = new Set<string>()
    for (const [key, value] of Object.entries(config.nango ?? {})) {
        if (!value?.connectionId) continue
        ids.add(oursFromNangoKey(key, value.providerConfigKey) ?? key)
    }
    try {
        const listed = await listNangoConnections(organizationId)
        for (const row of listed) {
            const id = oursFromNangoKey(row.providerConfigKey, row.provider)
            if (id) ids.add(id)
        }
    } catch (error) {
        console.error("Nango list connections failed", error)
    }
    return [...ids]
}

export function nangoTrigger(providerConfigKey: string, provider?: string) {
    const id = oursFromNangoKey(providerConfigKey, provider)
    const row = NANGO_PROVIDERS.find((item) => item.id === id)
    return row && "trigger" in row ? row.trigger : null
}

export async function resolveOrgFromNango(input: {
    organizationId?: string
    tags?: Record<string, string>
    endUser?: {
        organizationId?: string
        tags?: Record<string, string>
        organization?: { id?: string }
    }
    connectionId?: string
    providerConfigKey?: string
}) {
    const tags = input.tags ?? {}
    const fromPayload =
        input.organizationId ||
        tags.organization_id ||
        tags.organizationId ||
        input.endUser?.organizationId ||
        input.endUser?.organization?.id ||
        input.endUser?.tags?.organization_id
    if (fromPayload) return fromPayload
    if (!input.connectionId || !input.providerConfigKey) return ""
    try {
        const connection = await nangoClient().getConnection(input.providerConfigKey, input.connectionId)
        const endUser = (connection as { end_user?: { organization?: { id?: string }; tags?: Record<string, string> } }).end_user
        const tags = (connection as { tags?: Record<string, string> }).tags
        return endUser?.organization?.id || tags?.organization_id || endUser?.tags?.organization_id || ""
    } catch {
        return ""
    }
}

export async function saveNangoConnection(input: {
    organizationId: string
    connectionId: string
    providerConfigKey: string
    integrationId?: string
}) {
    const ours = input.integrationId || oursFromNangoKey(input.providerConfigKey) || input.providerConfigKey
    const config = await getIntegrationsConfig(input.organizationId)
    const prev = config.nango?.[ours]
    await saveIntegrationsConfig(input.organizationId, {
        ...config,
        nango: {
            ...(config.nango ?? {}),
            [ours]: {
                ...prev,
                connectionId: input.connectionId,
                providerConfigKey: input.providerConfigKey,
            },
        },
    })
    await setNangoWebhookOverride(input.connectionId, input.providerConfigKey)
}

export async function deleteNangoConnection(organizationId: string, providerId: string) {
    const config = await getIntegrationsConfig(organizationId)
    const saved = config.nango?.[providerId] ?? Object.entries(config.nango ?? {}).find(([key]) => oursFromNangoKey(key) === providerId)?.[1]
    let connectionId = saved?.connectionId
    let uniqueKey = saved?.providerConfigKey || providerId

    if (!connectionId) {
        try {
            const listed = await listNangoConnections(organizationId)
            const match = listed.find((row) => oursFromNangoKey(row.providerConfigKey, row.provider) === providerId)
            if (match) {
                connectionId = match.connectionId
                uniqueKey = match.providerConfigKey
            }
        } catch {
            // fall through
        }
    }

    if (connectionId) {
        try {
            await nangoClient().deleteConnection(uniqueKey, connectionId)
        } catch (error) {
            console.error("Nango disconnect failed", error)
        }
    }

    if (config.nango) {
        const next = { ...config.nango }
        for (const key of Object.keys(next)) {
            if (key === providerId || oursFromNangoKey(key) === providerId) delete next[key]
        }
        await saveIntegrationsConfig(organizationId, { ...config, nango: next })
    }
}

export function verifyNangoWebhook(body: string, headers: Record<string, unknown>) {
    const apiKey = process.env.NANGO_API_KEY
    if (!apiKey) return false
    const keys = [...new Set([process.env.NANGO_WEBHOOK_SECRET, apiKey].filter(Boolean) as string[])]
    for (const webhookSigningKey of keys) {
        try {
            if (new Nango({ apiKey, webhookSigningKey }).verifyIncomingWebhookRequest(body, headers)) {
                return true
            }
        } catch {
            // try the next key
        }
    }
    return false
}

export async function nangoProxy(input: {
    organizationId: string
    integrationId: string
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    endpoint: string
    data?: unknown
    params?: Record<string, string>
}) {
    const config = await getIntegrationsConfig(input.organizationId)
    const saved = config.nango?.[input.integrationId]
    let connectionId = saved?.connectionId
    let providerConfigKey = saved?.providerConfigKey || input.integrationId
    if (!connectionId) {
        const listed = await listNangoConnections(input.organizationId)
        const match = listed.find((row) => oursFromNangoKey(row.providerConfigKey, row.provider) === input.integrationId)
        if (match) {
            connectionId = match.connectionId
            providerConfigKey = match.providerConfigKey
        }
    }
    if (!connectionId) throw new Error("Integration is not connected")
    return nangoClient().proxy({
        providerConfigKey,
        connectionId,
        method: input.method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete",
        endpoint: input.endpoint,
        data: input.data,
        params: input.params,
    })
}
