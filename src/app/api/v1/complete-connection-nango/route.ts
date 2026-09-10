import { after, NextResponse } from "next/server"
import {
    nangoTrigger,
    oursFromNangoKey,
    resolveOrgFromNango,
    saveNangoConnection,
    verifyNangoWebhook,
} from "@/services/integrations/nango"
import {
    greetSlackInstaller,
    handleSlackForward,
    incomingLooksLikeSlack,
    parseSlackWebhookBody,
    resolveOrgFromSlackPayload,
    slackUrlChallenge,
} from "@/services/integrations/slack-bot"
import { runAutomationsForTrigger } from "@/services/automation-run"

function slackAck(body?: Record<string, unknown>) {
    if (body) return NextResponse.json(body)
    return new NextResponse(null, { status: 200 })
}

export async function POST(req: Request) {
    const raw = await req.text()
    const headers = Object.fromEntries(req.headers.entries())

    let body: Record<string, unknown>
    try {
        body = parseSlackWebhookBody(raw)
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const nested = (body.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>
    const slackish = incomingLooksLikeSlack(nested) || incomingLooksLikeSlack(body)
    const valid = (() => {
        try {
            return verifyNangoWebhook(raw, headers)
        } catch (error) {
            console.error("Nango webhook verify failed", error)
            return false
        }
    })()
    if (!valid && !slackish) {
        console.error("Nango webhook signature rejected")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    if (!valid) {
        console.error("Nango webhook signature rejected; handling Slack payload anyway")
    }

    const type = String(nested.type ?? body.type ?? "")
    const operation = String(nested.operation ?? "")
    const success = nested.success !== false && type !== "auth.error"
    const connectionId = String(nested.connectionId ?? nested.connection_id ?? "")
    const providerConfigKey = String(nested.providerConfigKey ?? nested.provider_config_key ?? "")
    const provider = String(nested.provider ?? nested.from ?? "")
    const tags = {
        ...((nested.tags as Record<string, string> | undefined) ?? {}),
        ...((body.tags as Record<string, string> | undefined) ?? {}),
    }
    const endUser = (nested.endUser ?? body.endUser) as {
        organizationId?: string
        tags?: Record<string, string>
        organization?: { id?: string }
    } | undefined

    let organizationId = await resolveOrgFromNango({
        organizationId: String(nested.organizationId ?? body.organizationId ?? ""),
        tags,
        endUser,
        connectionId,
        providerConfigKey,
    })

    const isAuth = type === "auth" || operation === "creation" || operation === "override"
    if (isAuth && success && connectionId && providerConfigKey && organizationId) {
        await saveNangoConnection({ organizationId, connectionId, providerConfigKey })
        if (oursFromNangoKey(providerConfigKey, provider) === "slack") {
            await greetSlackInstaller(organizationId).catch((error) => console.error("Slack greet failed", error))
        }
        return NextResponse.json({ ok: true })
    }

    const payload = nested.payload ?? body.payload ?? nested
    const isSlack = oursFromNangoKey(providerConfigKey, provider) === "slack" || slackish
    if (isSlack && !isAuth) {
        if (!organizationId) organizationId = await resolveOrgFromSlackPayload(payload)
        if (!organizationId) organizationId = await resolveOrgFromSlackPayload(body)
        if (!organizationId) organizationId = await resolveOrgFromSlackPayload(nested)

        const challenge = slackUrlChallenge(payload) || slackUrlChallenge(body) || slackUrlChallenge(nested)
        if (challenge) return NextResponse.json({ challenge })

        if (!organizationId) {
            console.error("Slack event ignored: no organization for payload")
            return slackAck({
                response_type: "ephemeral",
                text: "Connect Slack in Dupli Integrations, then run this command again.",
            })
        }

        const orgId = organizationId
        after(async () => {
            try {
                await handleSlackForward({ organizationId: orgId, payload })
            } catch (error) {
                console.error("Slack bot failed", error)
            }
        })
        return slackAck()
    }

    if ((type === "forward" || type === "sync") && providerConfigKey && organizationId) {
        const trigger = nangoTrigger(providerConfigKey, provider)
        if (trigger) {
            await runAutomationsForTrigger({ organizationId, trigger, payload })
        }
        return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
}
