import { prisma } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"
import {
    assertHasMinutes,
    clearSandboxCursor,
    flushSandboxMinutes,
    markSandboxBillingStart,
} from "@/services/common/billing"
import { getHarnessKey } from "./api-keys"
import { harnessMeta } from "./harness"
import {
    checkpointSandbox,
    captureSandboxDiffs,
    createSandbox,
    createSandboxDir,
    createSandboxFile,
    deleteSandbox,
    deleteSandboxPath,
    diffSandboxFile,
    getSandboxBrowserPreview,
    revertSandboxFileChange,
    listSandboxTree,
    readSandboxFile,
    renameSandboxPath,
    runInSandbox,
    uploadSandboxBytes,
    writeSandboxFile,
    buildSandboxEnv,
    injectSandboxEnv,
    listSandboxChanges,
    commitSandboxPath,
} from "./daytona"
import type { Harness } from "../../generated/prisma/enums"
import type { Prisma } from "../../generated/prisma/client"
import {
    diffsFromMessages,
    type ChatAttachment,
    type ChatMessage,
    type FileChange,
    type WorkspaceRecord,
} from "./workspace-types"

export type { ChatAttachment, ChatMessage, FileChange, WorkspaceRecord }
export { diffsFromMessages }

function parseMessages(raw: unknown): ChatMessage[] {
    if (!Array.isArray(raw)) return []
    return raw.filter((item) => item && typeof item === "object") as ChatMessage[]
}

function toRecord(row: {
    id: string
    userId: string
    organizationId: string
    name: string | null
    harness: Harness
    sandboxId: string | null
    messages: unknown
    createdAt: Date
    updatedAt: Date
}): WorkspaceRecord {
    return {
        ...row,
        name: row.name || "Untitled",
        messages: parseMessages(row.messages),
    }
}

export async function listWorkspaces(organizationId: string) {
    const rows = await prisma.workspace.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
    })
    return rows.map(toRecord)
}

export async function getWorkspace(organizationId: string, id: string) {
    const row = await prisma.workspace.findFirst({
        where: { id, organizationId },
    })
    return row ? toRecord(row) : null
}

export class NeedsApiKeyError extends Error {
    harness: Harness
    constructor(harness: Harness) {
        super("API key required for this harness")
        this.name = "NeedsApiKeyError"
        this.harness = harness
    }
}

export async function createWorkspace(input: {
    organizationId: string
    userId: string
    name: string
    harness: Harness
}) {
    const key = await getHarnessKey(input.organizationId, input.harness)
    if (!key?.apiKey) throw new NeedsApiKeyError(input.harness)
    await assertHasMinutes(input.userId, input.organizationId)

    const id = uuidv4()
    let sandboxId: string | null = null
    try {
        sandboxId = await createSandbox({
            name: input.name || "workspace",
            organizationId: input.organizationId,
            userId: input.userId,
            harness: input.harness,
        })
        if (sandboxId) {
            await markSandboxBillingStart(input.userId, input.organizationId, sandboxId)
        }
    } catch (error) {
        console.error("Workspace create failed", error)
    }

    const row = await prisma.workspace.create({
        data: {
            id,
            userId: input.userId,
            organizationId: input.organizationId,
            name: input.name || "Untitled",
            harness: input.harness,
            sandboxId,
            messages: [],
        },
    })
    return toRecord(row)
}

async function ensureSandbox(workspace: WorkspaceRecord, userId?: string) {
    let sandboxId = workspace.sandboxId
    if (!sandboxId) {
        sandboxId = await createSandbox({
            name: workspace.name,
            organizationId: workspace.organizationId,
            userId: workspace.userId,
            harness: workspace.harness,
        })
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: { sandboxId },
        })
        await markSandboxBillingStart(workspace.userId, workspace.organizationId, sandboxId)
    }
    const ownerId = userId || workspace.userId
    await flushSandboxMinutes(ownerId, workspace.organizationId, sandboxId)
    await assertHasMinutes(ownerId, workspace.organizationId)
    await markSandboxBillingStart(ownerId, workspace.organizationId, sandboxId)
    const env = await buildSandboxEnv({
        organizationId: workspace.organizationId,
        userId: ownerId,
        harness: workspace.harness,
    })
    await injectSandboxEnv(sandboxId, env)
    return { sandboxId, env }
}

