"use client"

import { useEffect, useState } from "react"
import { PiSpinner } from "react-icons/pi"
import { loadAnalytics } from "./actions"
import { format } from "date-fns"
import { HarnessLogo } from "@/components/shared/harness-logo"

export default function AnalyticsPage() {
    const [data, setData] = useState<Awaited<ReturnType<typeof loadAnalytics>> | null>(null)

    useEffect(() => {
        void loadAnalytics().then(setData)
    }, [])

    if (!data) {
        return <div className="flex h-full items-center justify-center"><PiSpinner className="animate-spin" /></div>
    }

    const cards = [
        { label: "Workspaces", value: data.workspaceCount },
        { label: "Automations", value: data.automationCount },
        { label: "Messages", value: data.messageCount },
        { label: "Harness keys", value: data.harnessKeys },
    ]

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="h-12 border-b border-white/10 px-5">
                <div className="flex h-full flex-col justify-center">
                    <h1 className="text-sm font-semibold">Analytics</h1>
                    <p className="text-[11px] text-white/40">Where machine-minutes and runs went.</p>
                </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-8">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {cards.map((card) => (
                        <div key={card.label} className="border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-wide text-white/40">{card.label}</p>
                            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
                        </div>
                    ))}
                </div>
                <section>
                    <h2 className="mb-3 text-sm font-medium">Harnesses</h2>
                    <div className="space-y-2">
                        {data.harnesses.length === 0 && <p className="text-sm text-white/40">No runs yet.</p>}
                        {data.harnesses.map((item) => (
                            <div key={item.id} className="flex items-center justify-between border border-white/10 px-3 py-2 text-sm">
                                <span className="flex items-center gap-2">
                                    <HarnessLogo harness={item.id} className="h-4 w-4 text-white/80" />
                                    {item.name}
                                </span>
                                <span className="text-brand">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </section>
                <section>
                    <h2 className="mb-3 text-sm font-medium">Recent workspaces</h2>
                    <div className="space-y-2">
                        {data.recent.map((item, index) => (
                            <div key={index} className="flex items-center justify-between border border-white/10 px-3 py-2 text-sm">
                                <span>{item.harness}</span>
                                <span className="text-xs text-white/40">{format(new Date(item.updatedAt), "MMM d, h:mm a")}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
