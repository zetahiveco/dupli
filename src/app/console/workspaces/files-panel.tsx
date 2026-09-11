"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronRight, FilePlus, FolderPlus, File as FileIcon, Folder, Upload } from "lucide-react"
import { PiSpinner } from "react-icons/pi"
import { toast } from "sonner"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { SandboxEntry } from "@/services/workspace-types"
import { addWorkspaceFile, addWorkspaceFolder, moveWorkspacePath, removeWorkspacePath, uploadWorkspaceFile } from "./actions"

type TreeNode = SandboxEntry & { children: TreeNode[] }

function buildTree(entries: SandboxEntry[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    const ensure = (path: string, isDir: boolean) => {
        const existing = map.get(path)
        if (existing) {
            if (isDir) existing.isDir = true
            return existing
        }
        const node: TreeNode = {
            path,
            name: path.split("/").pop() || path,
            isDir,
            children: [],
        }
        map.set(path, node)
        const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""
        if (parent) ensure(parent, true).children.push(node)
        return node
    }
    for (const entry of entries) ensure(entry.path, entry.isDir)
    const roots = [...map.values()].filter((node) => !node.path.includes("/"))
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name))
        for (const node of nodes) sortNodes(node.children)
    }
    sortNodes(roots)
    return roots
}

