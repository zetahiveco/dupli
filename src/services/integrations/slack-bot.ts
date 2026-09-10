import { prisma } from "@/lib/db"
import { appUrl } from "../auth"
import {
    createAutomation,
    deleteAutomation,
    listAutomations,
    updateAutomation,
} from "../automations"
import {
    getIntegrationsConfig,
    integrationsFromSettings,
    saveIntegrationsConfig,
    type SlackBotState,
} from "./config"
import { createWorkspace, listWorkspaces, sendWorkspaceMessage, NeedsApiKeyError } from "../workspace"
import { InsufficientMinutesError } from "../common/billing"
import { nangoClient, nangoProxy, setNangoWebhookOverride } from "./nango"

type SlackBlock = Record<string, unknown>

type SlackReply = {
    organizationId: string
    channel: string
    threadTs?: string
    responseUrl?: string
}

function asObj(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null
    return value as Record<string, unknown>
}

function looksLikeSlack(value: unknown) {
    const rec = asObj(value)
    if (!rec) return false
    return Boolean(
        rec.type ||
        rec.event ||
        rec.challenge ||
        rec.actions ||
        rec.command ||
        rec.trigger_id ||
        rec.team_id ||
        typeof rec.payload === "string",
    )
}

function formToObject(raw: string) {
    const obj: Record<string, unknown> = {}
    for (const [key, value] of new URLSearchParams(raw).entries()) obj[key] = value
    return obj
}

export function parseSlackWebhookBody(raw: string): Record<string, unknown> {
    const trimmed = raw.trim()
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return JSON.parse(trimmed) as Record<string, unknown>
    }
    return formToObject(raw)
}

function unwrapSlack(raw: unknown): Record<string, unknown> {
    let current: unknown = raw
    for (let i = 0; i < 5; i++) {
        if (typeof current === "string") {
            const text = current
            try {
                current = JSON.parse(text)
                continue
            } catch {
                if (text.includes("=")) {
                    current = formToObject(text)
                    continue
                }
                break
            }
        }
        const rec = asObj(current)
        if (!rec) break
        const inner = rec.payload
        const wrapper = rec.type === "forward" || rec.type === "sync" || rec.from === "slack" || typeof inner === "string"
        if (wrapper && (typeof inner === "string" || looksLikeSlack(inner))) {
            current = inner
            continue
        }
        break
    }
    return asObj(current) ?? {}
}

function str(value: unknown) {
    return typeof value === "string" ? value : ""
}

function mentionText(text: string) {
    return text.replace(/<@[A-Z0-9]+>/gi, "").replace(/<![a-z0-9_|]+>/gi, "").trim()
}

function parseIntent(text: string) {
    const cleaned = mentionText(text)
        .replace(/^\/+/, "")
        .replace(/^(?:dupli|separate)\b/i, "")
        .trim()
        .replace(/-/g, " ")
        .toLowerCase()
    if (!cleaned || cleaned === "help" || cleaned === "menu" || cleaned === "options") return { kind: "menu" as const }
    const create = cleaned.match(/^(?:add|create)(?:\s+a)?\s+workspace(?:\s+(.+))?$/) || cleaned.match(/^workspace\s+create(?:\s+(.+))?$/)
    if (create) return { kind: "ws_create" as const, name: create[1] }
    if (cleaned === "create") return { kind: "ws_create" as const }
    if (/^(?:workspace\s+)?(?:choose|pick)(?:\s+workspace)?$/.test(cleaned) || cleaned === "workspace") {
        return { kind: "ws_choose" as const }
    }
    const chat = cleaned.match(/^(?:workspace\s+)?chat(?:\s+(.+))?$/)
    if (chat) return { kind: "ws_chat" as const, task: chat[1] }
    const actCreate = cleaned.match(/^(?:create\s+action|action\s+create|create\s+automation)(?:\s+(.+))?$/)
    if (actCreate) return { kind: "act_create" as const, prompt: actCreate[1] }
    const actEdit = cleaned.match(/^(?:edit\s+action|action\s+edit|edit\s+automation)(?:\s+(.+))?$/)
    if (actEdit) return { kind: "act_edit" as const, prompt: actEdit[1] }
    if (/^(?:delete\s+action|action\s+delete|delete\s+automation)$/.test(cleaned)) return { kind: "act_delete" as const }
    if (/^manage\s+actions?$/.test(cleaned) || cleaned === "actions") return { kind: "actions" as const }
    return { kind: "menu" as const }
}

