"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react"
import { PiSpinner } from "react-icons/pi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getEnvironmentVariables, saveOrgEnvironmentVariables, saveUserEnvironmentVariables } from "./actions"

type Pair = { key: string; value: string }

function toPairs(vars: Record<string, string>): Pair[] {
    const entries = Object.entries(vars)
    return entries.length ? entries.map(([key, value]) => ({ key, value })) : [{ key: "", value: "" }]
}

function toMap(pairs: Pair[]) {
    const out: Record<string, string> = {}
    for (const pair of pairs) {
        if (pair.key.trim()) out[pair.key.trim()] = pair.value
    }
    return out
}

export default function EnvironmentsPage() {
    const [org, setOrg] = useState<Pair[]>([{ key: "", value: "" }])
    const [user, setUser] = useState<Pair[]>([{ key: "", value: "" }])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<"org" | "user" | null>(null)

    useEffect(() => {
        void (async () => {
            const data = await getEnvironmentVariables()
            setOrg(toPairs(data.org))
            setUser(toPairs(data.user))
            setLoading(false)
        })()
    }, [])

    if (loading) {
        return <div className="flex h-full items-center justify-center"><PiSpinner className="animate-spin" /></div>
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="h-12 border-b border-white/10 px-5">
                <div className="flex h-full flex-col justify-center">
                    <h1 className="text-sm font-semibold">Environments</h1>
                    <p className="text-[11px] text-white/40">Variables injected into every workspace.</p>
                </div>
            </header>
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-5">
                <VarEditor
                    title="Organization"
                    description="Shared with every workspace in this org."
                    pairs={org}
                    setPairs={setOrg}
                    saving={saving === "org"}
                    onSave={async () => {
                        setSaving("org")
                        try {
                            await saveOrgEnvironmentVariables(toMap(org))
                            toast.success("Organization variables saved")
                        } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Failed")
                        } finally {
                            setSaving(null)
                        }
                    }}
                />
                <VarEditor
                    title="You"
                    description="Override org values for your own runs."
                    pairs={user}
                    setPairs={setUser}
                    saving={saving === "user"}
                    onSave={async () => {
                        setSaving("user")
                        try {
                            await saveUserEnvironmentVariables(toMap(user))
                            toast.success("Your variables saved")
                        } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Failed")
                        } finally {
                            setSaving(null)
                        }
                    }}
                />
            </div>
        </div>
    )
}

function VarEditor({
    title,
    description,
    pairs,
    setPairs,
    saving,
    onSave,
}: {
    title: string
    description: string
    pairs: Pair[]
    setPairs: (pairs: Pair[]) => void
    saving: boolean
    onSave: () => void
}) {
    return (
        <section className="w-full space-y-3">
            <div>
                <h2 className="text-sm font-medium">{title}</h2>
                <p className="text-xs text-white/40">{description}</p>
            </div>
            <div className="space-y-2">
                {pairs.map((pair, index) => (
                    <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_2.25rem] items-center gap-2">
                        <Input
                            value={pair.key}
                            placeholder="KEY"
                            className="h-9 font-mono text-xs"
                            onChange={(e) => {
                                const next = [...pairs]
                                next[index] = { ...pair, key: e.target.value }
                                setPairs(next)
                            }}
                        />
                        <SecretValue
                            value={pair.value}
                            onChange={(value) => {
                                const next = [...pairs]
                                next[index] = { ...pair, value }
                                setPairs(next)
                            }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setPairs(pairs.filter((_, i) => i !== index))}
                            aria-label="Remove variable"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <div className="flex items-center justify-between gap-3 pt-1">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() => setPairs([...pairs, { key: "", value: "" }])}
                    >
                        <Plus className="h-4 w-4" />
                        Add variable
                    </Button>
                    <Button
                        type="button"
                        className="h-9 bg-brand text-white hover:bg-brand/90"
                        disabled={saving}
                        onClick={onSave}
                    >
                        {saving ? <PiSpinner className="animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                    </Button>
                </div>
            </div>
        </section>
    )
}

function SecretValue({
    value,
    onChange,
}: {
    value: string
    onChange: (value: string) => void
}) {
    const [visible, setVisible] = useState(false)

    return (
        <div className="flex h-9 min-w-0 items-center border border-input bg-white/[0.04]">
            <input
                type={visible ? "text" : "password"}
                value={value}
                placeholder="value"
                autoComplete="new-password"
                spellCheck={false}
                className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                type="button"
                className="flex h-full w-9 shrink-0 items-center justify-center text-white/45 hover:text-white"
                onClick={() => setVisible((prev) => !prev)}
                aria-label={visible ? "Hide value" : "Show value"}
            >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    )
}
