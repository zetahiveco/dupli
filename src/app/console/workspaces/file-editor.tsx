"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import type { OnMount } from "@monaco-editor/react"
import { PiSpinner } from "react-icons/pi"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getWorkspaceFile, getWorkspaceFileDiff, keepWorkspaceChange, saveWorkspaceFile, undoWorkspaceChange } from "./actions"
import DiffView from "./diff-view"
import { cn } from "@/lib/utils"

const EDITOR_THEME = {
    base: "vs-dark" as const,
    inherit: true,
    rules: [],
    colors: {
        "editor.background": "#08080A",
        "editor.foreground": "#E8E8EA",
        "editorLineNumber.foreground": "#FFFFFF55",
        "editorLineNumber.activeForeground": "#FF8437",
        "editorCursor.foreground": "#FF8437",
        "editor.selectionBackground": "#FF843733",
        "editor.inactiveSelectionBackground": "#FF84371F",
        "editor.lineHighlightBackground": "#0B0B0E",
        "editorGutter.background": "#08080A",
        "scrollbarSlider.background": "#FFFFFF14",
        "scrollbarSlider.hoverBackground": "#FFFFFF24",
    },
}

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full items-center justify-center">
            <PiSpinner className="animate-spin text-white/40" />
        </div>
    ),
})

function languageFromPath(path: string) {
    const name = path.split("/").pop()?.toLowerCase() || ""
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : name
    const languages: Record<string, string> = {
        ts: "typescript",
        tsx: "typescript",
        js: "javascript",
        jsx: "javascript",
        mjs: "javascript",
        cjs: "javascript",
        json: "json",
        md: "markdown",
        mdx: "markdown",
        py: "python",
        rs: "rust",
        go: "go",
        rb: "ruby",
        php: "php",
        java: "java",
        kt: "kotlin",
        swift: "swift",
        css: "css",
        scss: "scss",
        less: "less",
        html: "html",
        htm: "html",
        xml: "xml",
        svg: "xml",
        yml: "yaml",
        yaml: "yaml",
        toml: "ini",
        ini: "ini",
        env: "ini",
        sh: "shell",
        bash: "shell",
        zsh: "shell",
        sql: "sql",
        graphql: "graphql",
        gql: "graphql",
        dockerfile: "dockerfile",
        gitignore: "ignore",
        dockerignore: "ignore",
        prisma: "plaintext",
        txt: "plaintext",
    }
    if (name === "dockerfile") return "dockerfile"
    if (name === "makefile") return "plaintext"
    return languages[ext] || "plaintext"
}

