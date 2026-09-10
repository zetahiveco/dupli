"use client"

import { useEffect, useState } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"
import { PiSpinner } from "react-icons/pi"
import { Button } from "@/components/ui/button"
import { getWorkspaceBrowser } from "./actions"

export default function BrowserPanel({ workspaceId }: { workspaceId: string }) {
    const [url, setUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [reloadKey, setReloadKey] = useState(0)

    const load = async () => {
        setLoading(true)
        setError(null)
        try {
            const preview = await getWorkspaceBrowser(workspaceId)
            setUrl(preview.url)
            setReloadKey((value) => value + 1)
        } catch (caught) {
            setUrl(null)
            setError(caught instanceof Error ? caught.message : "Could not open the browser preview.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void load()
    }, [workspaceId])

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-9 shrink-0 items-center justify-end gap-1 border-b border-white/10 px-2">
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white/50 hover:text-white"
                    title="Reload"
                    onClick={() => void load()}
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                {url ? (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-white/50 hover:text-white"
                        title="Open in new tab"
                        asChild
                    >
                        <a href={url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </Button>
                ) : null}
            </div>
            <div className="relative min-h-0 flex-1 bg-black/40">
                {loading ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#08080A]">
                        <PiSpinner className="animate-spin text-2xl text-white/40" />
                        <p className="text-xs text-white/45">Starting desktop…</p>
                    </div>
                ) : null}
                {error ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                        <p className="text-sm text-white/55">{error}</p>
                        <Button className="h-8 bg-brand text-white" onClick={() => void load()}>
                            Retry
                        </Button>
                    </div>
                ) : url ? (
                    <iframe
                        key={`${url}-${reloadKey}`}
                        src={url}
                        title="Workspace browser"
                        className="h-full w-full border-0 bg-black"
                        allow="clipboard-read; clipboard-write; fullscreen"
                    />
                ) : null}
            </div>
        </div>
    )
}
