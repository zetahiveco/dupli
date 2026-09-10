"use server"

import { clerkClient } from "@clerk/nextjs/server"
import { requireOrg } from "@/services/auth"
import { getHarnessKey } from "@/services/api-keys"
import {
    createWorkspace,
    createWorkspaceFile,
    createWorkspaceFolder,
    deleteWorkspace,
    deleteWorkspacePath,
    diffWorkspaceFile,
    getWorkspace,
    keepWorkspaceFileChange,
    keepWorkspaceFileChanges,
    listWorkspaces,
    listWorkspaceFiles,
    NeedsApiKeyError,
    readWorkspaceFile,
    renameWorkspace,
    renameWorkspacePath,
    sendWorkspaceMessage,
    undoWorkspaceFileChange,
    undoWorkspaceFileChanges,
    uploadWorkspaceBytes,
    workspaceBrowserPreview,
    workspaceChanges,
    writeWorkspaceFile,
    type WorkspaceRecord,
} from "@/services/workspace"
import type { Harness } from "../../../../generated/prisma/enums"

export async function listOrgWorkspaces() {
    const { orgId } = await requireOrg()
    return listWorkspaces(orgId)
}

export async function getOrgWorkspace(id: string) {
    const { orgId } = await requireOrg()
    return getWorkspace(orgId, id)
}

export async function hasHarnessApiKey(harness: Harness) {
    const { orgId } = await requireOrg()
    const key = await getHarnessKey(orgId, harness)
    return { hasKey: Boolean(key?.apiKey) }
}

export async function renameOrgWorkspace(id: string, name: string) {
    const { orgId } = await requireOrg()
    return renameWorkspace(orgId, id, name)
}

export async function createOrgWorkspace(input: {
    name: string
    harness: Harness
}) {
    const { orgId, userId } = await requireOrg()
    try {
        const workspace = await createWorkspace({
            organizationId: orgId,
            userId,
            name: input.name,
            harness: input.harness,
        })
        return { workspace, needsApiKey: false as const }
    } catch (error) {
        if (error instanceof NeedsApiKeyError) {
            return { workspace: null, needsApiKey: true as const, harness: error.harness }
        }
        throw error
    }
}

export async function sendMessage(
    workspaceId: string,
    content: string,
    options?: { model?: string },
) {
    const { orgId, userId } = await requireOrg()
    try {
        const workspace = await sendWorkspaceMessage({
            organizationId: orgId,
            userId,
            workspaceId,
            content,
            model: options?.model,
        })
        return { workspace, needsApiKey: false as const }
    } catch (error) {
        if (error instanceof NeedsApiKeyError) {
            return { workspace: null, needsApiKey: true as const, harness: error.harness }
        }
        throw error
    }
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export async function uploadWorkspaceFile(workspaceId: string, formData: FormData) {
    const { orgId } = await requireOrg()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new Error("File is required")
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("File must be 20MB or smaller")
    const dir = String(formData.get("path") || "")
    return uploadWorkspaceBytes(
        orgId,
        workspaceId,
        file.name,
        Buffer.from(await file.arrayBuffer()),
        dir,
    )
}

export async function getWorkspaceChanges(workspaceId: string) {
    const { orgId } = await requireOrg()
    return workspaceChanges(orgId, workspaceId)
}

export async function getWorkspaceFiles(workspaceId: string) {
    const { orgId } = await requireOrg()
    return listWorkspaceFiles(orgId, workspaceId)
}

export async function getWorkspaceFile(workspaceId: string, path: string) {
    const { orgId } = await requireOrg()
    return readWorkspaceFile(orgId, workspaceId, path)
}

export async function saveWorkspaceFile(workspaceId: string, path: string, content: string) {
    const { orgId } = await requireOrg()
    await writeWorkspaceFile(orgId, workspaceId, path, content)
    return { success: true }
}

export async function addWorkspaceFile(workspaceId: string, path: string) {
    const { orgId } = await requireOrg()
    await createWorkspaceFile(orgId, workspaceId, path)
    return { success: true }
}

export async function addWorkspaceFolder(workspaceId: string, path: string) {
    const { orgId } = await requireOrg()
    await createWorkspaceFolder(orgId, workspaceId, path)
    return { success: true }
}

export async function removeWorkspacePath(workspaceId: string, path: string) {
    const { orgId } = await requireOrg()
    await deleteWorkspacePath(orgId, workspaceId, path)
    return { success: true }
}

export async function moveWorkspacePath(workspaceId: string, from: string, to: string) {
    const { orgId } = await requireOrg()
    await renameWorkspacePath(orgId, workspaceId, from, to)
    return { success: true }
}

export async function getWorkspaceFileDiff(workspaceId: string, path: string) {
    const { orgId } = await requireOrg()
    return diffWorkspaceFile(orgId, workspaceId, path)
}

export async function keepWorkspaceChange(workspaceId: string, path: string) {
    const { orgId } = await requireOrg()
    return keepWorkspaceFileChange(orgId, workspaceId, path)
}

export async function undoWorkspaceChange(workspaceId: string, path: string, patch?: string, extra?: string) {
    const { orgId } = await requireOrg()
    return undoWorkspaceFileChange(orgId, workspaceId, path, patch, extra)
}

export async function keepAllWorkspaceChanges(workspaceId: string) {
    const { orgId } = await requireOrg()
    return keepWorkspaceFileChanges(orgId, workspaceId)
}

export async function undoAllWorkspaceChanges(workspaceId: string) {
    const { orgId } = await requireOrg()
    return undoWorkspaceFileChanges(orgId, workspaceId)
}

export async function getWorkspaceBrowser(workspaceId: string) {
    const { orgId } = await requireOrg()
    return workspaceBrowserPreview(orgId, workspaceId)
}

export async function removeWorkspace(id: string) {
    const { orgId } = await requireOrg()
    await deleteWorkspace(orgId, id)
    return { success: true }
}

export type SidebarWorkspace = Pick<WorkspaceRecord, "id" | "name" | "harness" | "updatedAt">

export async function getCurrentUser() {
    const { userId } = await requireOrg()
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    return {
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "You",
        imageUrl: user.imageUrl,
    }
}
