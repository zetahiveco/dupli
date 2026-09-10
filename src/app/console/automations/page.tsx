"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PiSpinner } from "react-icons/pi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createOrgAutomation, listConnectedAutomationTriggers, listOrgAutomations, removeAutomation, runOrgAutomation, toggleAutomation } from "./actions"
import { listOrgWorkspaces } from "../workspaces/actions"
import { HARNESS_META } from "@/services/harness"
import { HarnessLogo } from "@/components/shared/harness-logo"
import { triggerIntegrationName, triggerNeedsIntegration } from "@/services/integrations/providers"
import type { AutomationTrigger, AutomationWorkspace, Harness } from "../../../../generated/prisma/enums"

const CRON_PRESETS: { value: string; label: string }[] = [
    { value: "*/15 * * * *", label: "Every 15 minutes" },
    { value: "0 * * * *", label: "Every hour" },
    { value: "0 */6 * * *", label: "Every 6 hours" },
    { value: "0 9 * * *", label: "Daily at 9:00" },
    { value: "0 9 * * 1-5", label: "Weekdays at 9:00" },
    { value: "0 9 * * 1", label: "Weekly on Monday at 9:00" },
]

const TRIGGERS: { id: AutomationTrigger; label: string }[] = [
    { id: "VIA_WEBHOOK", label: "Webhook" },
    { id: "VIA_CRON", label: "Cron" },
    { id: "VIA_API", label: "API" },
    { id: "VIA_GITHUB", label: "GitHub" },
    { id: "VIA_GITLAB", label: "GitLab" },
    { id: "VIA_BITBUCKET", label: "Bitbucket" },
    { id: "VIA_LINEAR", label: "Linear" },
    { id: "VIA_SENTRY", label: "Sentry" },
]

function triggerLabel(id: AutomationTrigger) {
    return TRIGGERS.find((item) => item.id === id)?.label ?? (id === "VIA_SLACK" ? "Slack" : id)
}

type AutomationRow = Awaited<ReturnType<typeof listOrgAutomations>>[number]

