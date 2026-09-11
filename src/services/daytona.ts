import { Daytona, type Sandbox } from "@daytona/sdk"
import { getMergedEnv } from "./env"
import { getHarnessKey } from "./api-keys"
import { harnessMeta } from "./harness"
import type { Harness } from "../../generated/prisma/enums"
import { HARNESS_STATE_DIRS, isIgnoredDiffPath, type FileChange, type SandboxEntry } from "./workspace-types"

export type { FileChange, SandboxEntry }

let client: Daytona | null = null

function daytona() {
    if (!client) {
        client = new Daytona({ apiKey: process.env.DAYTONA_API_KEY })
    }
    return client
}

export async function createSandbox(input: {
    name: string
    organizationId: string
    userId: string
    harness: Harness
}) {
    const envVars = await buildSandboxEnv(input)
    const sandbox = await daytona().create(
        {
            name: input.name.slice(0, 60) || "dupli-workspace",
            language: "typescript",
            envVars,
            labels: {
                org: input.organizationId,
                harness: input.harness,
            },
            autoStopInterval: 60,
            autoArchiveInterval: 60 * 24 * 7,
        },
        { timeout: 120 },
    )
    try {
        await sandbox.git.init(".", false, "main")
    } catch {
        // snapshot may already have git
    }
    try {
        await sandbox.fs.uploadFile(
            Buffer.from(
                [
                    ".bash_logout",
                    ".bashrc",
                    ".profile",
                    ".zshrc",
                    ".zprofile",
                    ".face",
                    ".face.icon",
                    ".daytona/",
                    ".cache/",
                    ".local/",
                    ".config/",
                    ".npm/",
                    ".nvm/",
                    ".oh-my-zsh/",
                    "node_modules/",
                    ".aider.chat.history.md",
                    ".aider.input.history",
                    ".aider.llm.history",
                    ".claude.json",
                    ...HARNESS_STATE_DIRS.map((dir) => `${dir}/`),
                    "",
                ].join("\n"),
            ),
            ".gitignore",
        )
    } catch {
        // ignore
    }
    return sandbox.id
}

export async function peekSandbox(sandboxId: string): Promise<Sandbox> {
    return daytona().get(sandboxId)
}

export async function getSandbox(sandboxId: string): Promise<Sandbox> {
    const sandbox = await peekSandbox(sandboxId)
    if (sandbox.state && String(sandbox.state) !== "started") {
        await sandbox.start(60)
    }
    return sandbox
}

function validEnvVars(vars: Record<string, string>) {
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(vars)) {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) out[key] = value
    }
    return out
}

export async function buildSandboxEnv(input: {
    organizationId: string
    userId: string
    harness: Harness
}) {
    const merged = validEnvVars(await getMergedEnv(input.organizationId, input.userId))
    const meta = harnessMeta(input.harness)
    const key = await getHarnessKey(input.organizationId, input.harness)
    if (key?.apiKey) merged[meta.envKey] = key.apiKey
    const extra = (key?.additionalConfig ?? {}) as Record<string, unknown>
    if (typeof extra.provider === "string") merged.DUPLI_PROVIDER = extra.provider
    return merged
}

export async function injectSandboxEnv(sandboxId: string, env: Record<string, string>) {
    if (!Object.keys(env).length) return
    const sandbox = await getSandbox(sandboxId)
    try {
        await sandbox.updateEnv(env)
    } catch {
        // command-level env on execute still applies
    }
}

export async function runInSandbox(input: {
    sandboxId: string
    command: string
    env?: Record<string, string>
    cwd?: string
    timeout?: number
}) {
    const sandbox = await getSandbox(input.sandboxId)
    const result = await sandbox.process.executeCommand(
        input.command,
        input.cwd,
        input.env,
        input.timeout ?? 180,
    )
    return {
        exitCode: result.exitCode,
        stdout: result.result || result.artifacts?.stdout || "",
    }
}

function gitStatusExtra(file: { extra?: string; staging?: string; worktree?: string }) {
    const extra = (file.extra || "").trim()
    if (extra && extra !== "Unmodified") {
        if (extra === "Untracked" || extra === "Added") return "A"
        if (extra === "Deleted") return "D"
        if (extra === "??") return "A"
        return extra.length > 2 ? extra.slice(0, 1) : extra
    }
    const state = file.worktree || file.staging || ""
    if (state === "Untracked" || state === "Added") return "A"
    if (state === "Deleted") return "D"
    if (state) return "M"
    return extra || "M"
}