export default function FilesPanel({
    workspaceId,
    entries,
    onOpenFile,
    onRefresh,
    onPathRemoved,
    onPathRenamed,
}: {
    workspaceId: string
    entries: SandboxEntry[]
    onOpenFile: (path: string) => void
    onRefresh: () => Promise<void>
    onPathRemoved: (path: string) => void
    onPathRenamed: (from: string, to: string) => void
}) {
    const tree = useMemo(() => buildTree(entries), [entries])
    const [selected, setSelected] = useState<TreeNode | null>(null)
    const [createKind, setCreateKind] = useState<"file" | "folder" | null>(null)
    const [createName, setCreateName] = useState("")
    const [renameTarget, setRenameTarget] = useState<TreeNode | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const [uploading, setUploading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const baseDir = selected?.isDir
        ? selected.path
        : selected
            ? selected.path.split("/").slice(0, -1).join("/")
            : ""

    const submitCreate = async () => {
        const leaf = createName.trim().replace(/^\/+/, "")
        if (!leaf || !createKind) return
        const path = baseDir ? `${baseDir}/${leaf}` : leaf
        try {
            if (createKind === "file") await addWorkspaceFile(workspaceId, path)
            else await addWorkspaceFolder(workspaceId, path)
            setCreateKind(null)
            setCreateName("")
            await onRefresh()
            if (createKind === "file") onOpenFile(path)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not create")
        }
    }

    const submitRename = async () => {
        if (!renameTarget) return
        const nextName = renameValue.trim()
        if (!nextName || nextName.includes("/")) {
            toast.error("Enter a file name without slashes")
            return
        }
        const parent = renameTarget.path.includes("/")
            ? renameTarget.path.slice(0, renameTarget.path.lastIndexOf("/"))
            : ""
        const to = parent ? `${parent}/${nextName}` : nextName
        if (to === renameTarget.path) {
            setRenameTarget(null)
            return
        }
        try {
            await moveWorkspacePath(workspaceId, renameTarget.path, to)
            onPathRenamed(renameTarget.path, to)
            setRenameTarget(null)
            await onRefresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not rename")
        }
    }

    const uploadFiles = async (fileList: FileList | null) => {
        if (!fileList?.length) return
        setUploading(true)
        try {
            const uploaded: string[] = []
            for (const file of Array.from(fileList)) {
                const form = new FormData()
                form.append("file", file)
                if (baseDir) form.append("path", baseDir)
                const result = await uploadWorkspaceFile(workspaceId, form)
                uploaded.push(result.path)
            }
            await onRefresh()
            toast.success(uploaded.length === 1 ? `Uploaded ${uploaded[0]}` : `Uploaded ${uploaded.length} files`)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not upload file")
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ""
        }
    }

    const removePath = async (node: TreeNode) => {
        try {
            await removeWorkspacePath(workspaceId, node.path)
            onPathRemoved(node.path)
            if (selected?.path === node.path) setSelected(null)
            await onRefresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete")
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col" data-tour="files">
            <div className="flex h-9 items-center justify-between border-b border-white/10 px-3">
                <span className="text-xs font-medium text-white/70">Files</span>
                <div className="flex items-center gap-1">
                    <input
                        ref={fileRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => void uploadFiles(e.target.files)}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-white/60 hover:text-white"
                        title={baseDir ? `Upload to ${baseDir}` : "Upload files"}
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                    >
                        {uploading ? <PiSpinner className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-white/60 hover:text-white"
                        title="New file"
                        onClick={() => {
                            setCreateKind("file")
                            setCreateName("")
                        }}
                    >
                        <FilePlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-white/60 hover:text-white"
                        title="New folder"
                        onClick={() => {
                            setCreateKind("folder")
                            setCreateName("")
                        }}
                    >
                        <FolderPlus className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto py-1">
                {tree.length === 0 ? (
                    <p className="px-3 py-4 text-[11px] text-white/35">No files yet.</p>
                ) : (
                    tree.map((node) => (
                        <FileRow
                            key={node.path}
                            node={node}
                            depth={0}
                            selectedPath={selected?.path ?? null}
                            onSelect={setSelected}
                            onOpenFile={onOpenFile}
                            onRename={(item) => {
                                setRenameTarget(item)
                                setRenameValue(item.name)
                            }}
                            onDelete={(item) => void removePath(item)}
                        />
                    ))
                )}
            </div>

            <Dialog open={createKind !== null} onOpenChange={(open) => !open && setCreateKind(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{createKind === "folder" ? "New folder" : "New file"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            placeholder={baseDir ? `${baseDir}/name` : "src/app.ts"}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void submitCreate()
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="h-9" onClick={() => setCreateKind(null)}>Cancel</Button>
                        <Button className="h-9 bg-brand text-white" onClick={() => void submitCreate()}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rename</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void submitRename()
                        }}
                    />
                    <DialogFooter>
                        <Button variant="outline" className="h-9" onClick={() => setRenameTarget(null)}>Cancel</Button>
                        <Button className="h-9 bg-brand text-white" onClick={() => void submitRename()}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function FileRow({
    node,
    depth,
    selectedPath,
    onSelect,
    onOpenFile,
    onRename,
    onDelete,
}: {
    node: TreeNode
    depth: number
    selectedPath: string | null
    onSelect: (node: TreeNode) => void
    onOpenFile: (path: string) => void
    onRename: (node: TreeNode) => void
    onDelete: (node: TreeNode) => void
}) {
    const [open, setOpen] = useState(depth < 2)
    return (
        <div>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "flex w-full items-center gap-1 px-2 py-0.5 text-left text-[11px] hover:bg-white/[0.05]",
                            selectedPath === node.path ? "bg-brand/12 text-brand" : "text-white/75",
                        )}
                        style={{ paddingLeft: 8 + depth * 12 }}
                        onClick={() => {
                            onSelect(node)
                            if (node.isDir) setOpen((value) => !value)
                            else onOpenFile(node.path)
                        }}
                    >
                        {node.isDir ? (
                            <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")} />
                        ) : (
                            <span className="w-3" />
                        )}
                        {node.isDir ? <Folder className="h-3 w-3 shrink-0" /> : <FileIcon className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{node.name}</span>
                    </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => onRename(node)}>Rename</ContextMenuItem>
                    <ContextMenuItem variant="destructive" onClick={() => onDelete(node)}>Delete</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
            {node.isDir && open
                ? node.children.map((child) => (
                    <FileRow
                        key={child.path}
                        node={child}
                        depth={depth + 1}
                        selectedPath={selectedPath}
                        onSelect={onSelect}
                        onOpenFile={onOpenFile}
                        onRename={onRename}
                        onDelete={onDelete}
                    />
                ))
                : null}
        </div>
    )
}
