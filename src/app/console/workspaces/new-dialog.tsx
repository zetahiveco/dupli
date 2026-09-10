"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { defaultProvider, HARNESS_META } from "@/services/harness"
import { HarnessLogo } from "@/components/shared/harness-logo"
import { createOrgWorkspace, hasHarnessApiKey } from "./actions"
import { saveHarnessApiKey } from "../settings/actions"
import type { Harness } from "../../../../generated/prisma/enums"
import { PiSpinner } from "react-icons/pi"

export default function NewWorkspaceDialog({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated?: (id: string) => void
}) {
    const [name, setName] = useState("")
    const [harness, setHarness] = useState<Harness>("CLAUDE_CODEX")
    const [apiKey, setApiKey] = useState("")
    const [provider, setProvider] = useState(() => defaultProvider("CLAUDE_CODEX"))
    const [needsKey, setNeedsKey] = useState(false)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const meta = HARNESS_META.find((item) => item.id === harness)

    useEffect(() => {
        setProvider(defaultProvider(harness))
        void hasHarnessApiKey(harness).then((result) => setNeedsKey(!result.hasKey))
    }, [harness])

    const reset = () => {
        setName("")
        setHarness("CLAUDE_CODEX")
        setApiKey("")
        setProvider(defaultProvider("CLAUDE_CODEX"))
        setNeedsKey(false)
    }

    const create = async () => {
        setSaving(true)
        try {
            if (needsKey && apiKey.trim()) {
                await saveHarnessApiKey({
                    harness,
                    apiKey: apiKey.trim(),
                    provider: provider || undefined,
                })
            }
            const result = await createOrgWorkspace({
                name: name.trim() || "Untitled",
                harness,
            })
            if (result.needsApiKey) {
                setNeedsKey(true)
                toast.error(`Add a ${meta?.name ?? "harness"} API key for this organization.`)
                return
            }
            if (result.workspace) {
                const id = result.workspace.id
                toast.success("Workspace created")
                onOpenChange(false)
                reset()
                onCreated?.(id)
                router.push(`/console/workspaces/${id}`)
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create workspace")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New workspace</DialogTitle>
                    <DialogDescription>
                        One isolated Linux machine per agent. Workspaces always use the organization API key for this harness.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Show file provenance…" />
                    </div>
                    <div className="space-y-2">
                        <Label>Harness</Label>
                        <Select value={harness} onValueChange={(value) => setHarness(value as Harness)}>
                            <SelectTrigger className="w-full">
                                <span className="flex items-center gap-2">
                                    <HarnessLogo harness={harness} />
                                    {meta?.name}
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
                    {needsKey && (
                        <div className="space-y-3 border border-brand/30 bg-brand/8 p-4">
                            <p className="text-xs text-brand-ink/80">
                                This org has no {meta?.name} key. Paste one to continue.
                            </p>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={meta?.envKey ?? "API key"}
                                autoComplete="off"
                            />
                            {meta?.needsProvider && meta.providers?.length ? (
                                <div className="space-y-2">
                                    <Label>Provider</Label>
                                    <Select value={provider} onValueChange={setProvider}>
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
                    )}
                </div>
                <DialogFooter className="pt-2">
                    <Button variant="outline" className="h-9" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={() => void create()} disabled={saving} className="h-9 bg-brand text-white hover:bg-brand/90">
                        {saving ? <PiSpinner className="animate-spin" /> : null}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
