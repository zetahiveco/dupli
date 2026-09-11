"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Send, GitBranch, Trash2, X, Globe, Upload } from "lucide-react"
import { PiSpinner } from "react-icons/pi"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { defaultModel, defaultProvider, HARNESS_META, harnessModels, harnessName } from "@/services/harness"
import { HarnessLogo } from "@/components/shared/harness-logo"
import {
    getOrgWorkspace,
    getWorkspaceChanges,
    getWorkspaceFiles,
    keepAllWorkspaceChanges,
    removeWorkspace,
    renameOrgWorkspace,
    sendMessage,
    undoAllWorkspaceChanges,
    uploadWorkspaceFile,
} from "./actions"
import { saveHarnessApiKey } from "../settings/actions"
import { type ChatMessage, type FileChange, type SandboxEntry, type WorkspaceRecord } from "@/services/workspace-types"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import FileEditor from "./file-editor"
import FilesPanel from "./files-panel"
import BrowserPanel from "./browser-panel"
import { cn } from "@/lib/utils"

const BROWSER_TAB = "__browser__"

export default function WorkspaceView({ workspaceId }: { workspaceId: string }) {
    const router = useRouter()
    const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null)
    const [loading, setLoading] = useState(true)
    const [draft, setDraft] = useState("")
    const [sending, setSending] = useState(false)
    const [files, setFiles] = useState<SandboxEntry[]>([])
    const [openFiles, setOpenFiles] = useState<string[]>([])
    const [activeTab, setActiveTab] = useState<string>("chat")
    const [needsKey, setNeedsKey] = useState(false)
    const [apiKey, setApiKey] = useState("")
    const [provider, setProvider] = useState("")
    const [title, setTitle] = useState("")
    const [model, setModel] = useState("")
    const [uploading, setUploading] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [diffModeByPath, setDiffModeByPath] = useState<Record<string, boolean>>({})
    const [resolvingAll, setResolvingAll] = useState<"keep" | "undo" | null>(null)
    const [changes, setChanges] = useState<FileChange[]>([])
    const fileRef = useRef<HTMLInputElement>(null)
    const chatScrollRef = useRef<HTMLDivElement>(null)
    const chatContentRef = useRef<HTMLDivElement>(null)

    const load = async () => {
        const row = await getOrgWorkspace(workspaceId)
        setWorkspace(row)
        if (row) {
            setTitle(row.name)
            setProvider(defaultProvider(row.harness))
            const lastModel = [...row.messages].reverse().find((item) => item.role === "user" && item.model)?.model
            setModel(lastModel || defaultModel(row.harness))
        }
        if (row?.sandboxId) {
            const nextFiles = await getWorkspaceFiles(workspaceId).catch(() => [])
            setFiles(nextFiles)
        }
        const nextChanges = await getWorkspaceChanges(workspaceId).catch(() => [])
        setChanges(nextChanges)
        setLoading(false)
    }

    useEffect(() => {
        void load()
    }, [workspaceId])

    useLayoutEffect(() => {
        if (activeTab !== "chat") return
        const scroller = chatScrollRef.current
        if (!scroller) return
        const pin = () => {
            scroller.scrollTop = 0
        }
        pin()
        const frame = requestAnimationFrame(pin)
        return () => cancelAnimationFrame(frame)
    }, [activeTab, sending, workspace?.id, workspace?.messages])

    const lastCommand = useMemo(() => {
        const messages = workspace?.messages ?? []
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].command) return messages[i].command
        }
        return null
    }, [workspace])

    const refreshChanges = async () => {
        const nextChanges = await getWorkspaceChanges(workspaceId).catch(() => [])
        setChanges(nextChanges)
    }

    const submit = async () => {
        const content = draft.trim()
        if (!content || sending) return
        setSending(true)
        setDraft("")
        try {
            const result = await sendMessage(workspaceId, content, {
                model: model || undefined,
            })
            if (result.needsApiKey) {
                setNeedsKey(true)
                setDraft(content)
                return
            }
            if (result.workspace) {
                setWorkspace(result.workspace)
                const nextFiles = await getWorkspaceFiles(workspaceId).catch(() => [])
                setFiles(nextFiles)
                await refreshChanges()
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to send")
            setDraft(content)
            if (error instanceof Error && error.message.toLowerCase().includes("insufficient minutes")) {
                window.dispatchEvent(new Event("billing:refresh"))
            }
        } finally {
            setSending(false)
        }
    }

    const addFiles = async (fileList: FileList | null) => {
        if (!fileList?.length) return
        setUploading(true)
        try {
            const uploaded: string[] = []
            for (const file of Array.from(fileList)) {
                const form = new FormData()
                form.append("file", file)
                const result = await uploadWorkspaceFile(workspaceId, form)
                uploaded.push(result.path)
            }
            await refreshFiles()
            toast.success(uploaded.length === 1 ? `Uploaded ${uploaded[0]}` : `Uploaded ${uploaded.length} files`)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not upload file")
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ""
        }
    }

    const saveKeyAndRetry = async () => {
        if (!workspace || !apiKey.trim()) return
        await saveHarnessApiKey({
            harness: workspace.harness,
            apiKey: apiKey.trim(),
            provider: provider || undefined,
        })
        setNeedsKey(false)
        toast.success("API key saved")
        if (draft.trim()) void submit()
    }

    const confirmDeleteWorkspace = async () => {
        if (!workspace || deleting) return
        setDeleting(true)
        try {
            await removeWorkspace(workspace.id)
            setConfirmDelete(false)
            router.push("/console/workspaces")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete workspace")
        } finally {
            setDeleting(false)
        }
    }

    const refreshFiles = async () => {
        const nextFiles = await getWorkspaceFiles(workspaceId).catch(() => [])
        setFiles(nextFiles)
        await refreshChanges()
    }

    const openFileTab = (path: string, asDiff = false) => {
        setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]))
        setActiveTab(path)
        setDiffModeByPath((prev) => ({ ...prev, [path]: asDiff }))
    }

    const closeFileTab = (path: string) => {
        setOpenFiles((prev) => prev.filter((item) => item !== path))
        setDiffModeByPath((prev) => {
            const next = { ...prev }
            delete next[path]
            return next
        })
        setActiveTab((current) => (current === path ? "chat" : current))
    }

    const resolveAllChanges = async (action: "keep" | "undo") => {
        if (resolvingAll || changes.length === 0) return
        setResolvingAll(action)
        const resolved = changes.map((file) => file.path)
        try {
            if (action === "keep") await keepAllWorkspaceChanges(workspaceId)
            else await undoAllWorkspaceChanges(workspaceId)
            setOpenFiles((prev) => prev.filter((path) => !resolved.includes(path)))
            setActiveTab((current) => (resolved.includes(current) ? "chat" : current))
            setDiffModeByPath({})
            toast.success(action === "keep" ? "Kept all" : "Undone all")
            await load()
            await refreshFiles()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : action === "keep" ? "Could not keep all" : "Could not undo all")
            await load()
            await refreshFiles()
        } finally {
            setResolvingAll(null)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <PiSpinner className="animate-spin text-2xl text-white/40" />
            </div>
        )
    }

    if (!workspace) {
        return <div className="flex h-full items-center justify-center text-sm text-white/50">Workspace not found.</div>
    }

    const meta = HARNESS_META.find((item) => item.id === workspace.harness)

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
                <div className="min-w-0">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={async () => {
                            if (!title.trim() || title.trim() === workspace.name) return
                            const updated = await renameOrgWorkspace(workspace.id, title.trim())
                            setWorkspace(updated)
                        }}
                        className="w-full bg-transparent text-sm font-semibold outline-none"
                    />
                    <p className="flex items-center gap-1.5 text-[11px] text-white/40">
                        <HarnessLogo harness={workspace.harness} className="h-3.5 w-3.5 text-white/55" />
                        {harnessName(workspace.harness)} · Organization API key
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/50 hover:text-red-400"
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Delete workspace"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </header>

            <div className="flex min-h-0 flex-1">
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={68} minSize={40} className="min-h-0 overflow-hidden">
                        <div className="flex h-full min-h-0 flex-col overflow-hidden">
                            <div className="flex h-9 items-center border-b border-white/10">
                                <div className="flex shrink-0 items-center gap-1 px-2">
                                    <button
                                        type="button"
                                        className={cn(
                                            "inline-flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-xs font-medium",
                                            activeTab === "chat" ? "border-b-2 border-brand text-brand" : "text-white/45 hover:text-white/80",
                                        )}
                                        onClick={() => setActiveTab("chat")}
                                    >
                                        <HarnessLogo harness={workspace.harness} className="h-3.5 w-3.5" />
                                        {harnessName(workspace.harness)}
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            "inline-flex shrink-0 items-center gap-1 px-2 py-1.5 text-xs font-medium",
                                            activeTab === BROWSER_TAB ? "border-b-2 border-brand text-brand" : "text-white/45 hover:text-white/80",
                                        )}
                                        onClick={() => setActiveTab(BROWSER_TAB)}
                                    >
                                        <Globe className="h-3 w-3" />
                                        Browser
                                    </button>
                                </div>
                                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-2">
                                {openFiles.map((path) => (
                                    <span
                                        key={path}
                                        className={cn(
                                            "group flex shrink-0 items-center gap-1 px-2 py-1.5 text-xs",
                                            activeTab === path ? "border-b-2 border-brand text-brand" : "text-white/45 hover:text-white/80",
                                        )}
                                    >
                                        <button type="button" className="max-w-[140px] truncate" onClick={() => setActiveTab(path)}>
                                            {path.split("/").pop()}
                                        </button>
                                        <button
                                            type="button"
                                            className="text-white/30 hover:text-white"
                                            onClick={() => closeFileTab(path)}
                                            aria-label={`Close ${path}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                                </div>
                            </div>
                            {activeTab === "chat" ? (
                            <>
                            <div
                                ref={chatScrollRef}
                                className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto [overflow-anchor:none]"
                            >
                                <div ref={chatContentRef} className="space-y-4 px-6 py-5">
                                    {workspace.messages.length === 0 && (
                                        <p className="text-sm text-white/40">
                                            Ask {harnessName(workspace.harness)} to work in this isolated machine.
                                        </p>
                                    )}
                                    {workspace.messages.map((message) => (
                                        <MessageBubble key={message.id} message={message} />
                                    ))}
                                    {sending && (
                                        <p className="text-xs text-brand">
                                            {harnessName(workspace.harness)} is working…
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="shrink-0 border-t border-white/10 p-3">
                                <div className="flex flex-col border border-white/10 bg-white/3">
                                    <textarea
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder={`Ask ${harnessName(workspace.harness)} to help with coding tasks…`}
                                        className="min-h-24 w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm text-white outline-none placeholder:text-white/35"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault()
                                                void submit()
                                            }
                                        }}
                                    />
                                    <div className="flex justify-end px-2 pb-2">
                                        <button
                                            type="button"
                                            className="inline-flex h-8 w-8 items-center justify-center bg-brand text-white hover:bg-brand/90 disabled:opacity-40"
                                            disabled={sending || !draft.trim()}
                                            onClick={() => void submit()}
                                            aria-label="Send"
                                        >
                                            {sending ? <PiSpinner className="animate-spin" /> : <Send className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => void addFiles(e.target.files)}
                                    />
                                    <button
                                        type="button"
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 text-white/50 hover:text-white disabled:opacity-40"
                                        title="Upload to workspace"
                                        onClick={() => fileRef.current?.click()}
                                        disabled={uploading || sending}
                                    >
                                        {uploading ? <PiSpinner className="animate-spin" /> : <Upload className="h-4 w-4" />}
                                    </button>
                                    {harnessModels(workspace.harness).length > 0 ? (
                                        <Select value={model} onValueChange={setModel}>
                                            <SelectTrigger className="h-9 w-40 shrink-0 text-sm">
                                                <SelectValue placeholder="Model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {harnessModels(workspace.harness).map((option) => (
                                                    <SelectItem key={option.id} value={option.id}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : null}
                                </div>
                            </div>
                            </>
                            ) : activeTab === BROWSER_TAB ? (
                                <div className="min-h-0 flex-1">
                                    <BrowserPanel workspaceId={workspace.id} />
                                </div>
                            ) : (
                                <div className="min-h-0 flex-1">
                                    <FileEditor
                                        key={activeTab}
                                        workspaceId={workspace.id}
                                        path={activeTab}
                                        patch={changes.find((file) => file.path === activeTab)?.patch}
                                        extra={changes.find((file) => file.path === activeTab)?.extra}
                                        pendingChange={changes.some((file) => file.path === activeTab)}
                                        diffMode={Boolean(diffModeByPath[activeTab])}
                                        onDiffMode={(next) => setDiffModeByPath((prev) => ({ ...prev, [activeTab]: next }))}
                                        onSaved={() => void refreshFiles()}
                                        onResolved={(result) => {
                                            setChanges((prev) => prev.filter((file) => file.path !== activeTab))
                                            setDiffModeByPath((prev) => ({ ...prev, [activeTab]: false }))
                                            if (result.deleted) closeFileTab(activeTab)
                                            void load()
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </ResizablePanel>
                    <ResizableHandle className="w-px bg-white/10" />
                    <ResizablePanel defaultSize={32} minSize={22}>
                        <ResizablePanelGroup direction="vertical">
                            <ResizablePanel defaultSize={28} minSize={16}>
                                <div className="flex h-full min-h-0 flex-col">
                                    <div className="flex h-9 items-center justify-between gap-2 border-b border-white/10 px-2">
                                        <span className="shrink-0 text-xs font-medium text-white/70">
                                            <GitBranch className="mr-1 inline h-3 w-3" />
                                            Changes
                                        </span>
                                        <div className="flex min-w-0 items-center gap-1">
                                            <span className="shrink-0 text-[10px] text-white/35">{changes.length} files</span>
                                            {changes.length > 0 ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="shrink-0 px-1.5 py-0.5 text-[10px] text-[#3fb950] hover:bg-[#3fb950]/10 disabled:opacity-40"
                                                        disabled={Boolean(resolvingAll)}
                                                        onClick={() => void resolveAllChanges("keep")}
                                                    >
                                                        {resolvingAll === "keep" ? (
                                                            <PiSpinner className="inline animate-spin" />
                                                        ) : (
                                                            "Keep all"
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="shrink-0 px-1.5 py-0.5 text-[10px] text-[#f85149] hover:bg-[#f85149]/10 disabled:opacity-40"
                                                        disabled={Boolean(resolvingAll)}
                                                        onClick={() => void resolveAllChanges("undo")}
                                                    >
                                                        {resolvingAll === "undo" ? (
                                                            <PiSpinner className="inline animate-spin" />
                                                        ) : (
                                                            "Undo all"
                                                        )}
                                                    </button>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-auto p-2 font-mono text-[11px]">
                                        {changes.length === 0 ? (
                                            <p className="px-1 py-3 text-white/35">No agent changes yet.</p>
                                        ) : (
                                            <ul className="space-y-0.5">
                                                {changes.map((file) => (
                                                    <li key={file.path}>
                                                        <button
                                                            type="button"
                                                            className={cn(
                                                                "flex w-full items-center justify-between gap-2 px-1.5 py-1 text-left hover:bg-white/5",
                                                                activeTab === file.path
                                                                    ? "bg-white/10 text-white"
                                                                    : "text-white/75 hover:text-white",
                                                            )}
                                                            onClick={() => openFileTab(file.path, true)}
                                                        >
                                                            <span className="truncate">{file.path}</span>
                                                            <span
                                                                className={cn(
                                                                    "shrink-0",
                                                                    file.extra === "A" && "text-[#3fb950]",
                                                                    file.extra === "D" && "text-[#f85149]",
                                                                    file.extra !== "A" && file.extra !== "D" && "text-brand",
                                                                )}
                                                            >
                                                                {file.extra || "M"}
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </ResizablePanel>
                            <ResizableHandle className="h-px bg-white/10" />
                            <ResizablePanel defaultSize={32} minSize={16}>
                                <div className="flex h-full min-h-0 flex-col">
                                    <div className="flex h-9 items-center gap-3 border-b border-white/10 px-3 text-xs">
                                        <span className="border-b-2 border-brand py-2 text-brand">Terminal</span>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-auto bg-black/30 p-3 font-mono text-[11px]">
                                        {lastCommand ? (
                                            <pre className="whitespace-pre-wrap text-white/70">
                                                <span className="text-brand">$ {lastCommand.cmd}</span>
                                                {"\n"}
                                                {lastCommand.output}
                                            </pre>
                                        ) : (
                                            <p className="text-white/35">bash — waiting for a command.</p>
                                        )}
                                    </div>
                                </div>
                            </ResizablePanel>
                            <ResizableHandle className="h-px bg-white/10" />
                            <ResizablePanel defaultSize={40} minSize={18}>
                                <FilesPanel
                                    workspaceId={workspace.id}
                                    entries={files}
                                    onOpenFile={(path) => openFileTab(path)}
                                    onRefresh={refreshFiles}
                                    onPathRemoved={(path) => {
                                        closeFileTab(path)
                                        setOpenFiles((prev) => prev.filter((item) => item !== path && !item.startsWith(`${path}/`)))
                                    }}
                                    onPathRenamed={(from, to) => {
                                        setOpenFiles((prev) => prev.map((item) => (item === from ? to : item)))
                                        setActiveTab((current) => (current === from ? to : current))
                                    }}
                                />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            <Dialog open={confirmDelete} onOpenChange={(open) => !deleting && setConfirmDelete(open)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete workspace</DialogTitle>
                        <DialogDescription>
                            Delete {workspace.name}? The machine and chat history will be removed. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-2">
                        <Button variant="outline" className="h-9" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="h-9 bg-red-600 text-white hover:bg-red-600/90"
                            disabled={deleting}
                            onClick={() => void confirmDeleteWorkspace()}
                        >
                            {deleting ? <PiSpinner className="animate-spin" /> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={needsKey} onOpenChange={setNeedsKey}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>API key required</DialogTitle>
                        <DialogDescription>
                            This workspace bills with an organization key, but none is saved for {meta?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={meta?.envKey}
                            className="w-full"
                        />
                        {meta?.needsProvider && meta.providers?.length ? (
                            <div className="space-y-2">
                                <Label>Provider</Label>
                                <Select value={provider || meta.providers[0].id} onValueChange={setProvider}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {meta.providers.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                    </div>
                    <DialogFooter className="pt-2">
                        <Button variant="outline" className="h-9" onClick={() => setNeedsKey(false)}>Cancel</Button>
                        <Button className="h-9 bg-brand text-white" onClick={() => void saveKeyAndRetry()}>Save key</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function MessageBubble({ message }: { message: ChatMessage }) {
    if (message.role === "user") {
        return (
            <div className="ml-auto max-w-[80%] rounded-none border border-brand/25 bg-brand/15 px-3 py-2">
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                {message.attachments?.length ? (
                    <ul className="mt-2 space-y-0.5 text-[11px] text-white/50">
                        {message.attachments.map((file) => (
                            <li key={file.key} className="truncate">📎 {file.name}</li>
                        ))}
                    </ul>
                ) : null}
                <p className="mt-1 text-[10px] text-white/40">{format(new Date(message.createdAt), "h:mm a")}</p>
            </div>
        )
    }
    return (
        <div className="max-w-[90%] space-y-2">
            {message.command ? (
                <pre className="overflow-x-auto border border-white/10 bg-black/40 p-2 text-[11px] text-white/60">
                    $ {message.command.cmd}
                    {"\n"}
                    {message.command.output.slice(0, 2000)}
                </pre>
            ) : (
                <p className="whitespace-pre-wrap text-sm text-white/85">{message.content}</p>
            )}
        </div>
    )
}