function destFilePath(dir: string | undefined, filename: string) {
    const name = filename.replaceAll("\\", "/").split("/").pop()?.trim() || "file"
    const folder = (dir || "").replaceAll("\\", "/").replace(/^\/+|\/+$/g, "")
    return folder ? `${folder}/${name}` : name
}

export async function uploadWorkspaceBytes(
    organizationId: string,
    workspaceId: string,
    filename: string,
    data: Buffer,
    dir?: string,
) {
    const workspace = await getWorkspace(organizationId, workspaceId)
    if (!workspace) throw new Error("Workspace not found")
    const { sandboxId } = await ensureSandbox(workspace)
    const path = destFilePath(dir, filename)
    await uploadSandboxBytes(sandboxId, path, data)
    return { path, name: path.split("/").pop() || filename }
}

export async function sendWorkspaceMessage(input: {
    organizationId: string
    userId: string
    workspaceId: string
    content: string
    model?: string
}) {
    const workspace = await getWorkspace(input.organizationId, input.workspaceId)
    if (!workspace) throw new Error("Workspace not found")

    const key = await getHarnessKey(input.organizationId, workspace.harness)
    if (!key?.apiKey) throw new NeedsApiKeyError(workspace.harness)
    await assertHasMinutes(input.userId, input.organizationId)

    const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: input.content,
        createdAt: new Date().toISOString(),
        ...(input.model ? { model: input.model } : {}),
    }
    const messages = [...workspace.messages, userMessage]

    await prisma.workspace.update({
        where: { id: workspace.id },
        data: { messages: messages as Prisma.InputJsonValue },
    })

    const meta = harnessMeta(workspace.harness)
    const extra = (key?.additionalConfig ?? {}) as Record<string, unknown>
    const provider = typeof extra.provider === "string" ? extra.provider : undefined

    let output = ""
    let exitCode = 0
    let sandboxId = workspace.sandboxId
    let env: Record<string, string> | undefined

    try {
        const ready = await ensureSandbox(workspace, input.userId)
        sandboxId = ready.sandboxId
        env = ready.env
    } catch (error) {
        output = error instanceof Error ? error.message : "Failed to start remote workspace"
        exitCode = 1
    }

    const latest = input.content
    const resume = messages.some((item) => item.role === "assistant")
    const body = meta.resumesSession || !resume ? latest : conversationFollowUp(messages, latest)
    const prompt = `You are running unattended in an isolated machine. Do not ask for approval. Write files and run commands yourself.\n\n${body}`
    const cmd = meta.command(prompt, {
        provider,
        model: input.model,
        resume: Boolean(meta.resumesSession && resume),
    })

    let attemptedRun = false
    if (sandboxId && !output) {
        try {
            await checkpointSandbox(sandboxId)
        } catch {
            // git may not be ready
        }
        attemptedRun = true
        try {
            const result = await runInSandbox({ sandboxId, command: cmd, env, timeout: 240 })
            output = result.stdout || "(no output)"
            exitCode = result.exitCode
        } catch (error) {
            output = error instanceof Error ? error.message : "Command failed"
            exitCode = 1
        }
        try {
            await flushSandboxMinutes(input.userId, input.organizationId, sandboxId)
        } catch {
            // usage is flushed on the next read
        }
    }

    let diffs: FileChange[] = []
    if (sandboxId && attemptedRun) {
        try {
            diffs = await captureSandboxDiffs(sandboxId)
        } catch {
            diffs = []
        }
    }

    const assistant: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: exitCode === 0 ? output.slice(0, 8000) : `The run failed.\n\n${output.slice(0, 4000)}`,
        createdAt: new Date().toISOString(),
        command: { cmd, output: output.slice(0, 12000), exitCode },
        ...(diffs.length ? { diffs } : {}),
    }

    const next = [...messages, assistant]
    const updated = await prisma.workspace.update({
        where: { id: workspace.id },
        data: { messages: next as Prisma.InputJsonValue },
    })
    return toRecord(updated)
}

