"use client"

import { useEffect, useState } from "react"
import { OrganizationSwitcher, SignOutButton, useClerk } from "@clerk/nextjs"
import { toast } from "sonner"
import { PiCopy, PiEye, PiEyeSlash, PiSpinner } from "react-icons/pi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HARNESS_META } from "@/services/harness"
import { HarnessLogo } from "@/components/shared/harness-logo"
import { generateApiKey, getSettings, removeHarnessApiKey, saveHarnessApiKey, updateEmailNotify } from "./actions"
import type { Harness } from "../../../../generated/prisma/enums"
import { cn } from "@/lib/utils"

function SecretField({
    value,
    onChange,
    placeholder,
    readOnly,
    className,
    emptyLabel,
}: {
    value: string
    onChange?: (value: string) => void
    placeholder?: string
    readOnly?: boolean
    className?: string
    emptyLabel?: string
}) {
    const [show, setShow] = useState(false)
    const display = value || emptyLabel || ""
    const masked = !show && !(emptyLabel && !value)

    return (
        <div className={cn("relative min-w-0 flex-1", className)}>
            <Input
                readOnly={readOnly}
                type={masked ? "password" : "text"}
                value={display}
                placeholder={placeholder}
                onChange={onChange ? (event) => onChange(event.target.value) : undefined}
                className="pr-10 font-mono text-xs"
                autoComplete="off"
            />
            <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-white/45 hover:text-white disabled:opacity-30"
                onClick={() => setShow((current) => !current)}
                disabled={!value}
                aria-label={show ? "Hide API key" : "Show API key"}
            >
                {show ? <PiEyeSlash className="h-4 w-4" /> : <PiEye className="h-4 w-4" />}
            </button>
        </div>
    )
}

export default function SettingsPage() {
    const { openUserProfile } = useClerk()
    const [loading, setLoading] = useState(true)
    const [apiKey, setApiKey] = useState<string | null>(null)
    const [emailNotify, setEmailNotify] = useState(true)
    const [harnessKeys, setHarnessKeys] = useState<Awaited<ReturnType<typeof getSettings>>["harnessKeys"]>([])
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [providers, setProviders] = useState<Record<string, string>>({})

    const load = async () => {
        const data = await getSettings()
        setApiKey(data.organizationSettings?.apiKey ?? null)
        setEmailNotify(data.organizationSettings?.emailNotify ?? true)
        setHarnessKeys(data.harnessKeys)
        setLoading(false)
    }

    useEffect(() => {
        void load()
    }, [])

    if (loading) {
        return <div className="flex h-full items-center justify-center"><PiSpinner className="animate-spin" /></div>
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="h-12 border-b border-white/10 px-5">
                <div className="flex h-full flex-col justify-center">
                    <h1 className="text-sm font-semibold">Settings</h1>
                    <p className="text-[11px] text-white/40">Account, harness keys and the org REST key.</p>
                </div>
            </header>
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-5">
                <section className="space-y-3">
                    <h2 className="text-sm font-medium">Account</h2>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => openUserProfile()}>Manage account</Button>
                        <SignOutButton>
                            <Button variant="destructive">Sign out</Button>
                        </SignOutButton>
                    </div>
                    <div className="max-w-sm border border-white/10 p-3">
                        <OrganizationSwitcher hidePersonal appearance={clerkAppearance} />
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-sm font-medium">Email notifications</h2>
                    <div className="flex items-center justify-between border border-white/10 px-3 py-3">
                        <p className="text-sm text-white/70">Product and run updates</p>
                        <Switch
                            checked={emailNotify}
                            onCheckedChange={async (checked) => {
                                setEmailNotify(checked)
                                await updateEmailNotify(checked)
                            }}
                        />
                    </div>
                </section>

                <section className="space-y-3" id="api-key">
                    <h2 className="text-sm font-medium">REST API key</h2>
                    <div className="flex gap-2">
                        <SecretField readOnly value={apiKey ?? ""} emptyLabel="No key yet" />
                        <Button
                            variant="outline"
                            onClick={async () => {
                                if (!apiKey) return
                                await navigator.clipboard.writeText(apiKey)
                                toast.success("Copied")
                            }}
                            disabled={!apiKey}
                        >
                            <PiCopy />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={async () => {
                                const result = await generateApiKey()
                                setApiKey(result.apiKey)
                                toast.success("Generated")
                            }}
                        >
                            {apiKey ? "Regenerate" : "Generate"}
                        </Button>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-sm font-medium">Harness API keys</h2>
                    <p className="text-xs text-white/40">
                        Required when a workspace is billed with an organization key instead of Dupli tokens.
                    </p>
                    <div className="space-y-2">
                        {HARNESS_META.map((item) => {
                            const saved = harnessKeys.find((row) => row.harness === item.id)
                            return (
                                <div key={item.id} className="grid grid-cols-[160px_1fr_auto] items-center gap-2 border border-white/10 p-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <HarnessLogo harness={item.id} className="h-5 w-5 text-white/80" />
                                        <div className="min-w-0">
                                            <p className="text-sm">{item.name}</p>
                                            {saved?.hasKey && <p className="font-mono text-[10px] text-white/35">{saved.preview}</p>}
                                        </div>
                                    </div>
                                    <div
                                        className={
                                            item.needsProvider && item.providers?.length
                                                ? "grid min-w-0 grid-cols-2 gap-2"
                                                : "flex min-w-0"
                                        }
                                    >
                                        <SecretField
                                            placeholder={item.envKey}
                                            value={drafts[item.id] ?? ""}
                                            onChange={(value) => setDrafts((prev) => ({ ...prev, [item.id]: value }))}
                                        />
                                        {item.needsProvider && item.providers?.length ? (
                                            <Select
                                                value={providers[item.id] || item.providers[0].id}
                                                onValueChange={(value) => setProviders((prev) => ({ ...prev, [item.id]: value }))}
                                            >
                                                <SelectTrigger className="h-9 w-full">
                                                    <SelectValue placeholder="Provider" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {item.providers.map((option) => (
                                                        <SelectItem key={option.id} value={option.id}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : null}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                                const value = drafts[item.id]?.trim()
                                                if (!value) return
                                                await saveHarnessApiKey({
                                                    harness: item.id as Harness,
                                                    apiKey: value,
                                                    provider: providers[item.id] || item.providers?.[0]?.id,
                                                })
                                                toast.success(`${item.name} key saved`)
                                                setDrafts((prev) => ({ ...prev, [item.id]: "" }))
                                                await load()
                                            }}
                                        >
                                            Save
                                        </Button>
                                        {saved && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={async () => {
                                                    await removeHarnessApiKey(item.id as Harness)
                                                    await load()
                                                }}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>
        </div>
    )
}
