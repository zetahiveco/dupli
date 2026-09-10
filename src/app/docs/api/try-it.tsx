"use client"

import Link from "next/link"
import { useEffect, useState, type CSSProperties } from "react"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { PiCopy, PiEye, PiEyeSlash, PiKey, PiSpinner } from "react-icons/pi"
import { generateApiKey, getApiKey } from "@/app/console/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ApiKeyBar() {
    const { isLoaded, isSignedIn, orgId } = useAuth()
    const [apiKey, setApiKey] = useState("")
    const [hasStoredKey, setHasStoredKey] = useState(false)
    const [keyLoading, setKeyLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [showKey, setShowKey] = useState(false)

    useEffect(() => {
        if (!isLoaded || !isSignedIn || !orgId) return

        let cancelled = false
        setKeyLoading(true)
        getApiKey()
            .then((result) => {
                if (cancelled) return
                if (result.apiKey) {
                    setApiKey(result.apiKey)
                    setHasStoredKey(true)
                } else {
                    setHasStoredKey(false)
                }
            })
            .catch(() => {
                if (!cancelled) setHasStoredKey(false)
            })
            .finally(() => {
                if (!cancelled) setKeyLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [isLoaded, isSignedIn, orgId])

    const handleCreateKey = async () => {
        try {
            setGenerating(true)
            const result = await generateApiKey()
            setApiKey(result.apiKey)
            setHasStoredKey(true)
            toast.success("API key created")
        } catch {
            toast.error("Could not create an API key. Sign in with an organization first.")
        } finally {
            setGenerating(false)
        }
    }

    const handleCopyKey = async () => {
        if (!apiKey) return
        try {
            await navigator.clipboard.writeText(apiKey)
            toast.success("API key copied")
        } catch {
            toast.error("Could not copy API key")
        }
    }

    return (
        <section className="my-8 border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold">API key</p>
                    <p className="mt-1 text-sm text-slate-600">
                        Copy this into the examples below as{" "}
                        <code className="border border-white/10 bg-white/[0.04] px-1">Authorization: Bearer</code>.
                    </p>
                </div>
                {isLoaded && isSignedIn && orgId && !hasStoredKey && (
                    <Button type="button" onClick={handleCreateKey} disabled={generating}>
                        {generating ? <PiSpinner className="animate-spin" /> : <PiKey />}
                        Create API key
                    </Button>
                )}
            </div>

            {!isLoaded || keyLoading ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <PiSpinner className="animate-spin" />
                    Loading credentials…
                </p>
            ) : !isSignedIn ? (
                <p className="mt-4 text-sm text-slate-600">
                    Paste a key below, or{" "}
                    <Link href="/auth/login" className="underline">
                        sign in
                    </Link>{" "}
                    to load or create one for your organization.
                </p>
            ) : !orgId ? (
                <p className="mt-4 text-sm text-slate-600">
                    <Link href="/auth/create-org" className="underline">
                        Create an organization
                    </Link>{" "}
                    to generate an API key, or paste an existing key below.
                </p>
            ) : hasStoredKey ? (
                <p className="mt-4 text-sm text-slate-600">Using your organization API key.</p>
            ) : (
                <p className="mt-4 text-sm text-slate-600">No key yet. Create one, or paste an existing key.</p>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="bg-[#0E0E12] font-mono"
                    style={showKey ? undefined : ({ WebkitTextSecurity: "disc" } as CSSProperties)}
                    autoComplete="off"
                />
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowKey((value) => !value)}>
                        {showKey ? <PiEyeSlash /> : <PiEye />}
                        {showKey ? "Hide" : "Show"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCopyKey} disabled={!apiKey}>
                        <PiCopy />
                        Copy
                    </Button>
                </div>
            </div>
        </section>
    )
}