function clip(text: string, max = 2900) {
    const trimmed = text.trim()
    if (trimmed.length <= max) return trimmed
    return `${trimmed.slice(0, max - 1)}…`
}

function workspaceLink(id: string, name: string) {
    const label = (name || "workspace").replace(/[<>|]/g, "").trim() || "workspace"
    return `<${appUrl()}/console/workspaces/${encodeURIComponent(id)}|${label}>`
}

async function orgUserId(organizationId: string) {
    const workspace = await prisma.workspace.findFirst({
        where: { organizationId },
        select: { userId: true },
    })
    if (workspace?.userId) return workspace.userId
    const automation = await prisma.automation.findFirst({
        where: { organizationId },
        select: { userId: true },
    })
    const user = await prisma.userSettings.findFirst({
        where: { organizationId },
        select: { userId: true },
    })
    return automation?.userId || user?.userId || organizationId
}

async function botState(organizationId: string): Promise<SlackBotState> {
    const config = await getIntegrationsConfig(organizationId)
    return config.slackBot ?? {}
}

async function saveBotState(organizationId: string, patch: SlackBotState) {
    const config = await getIntegrationsConfig(organizationId)
    const prev = config.slackBot ?? {}
    const next: SlackBotState = { ...prev, ...patch }
    if ("expect" in patch && patch.expect === undefined) delete next.expect
    if ("automationId" in patch && patch.automationId === undefined) delete next.automationId
    await saveIntegrationsConfig(organizationId, { ...config, slackBot: next })
}

function menuBlocks(): SlackBlock[] {
    return [
        {
            type: "header",
            text: { type: "plain_text", text: "Dupli" },
        },
        {
            type: "section",
            text: { type: "mrkdwn", text: "*Workspace*" },
        },
        {
            type: "actions",
            block_id: "workspace",
            elements: [
                { type: "button", text: { type: "plain_text", text: "Create" }, action_id: "ws_create" },
                { type: "button", text: { type: "plain_text", text: "Choose" }, action_id: "ws_choose" },
                { type: "button", text: { type: "plain_text", text: "Chat" }, action_id: "ws_chat" },
            ],
        },
        {
            type: "section",
            text: { type: "mrkdwn", text: "*Actions*" },
        },
        {
            type: "actions",
            block_id: "actions",
            elements: [
                { type: "button", text: { type: "plain_text", text: "Create" }, action_id: "act_create" },
                { type: "button", text: { type: "plain_text", text: "Edit" }, action_id: "act_edit" },
                { type: "button", text: { type: "plain_text", text: "Delete" }, action_id: "act_delete" },
            ],
        },
    ]
}

function selectBlock(actionId: string, placeholder: string, items: Array<{ id: string; name: string }>): SlackBlock {
    return {
        type: "actions",
        elements: [
            {
                type: "static_select",
                action_id: actionId,
                placeholder: { type: "plain_text", text: placeholder },
                options: items.slice(0, 100).map((item) => ({
                    text: { type: "plain_text", text: (item.name || "Untitled").slice(0, 75) },
                    value: item.id,
                })),
            },
        ],
    }
}

async function postSlack(reply: SlackReply, text: string, blocks?: SlackBlock[]) {
    const body = {
        text,
        ...(blocks ? { blocks } : {}),
        ...(reply.threadTs ? { thread_ts: reply.threadTs } : {}),
    }
    if (reply.responseUrl) {
        const res = await fetch(reply.responseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, response_type: "in_channel", replace_original: false }),
        })
        if (!res.ok) {
            const err = await res.text().catch(() => "")
            throw new Error(err || `Slack response_url failed (${res.status})`)
        }
        return
    }
    const res = await nangoProxy({
        organizationId: reply.organizationId,
        integrationId: "slack",
        method: "POST",
        endpoint: "/chat.postMessage",
        data: { channel: reply.channel, ...body },
    })
    const data = res.data as { ok?: boolean; error?: string }
    if (data?.ok === false) throw new Error(data.error || "Slack API error")
}