function parseGitStatusPath(raw: string) {
    let path = raw.trim()
    if (path.startsWith('"') && path.endsWith('"')) {
        path = path.slice(1, -1).replace(/\\"/g, '"')
    }
    const renamed = path.lastIndexOf(" -> ")
    if (renamed >= 0) path = path.slice(renamed + 4)
    return tryRelPath(path)
}

function toChange(path: string, extra?: string): FileChange | null {
    const rel = tryRelPath(path)
    if (!rel || isNoisePath(rel) || isIgnoredDiffPath(rel)) return null
    return { path: rel, extra }
}

function mergeChangeLists(primary: FileChange[], secondary: FileChange[]) {
    const byPath = new Map<string, FileChange>()
    for (const file of secondary) byPath.set(file.path, file)
    for (const file of primary) {
        const prev = byPath.get(file.path)
        byPath.set(file.path, {
            path: file.path,
            extra: file.extra || prev?.extra,
            patch: file.patch || prev?.patch,
        })
    }
    return [...byPath.values()]
}

async function listChangesFromGitStatus(sandboxId: string): Promise<FileChange[]> {
    try {
        const sandbox = await getSandbox(sandboxId)
        const status = await sandbox.git.status(".")
        const files = status.fileStatus ?? []
        return files
            .map((file) => toChange(file.name, gitStatusExtra(file)))
            .filter((file): file is FileChange => Boolean(file))
    } catch {
        return []
    }
}

async function listChangesFromGitShort(sandboxId: string): Promise<FileChange[]> {
    try {
        const result = await runInSandbox({
            sandboxId,
            command: "git status --short --untracked-files=all",
            timeout: 20,
        })
        return result.stdout
            .split("\n")
            .map((line) => line.trimEnd())
            .filter((line) => line.trim() && !line.startsWith("!!"))
            .map((line) => toChange(parseGitStatusPath(line.slice(2)) || "", gitStatusExtra({ extra: line.slice(0, 2).trim() })))
            .filter((file): file is FileChange => Boolean(file))
    } catch {
        return []
    }
}

export async function listSandboxChanges(sandboxId: string): Promise<FileChange[]> {
    const [fromApi, fromGit] = await Promise.all([
        listChangesFromGitStatus(sandboxId),
        listChangesFromGitShort(sandboxId),
    ])
    return mergeChangeLists(fromGit, fromApi)
}

export async function commitSandboxPath(sandboxId: string, relPath: string) {
    const path = normalizeRelPath(relPath)
    if (!path) throw new Error("Invalid path")
    const quoted = shellQuote(path)
    await runInSandbox({
        sandboxId,
        command: `git config user.email 'workspace@dupli.dev' && git config user.name 'Dupli' && git add -- ${quoted} && git -c commit.gpgsign=false commit -m ${shellQuote(`keep ${path}`)} || true`,
        timeout: 20,
    })
}

export async function checkpointSandbox(sandboxId: string) {
    await runInSandbox({
        sandboxId,
        command:
            "git config user.email 'workspace@dupli.dev' && git config user.name 'Dupli' && git add -A && git -c commit.gpgsign=false commit --allow-empty -m checkpoint || true",
        timeout: 30,
    })
}

const MAX_DIFF_FILES = 80
const MAX_PATCH_CHARS = 16 * 1024

export async function captureSandboxDiffs(sandboxId: string): Promise<FileChange[]> {
    const files = (await listSandboxChanges(sandboxId)).slice(0, MAX_DIFF_FILES)
    const diffs: FileChange[] = []
    for (const file of files) {
        let patch = ""
        try {
            patch = (await diffSandboxFile(sandboxId, file.path)).slice(0, MAX_PATCH_CHARS)
        } catch {
            patch = ""
        }
        diffs.push({ path: file.path, extra: file.extra, patch: patch || undefined })
    }
    return diffs
}

export async function deleteSandbox(sandboxId: string) {
    try {
        const sandbox = await daytona().get(sandboxId)
        await sandbox.delete()
    } catch {
        // already gone
    }
}

const SKIP_NAMES = new Set([
    ".git",
    ".daytona",
    ".cache",
    ".local",
    ".config",
    ".npm",
    ".nvm",
    ".oh-my-zsh",
    "node_modules",
    ".bash_logout",
    ".bashrc",
    ".profile",
    ".zshrc",
    ".zprofile",
    ".face",
    ".face.icon",
    ...HARNESS_STATE_DIRS,
])

const TREE_PRUNE = new Set([
    ".git",
    "node_modules",
    ".cache",
    ".npm",
    ".nvm",
    ".local",
    ".config",
    ".oh-my-zsh",
    ...HARNESS_STATE_DIRS,
])
const NOVNC_PORT = 6080
const PREVIEW_TTL_SECONDS = 60 * 60 * 8

const MAX_FILE_BYTES = 512 * 1024

export type SandboxFileContent = {
    path: string
    content: string
    binary: boolean
    tooLarge: boolean
}

function normalizeRelPath(input: string) {
    let cleaned = input.replaceAll("\\", "/").replace(/^\.\//, "")
    cleaned = cleaned.replace(/^\/home\/daytona\//, "").replace(/^\/workspace\//, "")
    cleaned = cleaned.replace(/^\/+/, "")
    if (!cleaned || cleaned === ".") return ""
    if (cleaned.split("/").some((part) => part === "..")) throw new Error("Invalid path")
    return cleaned
}

function isNoisePath(path: string) {
    return path.split("/").some((part) => SKIP_NAMES.has(part))
}

function hideInFileTree(path: string) {
    const parts = path.split("/").filter(Boolean)
    return parts.slice(0, -1).some((part) => TREE_PRUNE.has(part))
}

function pythonB64(value: string) {
    return Buffer.from(value, "utf8").toString("base64")
}

function shellQuote(value: string) {
    return `'${value.replaceAll("'", `'\\''`)}'`
}

function tryRelPath(input: string) {
    try {
        return normalizeRelPath(input)
    } catch {
        return ""
    }
}

function toTreeEntries(
    items: Array<{ path?: string; name?: string; isDir?: boolean }>,
): SandboxEntry[] {
    return items
        .map((file) => {
            const path = tryRelPath(file.path || file.name || "")
            const name = file.name || path.split("/").pop() || path
            return { path, name, isDir: Boolean(file.isDir) }
        })
        .filter((entry) => entry.path && !hideInFileTree(entry.path))
}

function parseTreeLines(stdout: string): SandboxEntry[] {
    const entries: SandboxEntry[] = []
    for (const line of stdout.split("\n").map((item) => item.trim())) {
        if (!line || line === "d " || line === "f ") continue
        const kind = line.startsWith("d ") ? "dir" : line.startsWith("f ") ? "file" : null
        if (!kind) continue
        const path = tryRelPath(line.slice(2))
        if (!path || hideInFileTree(path)) continue
        entries.push({ path, name: path.split("/").pop() || path, isDir: kind === "dir" })
    }
    return entries
}

const LIST_TREE_PY = Buffer.from(
    [
        "import os",
        "prune={'.git','node_modules','.cache','.npm','.nvm','.local','.oh-my-zsh'}",
        "for dirpath, dirnames, filenames in os.walk('.'):",
        "    dirnames[:] = [d for d in dirnames if d not in prune]",
        "    rel = os.path.relpath(dirpath, '.')",
        "    depth = 0 if rel == '.' else rel.count('/') + 1",
        "    if depth >= 8:",
        "        dirnames.clear()",
        "    if rel != '.':",
        "        print('d ' + rel.replace('\\\\', '/'))",
        "    for name in filenames:",
        "        path = name if rel == '.' else rel + '/' + name",
        "        print('f ' + path.replace('\\\\', '/'))",
        "",
    ].join("\n"),
).toString("base64")

async function listTreeViaFind(sandboxId: string): Promise<SandboxEntry[]> {
    const fallback = await runInSandbox({
        sandboxId,
        command: `python3 -c "import base64; exec(base64.b64decode('${LIST_TREE_PY}').decode())"`,
        timeout: 25,
    })
    const parsed = parseTreeLines(fallback.stdout)
    if (parsed.length) return parsed
    const gnu = await runInSandbox({
        sandboxId,
        command:
            "find . -maxdepth 8 \\( -name .git -o -name node_modules -o -name .cache \\) -prune -o \\( -type d -printf 'd %P\\n' -o -type f -printf 'f %P\\n' \\)",
        timeout: 25,
    })
    return parseTreeLines(gnu.stdout)
}

export async function listSandboxTree(sandboxId: string): Promise<SandboxEntry[]> {
    await getSandbox(sandboxId)
    try {
        const fromShell = await listTreeViaFind(sandboxId)
        if (fromShell.length) return fromShell
    } catch {
        // fall through to SDK
    }
    try {
        const sandbox = await getSandbox(sandboxId)
        const files = await sandbox.fs.listFiles(".", { depth: 8 })
        return toTreeEntries(files)
    } catch {
        return []
    }
}

export async function getSandboxBrowserPreview(sandboxId: string): Promise<{ url: string }> {
    const sandbox = await getSandbox(sandboxId)
    try {
        const status = await sandbox.computerUse.getStatus()
        if (!String(status.status || "").toLowerCase().includes("running")) {
            await sandbox.computerUse.start()
        }
    } catch {
        await sandbox.computerUse.start()
    }
    try {
        await sandbox.getPreviewLink(NOVNC_PORT)
    } catch {
        // port may already be open
    }
    const signed = await sandbox.getSignedPreviewUrl(NOVNC_PORT, PREVIEW_TTL_SECONDS)
    try {
        const url = new URL(signed.url)
        url.searchParams.set("autoconnect", "true")
        url.searchParams.set("reconnect", "true")
        url.searchParams.set("resize", "scale")
        return { url: url.toString() }
    } catch {
        return { url: signed.url }
    }
}

export async function readSandboxFile(sandboxId: string, relPath: string): Promise<SandboxFileContent> {
    const path = normalizeRelPath(relPath)
    if (!path) throw new Error("Invalid path")
    const sandbox = await getSandbox(sandboxId)
    try {
        const buffer = await sandbox.fs.downloadFile(path)
        if (buffer.length > MAX_FILE_BYTES) {
            return { path, content: "", binary: false, tooLarge: true }
        }
        if (buffer.includes(0)) {
            return { path, content: "", binary: true, tooLarge: false }
        }
        return { path, content: buffer.toString("utf8"), binary: false, tooLarge: false }
    } catch {
        const result = await runInSandbox({
            sandboxId,
            command: `python3 -c "import pathlib,sys,base64; p=pathlib.Path(base64.b64decode('${pythonB64(path)}').decode()); data=p.read_bytes(); sys.stdout.buffer.write(data)"`,
            timeout: 20,
        })
        if (result.exitCode !== 0) throw new Error("Could not read file")
        const buffer = Buffer.from(result.stdout)
        if (buffer.includes(0)) return { path, content: "", binary: true, tooLarge: false }
        return { path, content: buffer.toString("utf8"), binary: false, tooLarge: false }
    }
}

export async function uploadSandboxBytes(sandboxId: string, relPath: string, data: Buffer) {
    const path = normalizeRelPath(relPath)
    if (!path) throw new Error("Invalid path")
    const sandbox = await getSandbox(sandboxId)
    const parent = path.split("/").slice(0, -1).join("/")
    if (parent) {
        try {
            await sandbox.fs.createFolder(parent, "755")
        } catch {
            await runInSandbox({ sandboxId, command: `mkdir -p ${shellQuote(parent)}`, timeout: 10 })
        }
    }
    try {
        await sandbox.fs.uploadFile(data, path)
    } catch {
        const encoded = data.toString("base64")
        await runInSandbox({
            sandboxId,
            command: `python3 -c "import pathlib,base64; pathlib.Path(base64.b64decode('${pythonB64(path)}').decode()).write_bytes(base64.b64decode('${encoded}'))"`,
            timeout: 30,
        })
    }
}

export async function writeSandboxFile(sandboxId: string, relPath: string, content: string) {
    const path = normalizeRelPath(relPath)
    if (!path) throw new Error("Invalid path")
    const sandbox = await getSandbox(sandboxId)
    const parent = path.split("/").slice(0, -1).join("/")
    if (parent) {
        try {
            await sandbox.fs.createFolder(parent, "755")
        } catch {
            await runInSandbox({ sandboxId, command: `mkdir -p ${shellQuote(parent)}`, timeout: 10 })
        }
    }
    try {
        await sandbox.fs.uploadFile(Buffer.from(content, "utf8"), path)
    } catch {
        const encoded = Buffer.from(content, "utf8").toString("base64")
        await runInSandbox({
            sandboxId,
            command: `python3 -c "import pathlib,base64; pathlib.Path(base64.b64decode('${pythonB64(path)}').decode()).write_bytes(base64.b64decode('${encoded}'))"`,
            timeout: 20,
        })
    }
}

export async function createSandboxFile(sandboxId: string, relPath: string) {
    await writeSandboxFile(sandboxId, relPath, "")
}

export async function createSandboxDir(sandboxId: string, relPath: string) {
    const path = normalizeRelPath(relPath)
    if (!path) throw new Error("Invalid path")
    const sandbox = await getSandbox(sandboxId)
    try {
        await sandbox.fs.createFolder(path, "755")
    } catch {
        await runInSandbox({ sandboxId, command: `mkdir -p ${shellQuote(path)}`, timeout: 10 })
    }
}

export async function deleteSandboxPath(sandboxId: string, relPath: string) {
    const path = normalizeRelPath(relPath)
    if (!path) throw new Error("Invalid path")
    const sandbox = await getSandbox(sandboxId)
    try {
        await sandbox.fs.deleteFile(path, true)
    } catch {
        await runInSandbox({ sandboxId, command: `rm -rf ${shellQuote(path)}`, timeout: 15 })
    }
}

export async function renameSandboxPath(sandboxId: string, fromPath: string, toPath: string) {
    const from = normalizeRelPath(fromPath)
    const to = normalizeRelPath(toPath)
    if (!from || !to) throw new Error("Invalid path")
    const sandbox = await getSandbox(sandboxId)
    try {
        await sandbox.fs.moveFiles(from, to)
    } catch {
        await runInSandbox({ sandboxId, command: `mkdir -p $(dirname ${shellQuote(to)}) && mv ${shellQuote(from)} ${shellQuote(to)}`, timeout: 15 })
    }
}

export async function diffSandboxFile(sandboxId: string, relPath: string) {
    const path = normalizeRelPath(relPath)
    if (!path) throw new Error("Invalid path")
    const quoted = shellQuote(path)
    const tracked = await runInSandbox({
        sandboxId,
        command: `git diff --no-color -- ${quoted}; git diff --cached --no-color -- ${quoted}`,
        timeout: 20,
    })
    if (tracked.stdout.trim()) return tracked.stdout
    const untracked = await runInSandbox({
        sandboxId,
        command: `git diff --no-color --no-index -- /dev/null ${quoted} || true`,
        timeout: 20,
    })
    return untracked.stdout
}

function isAddedChange(extra?: string) {
    const flag = (extra || "").replace(/\s/g, "")
    return flag === "A" || flag === "??" || flag.startsWith("A") || flag.endsWith("A")
}

export async function revertSandboxFileChange(
    sandboxId: string,
    relPath: string,
    patch?: string,
    extra?: string,
    options?: { checkpoint?: boolean },
) {
    const path = normalizeRelPath(relPath)
    if (!path) throw new Error("Invalid path")
    const quoted = shellQuote(path)
    const checkpoint = options?.checkpoint !== false

    const finish = async () => {
        if (checkpoint) await checkpointSandbox(sandboxId)
    }

    if (isAddedChange(extra) && !patch?.trim()) {
        await deleteSandboxPath(sandboxId, path)
        await finish()
        return
    }

    if (patch?.trim()) {
        const body = patch.endsWith("\n") ? patch : `${patch}\n`
        const encoded = Buffer.from(body, "utf8").toString("base64")
        const applied = await runInSandbox({
            sandboxId,
            command: `python3 -c "import base64,pathlib; pathlib.Path('/tmp/dupli-undo.patch').write_bytes(base64.b64decode('${encoded}'))" && git apply --reverse --whitespace=nowarn /tmp/dupli-undo.patch; status=$?; rm -f /tmp/dupli-undo.patch; exit $status`,
            timeout: 20,
        })
        if (applied.exitCode === 0) {
            await finish()
            return
        }
    }

    if (isAddedChange(extra)) {
        await deleteSandboxPath(sandboxId, path)
        await finish()
        return
    }

    const restored = await runInSandbox({
        sandboxId,
        command: `git checkout HEAD~1 -- ${quoted}`,
        timeout: 15,
    })
    if (restored.exitCode !== 0) throw new Error("Could not undo this change")
    await finish()
}
