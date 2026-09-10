"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import Nango from "@nangohq/frontend"
import { PiSpinner } from "react-icons/pi"
import { Button } from "@/components/ui/button"
import {
    completeNangoConnection,
    disconnectNango,
    listConsoleIntegrations,
    startNangoConnect,
} from "./actions"
import { NANGO_PROVIDERS } from "@/services/integrations/providers"

type State = Awaited<ReturnType<typeof listConsoleIntegrations>>

export default function IntegrationsPage() {
    const [data, setData] = useState<State | null>(null)
    const [pending, setPending] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setData(await listConsoleIntegrations())
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to load integrations")
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const connectNango = async (id: string) => {
        setPending(id)
        try {
            const { token } = await startNangoConnect(id)
            const nango = new Nango()
            nango.openConnectUI({
                sessionToken: token,
                themeOverride: "dark",
                onEvent: (event) => {
                    if (event.type === "connect") {
                        void completeNangoConnection({
                            connectionId: event.payload.connectionId,
                            providerConfigKey: event.payload.providerConfigKey,
                            integrationId: id,
                        })
                            .then(async () => {
                                await load()
                                toast.success("Connected")
                            })
                            .catch((error) => {
                                toast.error(error instanceof Error ? error.message : "Could not save connection")
                            })
                            .finally(() => setPending(null))
                        return
                    }
                    if (event.type === "error") {
                        toast.error(event.payload.errorMessage || "Nango connect failed")
                        setPending(null)
                        return
                    }
                    if (event.type === "close") {
                        void load()
                        setPending(null)
                    }
                },
            })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to start Nango")
            setPending(null)
        }
    }

    if (!data) {
        return <div className="flex h-full items-center justify-center"><PiSpinner className="animate-spin" /></div>
    }

    const connected = new Set(data.connected)

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="h-12 border-b border-white/10 px-5">
                <div className="flex h-full flex-col justify-center">
                    <h1 className="text-sm font-semibold">Integrations</h1>
                    <p className="text-[11px] text-white/40">Use slash commands in Slack. Git, Linear and Sentry start automations.</p>
                </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {NANGO_PROVIDERS.map((provider) => {
                        const isOn = connected.has(provider.id)
                        return (
                            <div key={provider.id} className="border border-white/10 p-4">
                                <div className="flex items-center gap-3">
                                    <img src={provider.icon} alt="" className="h-8 w-8 shrink-0" />
                                    <h2 className="text-sm font-medium">{provider.name}</h2>
                                </div>
                                <p className="mt-2 text-xs text-white/45">{provider.description}</p>
                                <div className="mt-4 flex justify-end">
                                    {isOn ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pending === provider.id}
                                            onClick={async () => {
                                                setPending(provider.id)
                                                await disconnectNango(provider.id)
                                                await load()
                                                setPending(null)
                                            }}
                                        >
                                            Disconnect
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className="bg-brand text-white hover:bg-brand/90"
                                            disabled={pending === provider.id}
                                            onClick={() => void connectNango(provider.id)}
                                        >
                                            {pending === provider.id ? <PiSpinner className="animate-spin" /> : "Connect"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