function actionMenuBlocks(): SlackBlock[] {
    return [
        {
            type: "section",
            text: { type: "mrkdwn", text: "*Actions*" },
        },
        {
            type: "actions",
            block_id: "actions",
            elements: [
                { type: "button", text: { type: "plain_text", text: "Create" }, action_id: "act_create" },
                { type: "button", text: { type: "plain_text", text: "Edit" }, action_id: "act_edit" },
                { type: "button", text: { type: "plain_text", text: "Delete" }, action_id: "act_delete" },
            ],
        },
    ]
}

async function showMenu(reply: SlackReply) {
    await postSlack(reply, "What do you want to do? Use a slash command or the buttons below.", menuBlocks())
}

async function createSlackWorkspace(organizationId: string, name?: string) {
    const userId = await orgUserId(organizationId)
    const workspace = await createWorkspace({
        organizationId,
        userId,
        name: name?.trim() || "Slack workspace",
        harness: "CLAUDE_CODEX",
    })
    await saveBotState(organizationId, { workspaceId: workspace.id, expect: undefined, automationId: undefined })
    return workspace
}

async function chatInWorkspace(organizationId: string, workspaceId: string, content: string, reply: SlackReply) {
    const workspace = (await listWorkspaces(organizationId)).find((row) => row.id === workspaceId)
    const label = workspace ? workspaceLink(workspace.id, workspace.name) : "the workspace"
    await postSlack(reply, `Working in ${label}…`)
    const userId = await orgUserId(organizationId)
    const result = await sendWorkspaceMessage({
        organizationId,
        userId,
        workspaceId,
        content,
    })
    const last = [...result.messages].reverse().find((msg) => msg.role === "assistant")
    await postSlack(reply, clip(last?.content || "Done."))
}

async function runActionId(organizationId: string, actionId: string, reply: SlackReply, value = "") {
    await handleAction(organizationId, {
        channel: { id: reply.channel },
        response_url: reply.responseUrl,
        message: { ts: reply.threadTs, thread_ts: reply.threadTs },
        actions: [{ action_id: actionId, value }],
    })
}

async function handleMention(organizationId: string, event: Record<string, unknown>) {
    if (event.bot_id || str(event.subtype) === "bot_message") return
    const thread = asObj(event.assistant_thread)
    const channel = str(event.channel) || str(thread?.channel_id)
    if (!channel) return
    const reply: SlackReply = {
        organizationId,
        channel,
        threadTs: str(event.thread_ts) || str(thread?.thread_ts) || str(event.ts) || undefined,
        responseUrl: str(event.response_url) || undefined,
    }
    const text = mentionText(str(event.text) || str(event.message))
    const state = await botState(organizationId)
    const key = `${channel}:${str(event.ts) || str(event.event_ts)}`
    if (str(event.ts) || str(event.event_ts)) {
        if ((state.processed ?? []).includes(key)) return
        await saveBotState(organizationId, { processed: [...(state.processed ?? []), key].slice(-200) })
    }

    const intent = parseIntent(text)
    if (intent.kind === "menu") {
        await showMenu(reply)
        return
    }
    if (intent.kind === "ws_create") {
        const workspace = await createSlackWorkspace(organizationId, intent.name)
        await postSlack(reply, `Created ${workspaceLink(workspace.id, workspace.name)}. It's selected for chat.`)
        return
    }
    if (intent.kind === "ws_choose") {
        await runActionId(organizationId, "ws_choose", reply)
        return
    }
    if (intent.kind === "ws_chat") {
        if (intent.task) {
            const workspaceId = (await botState(organizationId)).workspaceId
            if (!workspaceId) {
                await runActionId(organizationId, "ws_choose", reply)
                return
            }
            await chatInWorkspace(organizationId, workspaceId, intent.task, reply)
            return
        }
        await runActionId(organizationId, "ws_chat", reply)
        return
    }
    if (intent.kind === "act_create") {
        if (intent.prompt?.trim()) {
            const name = intent.prompt.split("\n")[0]?.slice(0, 80) || "From Slack"
            const workspaceId = state.workspaceId
            await createAutomation({
                organizationId,
                userId: await orgUserId(organizationId),
                name,
                prompt: intent.prompt,
                trigger: "VIA_API",
                workspaceAction: workspaceId ? "USE_EXISTING" : "CREATE_NEW",
                workspaceId: workspaceId ?? null,
                newWorkspaceConfig: workspaceId
                    ? undefined
                    : { name: "Slack automation", harness: "CLAUDE_CODEX" },
            })
            await saveBotState(organizationId, { expect: undefined, automationId: undefined })
            await postSlack(reply, `Created automation *${name}*.`)
            return
        }
        await postSlack(reply, "Create an action with `/action-create your prompt`.")
        return
    }
    if (intent.kind === "act_edit") {
        if (intent.prompt?.trim() && state.automationId) {
            await updateAutomation(organizationId, state.automationId, { prompt: intent.prompt })
            await saveBotState(organizationId, { expect: undefined, automationId: undefined })
            await postSlack(reply, "Updated the automation prompt.")
            return
        }
        await runActionId(organizationId, "act_edit", reply)
        return
    }
    if (intent.kind === "act_delete") {
        await runActionId(organizationId, "act_delete", reply)
        return
    }
    if (intent.kind === "actions") {
        await postSlack(reply, "Actions", actionMenuBlocks())
        return
    }

    await showMenu(reply)
}