export default function AutomationsPage() {
    const [rows, setRows] = useState<AutomationRow[]>([])
    const [workspaces, setWorkspaces] = useState<Awaited<ReturnType<typeof listOrgWorkspaces>>>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    const load = async () => {
        const [automations, ws] = await Promise.all([listOrgAutomations(), listOrgWorkspaces()])
        setRows(automations)
        setWorkspaces(ws)
        setLoading(false)
    }

    useEffect(() => {
        void load()
    }, [])

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="flex h-12 items-center justify-between border-b border-white/10 px-5">
                <div>
                    <h1 className="text-sm font-semibold">Automations</h1>
                    <p className="text-[11px] text-white/40">Fire a workspace from cron, Linear, git or a webhook.</p>
                </div>
                <Button className="h-8 bg-brand text-white hover:bg-brand/90" onClick={() => setOpen(true)}>
                    New automation
                </Button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {loading ? (
                    <div className="flex h-40 items-center justify-center"><PiSpinner className="animate-spin" /></div>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-white/45">No automations yet.</p>
                ) : (
                    <div className="divide-y divide-white/10 border border-white/10">
                        {rows.map((row) => (
                            <div key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{row.name}</p>
                                    <p className="text-[11px] text-white/40">
                                        {triggerLabel(row.trigger)} · {row.workspaceAction === "USE_EXISTING" ? row.workspaceName || "existing workspace" : "new workspace"}
                                    </p>
                                    {(row.trigger === "VIA_WEBHOOK" || row.trigger === "VIA_API") && row.webhookUrl && (
                                        <button
                                            type="button"
                                            className="mt-1 block truncate font-mono text-[10px] text-white/35 hover:text-brand"
                                            onClick={async () => {
                                                const value = row.trigger === "VIA_API"
                                                    ? row.apiUrl
                                                    : `${row.webhookUrl}?secret=${row.webhookSecret || ""}`
                                                await navigator.clipboard.writeText(value)
                                                toast.success("Copied webhook URL")
                                            }}
                                        >
                                            {row.trigger === "VIA_API" ? row.apiUrl : `${row.webhookUrl}?secret=${row.webhookSecret || "…"}`}
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white/50"
                                        onClick={async () => {
                                            try {
                                                const result = await runOrgAutomation(row.id)
                                                if (result.needsApiKey) {
                                                    toast.error("Add a harness API key in Settings, then retry.")
                                                    return
                                                }
                                                toast.success("Automation ran")
                                            } catch (error) {
                                                toast.error(error instanceof Error ? error.message : "Run failed")
                                            }
                                        }}
                                    >
                                        Run
                                    </Button>
                                    <Switch
                                        checked={row.isRunning}
                                        onCheckedChange={async (checked) => {
                                            await toggleAutomation(row.id, checked)
                                            await load()
                                        }}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white/40"
                                        onClick={async () => {
                                            await removeAutomation(row.id)
                                            await load()
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <CreateDialog
                open={open}
                onOpenChange={setOpen}
                workspaces={workspaces}
                onCreated={() => {
                    setOpen(false)
                    void load()
                }}
            />
        </div>
    )
}

function CreateDialog({
    open,
    onOpenChange,
    workspaces,
    onCreated,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    workspaces: Awaited<ReturnType<typeof listOrgWorkspaces>>
    onCreated: () => void
}) {
    const [name, setName] = useState("")
    const [prompt, setPrompt] = useState("")
    const [trigger, setTrigger] = useState<AutomationTrigger>("VIA_CRON")
    const [action, setAction] = useState<AutomationWorkspace>("USE_EXISTING")
    const [workspaceId, setWorkspaceId] = useState("")
    const [cron, setCron] = useState("0 9 * * 1")
    const [harness, setHarness] = useState<Harness>("CLAUDE_CODEX")
    const [saving, setSaving] = useState(false)
    const [connected, setConnected] = useState<Partial<Record<AutomationTrigger, boolean>>>({})
    const integrationMissing = triggerNeedsIntegration(trigger) && connected[trigger] === false

    useEffect(() => {
        if (!open) return
        void listConnectedAutomationTriggers().then(setConnected).catch(() => setConnected({}))
    }, [open])

    const submit = async () => {
        setSaving(true)
        try {
            await createOrgAutomation({
                name: name.trim() || "Untitled automation",
                prompt,
                trigger,
                workspaceAction: action,
                workspaceId: action === "USE_EXISTING" ? workspaceId : null,
                cron: trigger === "VIA_CRON" ? cron : null,
                newWorkspaceConfig:
                    action === "CREATE_NEW"
                        ? { name: name.trim() || "automation", harness }
                        : undefined,
            })
            toast.success("Automation created")
            onCreated()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New automation</DialogTitle>
                    <DialogDescription>Choose a trigger and whether to reuse or boot a workspace.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] space-y-5 overflow-y-auto">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nightly tests" />
                    </div>
                    <div className="space-y-2">
                        <Label>Prompt</Label>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            placeholder="Run the test suite, fix failures, and summarize what changed."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Trigger</Label>
                        <Select value={trigger} onValueChange={(v) => setTrigger(v as AutomationTrigger)}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {TRIGGERS.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {integrationMissing ? (
                        <p className="border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-brand">
                            Connect {triggerIntegrationName(trigger)} in Integrations before using this trigger.
                        </p>
                    ) : null}
                    <div className="space-y-2">
                        <Label>Workspace</Label>
                        <Select value={action} onValueChange={(v) => setAction(v as AutomationWorkspace)}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USE_EXISTING">Use existing</SelectItem>
                                <SelectItem value="CREATE_NEW">Create new</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {trigger === "VIA_CRON" && (
                        <div className="space-y-2">
                            <Label>Schedule</Label>
                            <Select value={cron} onValueChange={setCron}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a schedule" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CRON_PRESETS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {action === "USE_EXISTING" ? (
                        <div className="space-y-2">
                            <Label>Existing workspace</Label>
                            <Select value={workspaceId} onValueChange={setWorkspaceId}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                    {workspaces.map((ws) => (
                                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>Harness</Label>
                                <Select value={harness} onValueChange={(v) => setHarness(v as Harness)}>
                                    <SelectTrigger className="w-full">
                                        <span className="flex items-center gap-2">
                                            <HarnessLogo harness={harness} />
                                            {HARNESS_META.find((item) => item.id === harness)?.name}
                                        </span>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {HARNESS_META.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                <span className="flex items-center gap-2">
                                                    <HarnessLogo harness={item.id} />
                                                    {item.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter className="pt-2">
                    <Button variant="outline" className="h-9" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="h-9 bg-brand text-white" disabled={saving || integrationMissing} onClick={() => void submit()}>
                        {saving ? <PiSpinner className="animate-spin" /> : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
