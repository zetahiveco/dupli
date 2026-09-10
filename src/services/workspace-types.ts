import type { Harness } from "../../generated/prisma/enums"

export type FileChange = {
    path: string
    extra?: string
    patch?: string
}

const DIFF_SKIP_DIRS = new Set(["log", "logs", ".logs", "logfiles", "log-files", "tmp", "temp", ".tmp", ".temp"])

/** Home/session dirs coding agents write when the machine home is the workspace. */
export const HARNESS_STATE_DIRS = [
    ".claude",
    ".codex",
    ".codex-log",
    ".codex-module",
    ".gemini",
    ".dsh",
    ".kimi-code",
    ".kimi",
    ".pi",
    ".opencode",
    ".muse",
    ".fx",
    ".fireconnect",
    ".copilot",
    ".cursor",
    ".aider",
    ".qwen",
    ".factory",
    ".amp",
    ".continue",
    ".cline",
    ".kiro",
    ".openclaw",
    ".omc",
    ".goose",
] as const

const HARNESS_STATE_DIR_SET = new Set(HARNESS_STATE_DIRS.map((dir) => dir.toLowerCase()))

const HARNESS_XDG_APP_DIRS = new Set(["opencode", "amp", "github-copilot", "goose", "kilo", "block"])

const HARNESS_ROOT_FILES = new Set([
    ".claude.json",
    ".aider.chat.history.md",
    ".aider.input.history",
    ".aider.llm.history",
])

export function isIgnoredDiffPath(path: string) {
    const parts = path.replaceAll("\\", "/").split("/").filter(Boolean)
    if (!parts.length) return false
    const lower = parts.map((part) => part.toLowerCase())
    if (lower.some((part) => DIFF_SKIP_DIRS.has(part) || HARNESS_STATE_DIR_SET.has(part) || part.startsWith(".aider"))) {
        return true
    }
    if (lower[0] === ".config" && lower[1] && HARNESS_XDG_APP_DIRS.has(lower[1])) return true
    const name = lower[lower.length - 1]
    if (HARNESS_ROOT_FILES.has(name) || name.startsWith(".aider.")) return true
    if (name.endsWith(".log") || /\.log\.\d+$/.test(name) || /\.log\.(gz|bz2|xz|zip)$/.test(name)) return true
    if (/^(npm-debug|yarn-debug|yarn-error|pnpm-debug|lerna-debug)\.log$/.test(name)) return true
    if (name === "nohup.out" || name === "codex-tui.log") return true
    return false
}

export type SandboxEntry = {
    path: string
    name: string
    isDir: boolean
}

export type ChatAttachment = {
    key: string
    name: string
    contentType?: string
    size?: number
}

export type ChatMessage = {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    createdAt: string
    command?: { cmd: string; output: string; exitCode?: number }
    diffs?: FileChange[]
    attachments?: ChatAttachment[]
    model?: string
}

export type WorkspaceRecord = {
    id: string
    userId: string
    organizationId: string
    name: string
    harness: Harness
    sandboxId: string | null
    messages: ChatMessage[]
    createdAt: Date
    updatedAt: Date
}

export function diffsFromMessages(messages: ChatMessage[]): FileChange[] {
    const byPath = new Map<string, FileChange>()
    for (const message of messages) {
        if (message.role !== "assistant" || !message.diffs?.length) continue
        for (const diff of message.diffs) {
            if (!diff.path || isIgnoredDiffPath(diff.path)) continue
            byPath.set(diff.path, diff)
        }
    }
    return [...byPath.values()]
}