function conversationFollowUp(messages: ChatMessage[], latest: string) {
    const prior = messages
        .slice(0, -1)
        .filter((item) => item.role === "user" || item.role === "assistant")
        .slice(-8)
    if (!prior.length) return latest
    const transcript = prior
        .map((item) => `${item.role === "user" ? "User" : "Assistant"}:\n${item.content.slice(0, 2500)}`)
        .join("\n\n")
    return `This is a follow-up in the same workspace conversation. Stay on the previous task unless the user changes it.\n\n${transcript}\n\nUser:\n${latest}`
}

function mergeChanges(live: FileChange[], fromMessages: FileChange[]) {
    const liveByPath = new Map(live.map((file) => [file.path, file]))
    return fromMessages.map((file) => {
        const current = liveByPath.get(file.path)
        return {
            path: file.path,
            extra: current?.extra || file.extra,
            patch: file.patch || current?.patch,
        }
    })
}

async function collectWorkspaceChanges(workspace: WorkspaceRecord): Promise<FileChange[]> {
    const fromMessages = diffsFromMessages(workspace.messages)
    if (!workspace.sandboxId) return fromMessages
    try {
        const live = await listSandboxChanges(workspace.sandboxId)
        return mergeChanges(live, fromMessages)
    } catch {
        return fromMessages
    }
}

export async function workspaceChanges(organizationId: string, workspaceId: string) {
    const workspace = await getWorkspace(organizationId, workspaceId)
    if (!workspace) return []
    return collectWorkspaceChanges(workspace)
}

async function requireSandbox(organizationId: string, workspaceId: string) {
    const workspace = await getWorkspace(organizationId, workspaceId)
    if (!workspace?.sandboxId) throw new Error("Workspace is not running")
    await flushSandboxMinutes(workspace.userId, organizationId, workspace.sandboxId)
    await assertHasMinutes(workspace.userId, organizationId)
    await markSandboxBillingStart(workspace.userId, organizationId, workspace.sandboxId)
    return workspace.sandboxId
}

export async function listWorkspaceFiles(organizationId: string, workspaceId: string) {
    return listSandboxTree(await requireSandbox(organizationId, workspaceId))
}

export async function readWorkspaceFile(organizationId: string, workspaceId: string, path: string) {
    return readSandboxFile(await requireSandbox(organizationId, workspaceId), path)
}

export async function writeWorkspaceFile(organizationId: string, workspaceId: string, path: string, content: string) {
    await writeSandboxFile(await requireSandbox(organizationId, workspaceId), path, content)
}

export async function createWorkspaceFile(organizationId: string, workspaceId: string, path: string) {
    await createSandboxFile(await requireSandbox(organizationId, workspaceId), path)
}

export async function createWorkspaceFolder(organizationId: string, workspaceId: string, path: string) {
    await createSandboxDir(await requireSandbox(organizationId, workspaceId), path)
}

export async function deleteWorkspacePath(organizationId: string, workspaceId: string, path: string) {
    await deleteSandboxPath(await requireSandbox(organizationId, workspaceId), path)
}

export async function renameWorkspacePath(organizationId: string, workspaceId: string, from: string, to: string) {
    await renameSandboxPath(await requireSandbox(organizationId, workspaceId), from, to)
}

export async function diffWorkspaceFile(organizationId: string, workspaceId: string, path: string) {
    return diffSandboxFile(await requireSandbox(organizationId, workspaceId), path)
}

function messagesWithoutPaths(messages: ChatMessage[], paths: Set<string>) {
    return messages.map((message) => {
        if (!message.diffs?.length) return message
        const diffs = message.diffs.filter((diff) => !paths.has(diff.path))
        if (diffs.length === message.diffs.length) return message
        if (!diffs.length) {
            const rest = { ...message }
            delete rest.diffs
            return rest
        }
        return { ...message, diffs }
    })
}