async function handleAction(organizationId: string, payload: Record<string, unknown>) {
    const action = (Array.isArray(payload.actions) ? payload.actions[0] : null) as Record<string, unknown> | null
    if (!action) return
    const channelObj = asObj(payload.channel)
    const message = asObj(payload.message)
    const channel = str(channelObj?.id) || str(payload.channel)
    if (!channel) return
    const reply: SlackReply = {
        organizationId,
        channel,
        threadTs: str(message?.thread_ts) || str(message?.ts) || undefined,
        responseUrl: str(payload.response_url) || undefined,
    }
    const actionId = str(action.action_id)
    const selected = asObj(action.selected_option)
    const value = str(action.value) || str(selected?.value)

    if (actionId === "ws_create") {
        const workspace = await createSlackWorkspace(organizationId)
        await postSlack(reply, `Created ${workspaceLink(workspace.id, workspace.name)}. It's selected for chat.`)
        return
    }

    if (actionId === "ws_choose" || actionId === "ws_pick") {
        if (actionId === "ws_pick" && value) {
            const workspace = (await listWorkspaces(organizationId)).find((row) => row.id === value)
            if (!workspace) {
                await postSlack(reply, "That workspace is gone.")
                return
            }
            await saveBotState(organizationId, { workspaceId: workspace.id, expect: undefined, automationId: undefined })
            await postSlack(reply, `Using ${workspaceLink(workspace.id, workspace.name)}. Chat with \`/workspace-chat your task\`.`)
            return
        }
        const rows = await listWorkspaces(organizationId)
        if (rows.length === 0) {
            await postSlack(reply, "No workspaces yet. Tap Create.")
            return
        }
        await postSlack(
            reply,
            "Choose a workspace.",
            [selectBlock("ws_pick", "Choose a workspace", rows.map((row) => ({ id: row.id, name: row.name })))],
        )
        return
    }

    if (actionId === "ws_chat") {
        const state = await botState(organizationId)
        if (!state.workspaceId) {
            const rows = await listWorkspaces(organizationId)
            if (rows.length === 0) {
                await postSlack(reply, "Create a workspace first.", menuBlocks())
                return
            }
            await postSlack(
                reply,
                "Choose a workspace to chat in.",
                [selectBlock("ws_pick", "Choose a workspace", rows.map((row) => ({ id: row.id, name: row.name })))],
            )
            return
        }
        await saveBotState(organizationId, { expect: "chat", automationId: undefined })
        const workspace = (await listWorkspaces(organizationId)).find((row) => row.id === state.workspaceId)
        const label = workspace ? workspaceLink(workspace.id, workspace.name) : "the selected workspace"
        await postSlack(reply, `Use \`/workspace-chat your task\` to chat in ${label}.`)
        return
    }

    if (actionId === "act_create") {
        await saveBotState(organizationId, { expect: "action_create", automationId: undefined })
        await postSlack(reply, "Create an action with `/action-create your prompt`.")
        return
    }

    if (actionId === "act_edit" || actionId === "act_pick_edit") {
        if (actionId === "act_pick_edit" && value) {
            const row = (await listAutomations(organizationId)).find((item) => item.id === value)
            if (!row) {
                await postSlack(reply, "That automation is gone.")
                return
            }
            await saveBotState(organizationId, { expect: "action_edit", automationId: row.id })
            await postSlack(reply, `Editing *${row.name}*. Send \`/action-edit your new prompt\`.`)
            return
        }
        const rows = await listAutomations(organizationId)
        if (rows.length === 0) {
            await postSlack(reply, "No automations yet. Tap Create.")
            return
        }
        await postSlack(
            reply,
            "Choose an automation to edit.",
            [selectBlock("act_pick_edit", "Choose an automation", rows.map((row) => ({ id: row.id, name: row.name })))],
        )
        return
    }

    if (actionId === "act_delete" || actionId === "act_pick_delete") {
        if (actionId === "act_pick_delete" && value) {
            const row = (await listAutomations(organizationId)).find((item) => item.id === value)
            if (!row) {
                await postSlack(reply, "That automation is gone.")
                return
            }
            await deleteAutomation(organizationId, row.id)
            await postSlack(reply, `Deleted *${row.name}*.`)
            return
        }
        const rows = await listAutomations(organizationId)
        if (rows.length === 0) {
            await postSlack(reply, "No automations to delete.")
            return
        }
        await postSlack(
            reply,
            "Choose an automation to delete.",
            [selectBlock("act_pick_delete", "Choose an automation", rows.map((row) => ({ id: row.id, name: row.name })))],
        )
    }
}