export default function FileEditor({
    workspaceId,
    path,
    patch,
    extra,
    diffMode = false,
    onDiffMode,
    onSaved,
    onResolved,
}: {
    workspaceId: string
    path: string
    patch?: string
    extra?: string
    diffMode?: boolean
    onDiffMode?: (next: boolean) => void
    onSaved?: () => void
    onResolved?: (result: { action: "keep" | "undo"; deleted?: boolean }) => void
}) {
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [binary, setBinary] = useState(false)
    const [tooLarge, setTooLarge] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [livePatch, setLivePatch] = useState(patch || "")
    const [resolving, setResolving] = useState<"keep" | "undo" | null>(null)
    const [dismissed, setDismissed] = useState(false)
    const saveRef = useRef<() => void>(() => undefined)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setDirty(false)
        setDismissed(false)
        void (async () => {
            try {
                const file = await getWorkspaceFile(workspaceId, path)
                if (cancelled) return
                setContent(file.content)
                setBinary(file.binary)
                setTooLarge(file.tooLarge)
            } catch (error) {
                if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not open file")
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [workspaceId, path])

    useEffect(() => {
        let cancelled = false
        void (async () => {
            try {
                const next = await getWorkspaceFileDiff(workspaceId, path)
                if (!cancelled) setLivePatch(next || "")
            } catch {
                if (!cancelled) setLivePatch(patch || "")
            }
        })()
        return () => {
            cancelled = true
        }
    }, [workspaceId, path, patch])

    const shownPatch = livePatch || patch || ""
    const canDiff = Boolean(shownPatch) && !dismissed
    const viewingDiff = Boolean(diffMode && canDiff)

    const save = async () => {
        if (saving || !dirty) return
        setSaving(true)
        try {
            await saveWorkspaceFile(workspaceId, path, content)
            setDirty(false)
            toast.success("Saved")
            await onSaved?.()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save")
        } finally {
            setSaving(false)
        }
    }

    saveRef.current = () => {
        void save()
    }

    const resolveChange = async (action: "keep" | "undo") => {
        if (resolving || !canDiff) return
        setResolving(action)
        try {
            if (action === "keep") {
                await keepWorkspaceChange(workspaceId, path)
            } else {
                await undoWorkspaceChange(workspaceId, path, shownPatch || patch, extra)
            }
            setLivePatch("")
            setDismissed(true)
            onDiffMode?.(false)
            const deleted = action === "undo" && (extra === "A" || extra === "??" || extra === "AD")
            if (action === "undo" && !deleted) {
                try {
                    const file = await getWorkspaceFile(workspaceId, path)
                    setContent(file.content)
                    setBinary(file.binary)
                    setTooLarge(file.tooLarge)
                    setDirty(false)
                } catch {
                    // file may have been removed
                }
            }
            toast.success(action === "keep" ? "Kept" : "Undone")
            await onSaved?.()
            onResolved?.({ action, deleted })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : action === "keep" ? "Could not keep" : "Could not undo")
        } finally {
            setResolving(null)
        }
    }

    const onMount: OnMount = (editor, monaco) => {
        monaco.editor.defineTheme("dupli-dark", EDITOR_THEME)
        monaco.editor.setTheme("dupli-dark")
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            saveRef.current()
        })
    }

    if (loading && !viewingDiff) {
        return (
            <div className="flex h-full items-center justify-center">
                <PiSpinner className="animate-spin text-white/40" />
            </div>
        )
    }

    if (!viewingDiff && tooLarge) {
        return <p className="px-4 py-6 text-sm text-white/40">This file is too large to open here.</p>
    }

    if (!viewingDiff && binary) {
        return <p className="px-4 py-6 text-sm text-white/40">Binary file.</p>
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 px-3">
                {canDiff ? (
                    <div className="flex items-center gap-1 text-xs">
                        <button
                            type="button"
                            className={cn(
                                "px-2 py-1",
                                viewingDiff ? "border-b-2 border-brand text-brand" : "text-white/40 hover:text-white/80",
                            )}
                            onClick={() => onDiffMode?.(true)}
                        >
                            Diff
                        </button>
                        <button
                            type="button"
                            className={cn(
                                "px-2 py-1",
                                !viewingDiff ? "border-b-2 border-brand text-brand" : "text-white/40 hover:text-white/80",
                            )}
                            onClick={() => onDiffMode?.(false)}
                        >
                            File
                        </button>
                    </div>
                ) : (
                    <span />
                )}
                <div className="flex items-center gap-1.5">
                    {canDiff ? (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-white/15 bg-transparent px-2.5 text-[#3fb950] hover:bg-[#3fb950]/10 hover:text-[#3fb950]"
                                disabled={Boolean(resolving)}
                                onClick={() => void resolveChange("keep")}
                            >
                                {resolving === "keep" ? <PiSpinner className="animate-spin" /> : "Keep"}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-white/15 bg-transparent px-2.5 text-[#f85149] hover:bg-[#f85149]/10 hover:text-[#f85149]"
                                disabled={Boolean(resolving)}
                                onClick={() => void resolveChange("undo")}
                            >
                                {resolving === "undo" ? <PiSpinner className="animate-spin" /> : "Undo"}
                            </Button>
                        </>
                    ) : null}
                    <Button
                        size="sm"
                        className="h-7 bg-brand text-white"
                        disabled={saving || !dirty || viewingDiff || Boolean(resolving)}
                        onClick={() => void save()}
                    >
                        {saving ? <PiSpinner className="animate-spin" /> : "Save"}
                    </Button>
                </div>
            </div>
            {viewingDiff ? (
                <div className="min-h-0 flex-1 overflow-auto">
                    <DiffView patch={shownPatch} />
                </div>
            ) : (
                <div className="min-h-0 flex-1">
                    <MonacoEditor
                    height="100%"
                    language={languageFromPath(path)}
                    theme="dupli-dark"
                    value={content}
                    onChange={(value) => {
                        setContent(value ?? "")
                        setDirty(true)
                    }}
                    beforeMount={(monaco) => {
                        monaco.editor.defineTheme("dupli-dark", EDITOR_THEME)
                    }}
                    onMount={onMount}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineHeight: 20,
                        tabSize: 2,
                        padding: { top: 12, bottom: 12 },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: "on",
                        renderLineHighlight: "line",
                        overviewRulerLanes: 0,
                        hideCursorInOverviewRuler: true,
                        scrollbar: {
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                        },
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    }}
                    loading={
                        <div className="flex h-full items-center justify-center">
                            <PiSpinner className="animate-spin text-white/40" />
                        </div>
                    }
                    />
                </div>
            )}
        </div>
    )
}