function messagesWithoutPath(messages: ChatMessage[], path: string) {
    return messagesWithoutPaths(messages, new Set([path]))
}

async function persistStrippedPaths(organizationId: string, workspaceId: string, paths: string[]) {
    const workspace = await getWorkspace(organizationId, workspaceId)
    if (!workspace) throw new Error("Workspace not found")
    const next = messagesWithoutPaths(workspace.messages, new Set(paths))
    const updated = await prisma.workspace.update({
        where: { id: workspace.id },
        data: { messages: next as Prisma.InputJsonValue },
    })
    return toRecord(updated)
}

async function persistStrippedPath(organizationId: string, workspaceId: string, path: string) {
    return persistStrippedPaths(organizationId, workspaceId, [path])
}

export async function keepWorkspaceFileChange(organizationId: string, workspaceId: string, path: string) {
    const workspace = await getWorkspace(organizationId, workspaceId)
    if (!workspace) throw new Error("Workspace not found")
    if (workspace.sandboxId) await commitSandboxPath(workspace.sandboxId, path)
    return persistStrippedPath(organizationId, workspaceId, path)
}

export async function keepWorkspaceFileChanges(organizationId: string, workspaceId: string) {
    const workspace = await getWorkspace(organizationId, workspaceId)
    if (!workspace) throw new Error("Workspace not found")
    const files = await collectWorkspaceChanges(workspace)
    if (workspace.sandboxId) await checkpointSandbox(workspace.sandboxId)
    if (!files.length) return workspace
    return persistStrippedPaths(organizationId, workspaceId, files.map((file) => file.path))
}

export async function undoWorkspaceFileChange(
    organizationId: string,
    workspaceId: string,
    path: string,
    patch?: string,
    extra?: string,
) {
    const sandboxId = await requireSandbox(organizationId, workspaceId)
    await revertSandboxFileChange(sandboxId, path, patch, extra)
    return persistStrippedPath(organizationId, workspaceId, path)
}

export async function undoWorkspaceFileChanges(organizationId: string, workspaceId: string) {
    const workspace = await getWorkspace(organizationId, workspaceId)
    if (!workspace) throw new Error("Workspace not found")
    const files = await collectWorkspaceChanges(workspace)
    if (!files.length) return workspace
    const sandboxId = await requireSandbox(organizationId, workspaceId)
    const undone: string[] = []
    const failures: string[] = []
    for (const file of files) {
        try {
            await revertSandboxFileChange(sandboxId, file.path, file.patch, file.extra, { checkpoint: false })
            undone.push(file.path)
        } catch {
            failures.push(file.path)
        }
    }
    if (undone.length) await checkpointSandbox(sandboxId)
    const next = undone.length ? await persistStrippedPaths(organizationId, workspaceId, undone) : workspace
    if (failures.length) throw new Error(`Could not undo ${failures.length} file${failures.length === 1 ? "" : "s"}`)
    return next
}

export async function workspaceBrowserPreview(organizationId: string, workspaceId: string) {
    return getSandboxBrowserPreview(await requireSandbox(organizationId, workspaceId))
}

export async function deleteWorkspace(organizationId: string, id: string) {
    const workspace = await getWorkspace(organizationId, id)
    if (!workspace) return
    if (workspace.sandboxId) {
        await clearSandboxCursor(workspace.userId, organizationId, workspace.sandboxId)
        await deleteSandbox(workspace.sandboxId)
    }
    await prisma.workspace.delete({ where: { id } })
}

export async function renameWorkspace(organizationId: string, id: string, name: string) {
    const workspace = await getWorkspace(organizationId, id)
    if (!workspace) throw new Error("Workspace not found")
    const row = await prisma.workspace.update({
        where: { id },
        data: { name },
    })
    return toRecord(row)
}