async function slackConnection(organizationId: string) {
    const config = await getIntegrationsConfig(organizationId)
    return config.nango?.slack
}

async function slackApi<T = Record<string, unknown>>(organizationId: string, endpoint: string, data?: unknown) {
    const res = await nangoProxy({
        organizationId,
        integrationId: "slack",
        method: "POST",
        endpoint,
        data,
    })
    return res.data as T & { ok?: boolean; error?: string }
}

export async function handleSlackForward(input: {
    organizationId: string
    payload: unknown
}): Promise<{ challenge?: string } | void> {
    const payload = unwrapSlack(input.payload)
    const challenge = str(payload.challenge)
    if (challenge || str(payload.type) === "url_verification") {
        return challenge ? { challenge } : undefined
    }

    const type = str(payload.type)

    try {
        if (str(payload.command).startsWith("/")) {
            await handleMention(input.organizationId, {
                channel: str(payload.channel_id),
                text: `${str(payload.command)} ${str(payload.text)}`.trim(),
                response_url: str(payload.response_url),
                user: payload.user_id,
            })
            return
        }
        if (type === "shortcut" || type === "message_action") {
            const callback = str(payload.callback_id).replace(/^(?:separate_|dupli_)/, "")
            const channel = str(asObj(payload.channel)?.id) || str(payload.channel_id)
            const reply: SlackReply = {
                organizationId: input.organizationId,
                channel,
                threadTs: str(asObj(payload.message)?.ts) || undefined,
                responseUrl: str(payload.response_url) || undefined,
            }
            if (!channel) return
            if (!callback || callback === "menu") {
                await showMenu(reply)
                return
            }
            await runActionId(input.organizationId, callback, reply)
            return
        }
        if (type === "block_actions") {
            await handleAction(input.organizationId, payload)
        }
    } catch (error) {
        const channel =
            str(asObj(payload.channel)?.id) ||
            str(payload.channel) ||
            str(payload.channel_id)
        const message = error instanceof NeedsApiKeyError
            ? "Add a harness API key in Settings, then try again."
            : error instanceof InsufficientMinutesError
                ? "This user is out of machine-minutes. Purchase a plan or wait for the next reset."
                : error instanceof Error
                    ? error.message
                    : "Something went wrong."
        if (channel) {
            await postSlack(
                {
                    organizationId: input.organizationId,
                    channel,
                    threadTs: str(asObj(payload.message)?.ts) || undefined,
                    responseUrl: str(payload.response_url) || undefined,
                },
                clip(message),
            ).catch((postError) => console.error("Slack error reply failed", postError))
        } else {
            console.error("Slack bot failed", error)
        }
    }
}

export function incomingLooksLikeSlack(body: Record<string, unknown>) {
    if (String(body.from ?? "").toLowerCase() === "slack") return true
    const provider = String(body.provider ?? body.providerConfigKey ?? body.provider_config_key ?? "").toLowerCase()
    if (provider.includes("slack")) return true
    const payload = asObj(body.payload) ?? body
    const type = str(payload.type)
    return (
        type === "event_callback" ||
        type === "url_verification" ||
        type === "block_actions" ||
        type === "app_mention" ||
        type === "shortcut" ||
        type === "message_action" ||
        str(payload.command).startsWith("/") ||
        Boolean(payload.event) ||
        Boolean(payload.team_id) ||
        Boolean(payload.trigger_id)
    )
}

export function slackUrlChallenge(payload: unknown) {
    const body = unwrapSlack(payload)
    return str(body.challenge)
}

export async function resolveOrgFromSlackPayload(payload: unknown) {
    const body = unwrapSlack(payload)
    const auths = Array.isArray(body.authorizations) ? body.authorizations : []
    const team =
        str(body.team_id) ||
        str(asObj(body.team)?.id) ||
        str(asObj(body.event)?.team) ||
        str(asObj(auths[0])?.team_id)
    const rows = await prisma.organizationSettings.findMany({
        select: { organizationId: true, integrationsConfig: true, environmentVariables: true },
    })
    if (team) {
        for (const row of rows) {
            const config = integrationsFromSettings(row)
            for (const value of Object.values(config.nango ?? {})) {
                if (value.teamId === team) return row.organizationId
            }
        }
    }
    const slackOrgs = rows.filter((row) => integrationsFromSettings(row).nango?.slack?.connectionId)
    if (slackOrgs.length === 1) return slackOrgs[0].organizationId
    return ""
}

function connectionRecord(raw: unknown) {
    const root = asObj(raw) ?? {}
    return asObj(root.connection) ?? asObj(root.data) ?? root
}

export async function greetSlackInstaller(organizationId: string) {
    const saved = await slackConnection(organizationId)
    if (!saved?.connectionId || !saved.providerConfigKey) return
    const raw = await nangoClient().getConnection(saved.providerConfigKey, saved.connectionId)
    const conn = connectionRecord(raw)
    const creds = asObj(conn.credentials) ?? conn
    const meta = asObj(creds.raw) ?? asObj(conn.metadata) ?? {}
    const teamObj = asObj(meta.team)
    const teamId = str(teamObj?.id) || str(meta.team_id)
    const botUserId = str(meta.bot_user_id) || str(meta.bot_id)
    const config = await getIntegrationsConfig(organizationId)
    await saveIntegrationsConfig(organizationId, {
        ...config,
        nango: {
            ...(config.nango ?? {}),
            slack: { ...saved, ...(teamId ? { teamId } : {}), ...(botUserId ? { botUserId } : {}) },
        },
    })
    await setNangoWebhookOverride(saved.connectionId, saved.providerConfigKey)
}

export function startSlackPoller() {
    const globalRef = globalThis as typeof globalThis & { __dupliSlackPoller?: NodeJS.Timeout }
    if (globalRef.__dupliSlackPoller) {
        clearInterval(globalRef.__dupliSlackPoller)
        delete globalRef.__dupliSlackPoller
    }
}

startSlackPoller()

