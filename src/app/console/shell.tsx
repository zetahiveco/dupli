"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
    BarChart3,
    Bolt,
    Boxes,
    CreditCard,
    Plus,
    Settings,
    Workflow,
} from "lucide-react"
import { PiMagnifyingGlass } from "react-icons/pi"
import { Toaster } from "@/components/ui/sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { harnessName } from "@/services/harness"
import { HarnessLogo } from "@/components/shared/harness-logo"
import { listOrgWorkspaces, type SidebarWorkspace } from "./workspaces/actions"
import NewWorkspaceDialog from "./workspaces/new-dialog"
import OnboardingChecklist from "./onboarding/checklist"
import ConsoleTour from "./onboarding/tour"
import { NEW_WORKSPACE_EVENT } from "./onboarding/types"

const nav = [
    { href: "/console/environments", label: "Environments", icon: Boxes },
    { href: "/console/automations", label: "Automations", icon: Bolt },
    { href: "/console/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/console/integrations", label: "Integrations", icon: Workflow },
    { href: "/console/settings", label: "Settings", icon: Settings },
    { href: "/console/billing", label: "Billing", icon: CreditCard },
]

export default function ConsoleShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [workspaces, setWorkspaces] = useState<SidebarWorkspace[]>([])
    const [newOpen, setNewOpen] = useState(false)

    const load = async () => {
        try {
            const rows = await listOrgWorkspaces()
            setWorkspaces(rows.map((row) => ({
                id: row.id,
                name: row.name,
                harness: row.harness,
                updatedAt: row.updatedAt,
            })))
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        void load()
    }, [pathname])

    useEffect(() => {
        const openNew = () => setNewOpen(true)
        window.addEventListener(NEW_WORKSPACE_EVENT, openNew)
        return () => window.removeEventListener(NEW_WORKSPACE_EVENT, openNew)
    }, [])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return workspaces
        return workspaces.filter((row) => row.name.toLowerCase().includes(q) || harnessName(row.harness).toLowerCase().includes(q))
    }, [query, workspaces])

    const grouped = useMemo(() => {
        const map = new Map<string, SidebarWorkspace[]>()
        for (const row of filtered) {
            const key = harnessName(row.harness)
            map.set(key, [...(map.get(key) ?? []), row])
        }
        return Array.from(map.entries())
    }, [filtered])

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#0B0B0E] text-brand-ink">
            <aside className="flex h-full w-[272px] shrink-0 flex-col border-r border-white/10 bg-[#0B0B0E]">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/console/workspaces" className="flex items-center gap-2">
                        <Image src="/logo.svg" alt="Dupli" width={22} height={22} />
                        <span className="text-sm font-semibold tracking-tight">Dupli</span>
                    </Link>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-white/70 hover:bg-white/8 hover:text-brand"
                        onClick={() => setNewOpen(true)}
                        aria-label="New workspace"
                        data-tour="new-workspace"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="px-3 pb-3">
                    <div className="relative">
                        <PiMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-white" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search"
                            className="h-8 border-white/10 bg-white/[0.04] pl-8 text-xs"
                        />
                    </div>
                </div>

                <nav className="space-y-0.5 px-2">
                    {nav.map((item) => {
                        const active = pathname.startsWith(item.href)
                        const tourId =
                            item.href === "/console/automations"
                                ? "automations"
                                : item.href === "/console/integrations"
                                    ? "integrations"
                                    : undefined
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                data-tour={tourId}
                                className={cn(
                                    "flex items-center gap-2 rounded-none px-2.5 py-1.5 text-[13px] transition-colors",
                                    active
                                        ? "bg-brand/12 text-brand"
                                        : "text-white/65 hover:bg-white/[0.05] hover:text-white",
                                )}
                            >
                                <item.icon className="h-3.5 w-3.5" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-3" data-tour="workspaces">
                    <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                        All workspaces
                    </p>
                    {grouped.length === 0 ? (
                        <p className="px-2.5 py-6 text-xs text-white/35">No workspaces yet.</p>
                    ) : (
                        grouped.map(([group, rows]) => (
                            <div key={group} className="mb-3">
                                <p className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-white/40">
                                    <HarnessLogo harness={rows[0].harness} className="h-3 w-3 text-white/50" />
                                    {group}
                                </p>
                                {rows.map((row) => {
                                    const href = `/console/workspaces/${row.id}`
                                    const active = pathname === href
                                    return (
                                        <button
                                            key={row.id}
                                            onClick={() => router.push(href)}
                                            className={cn(
                                                "flex w-full items-center gap-2 truncate rounded-none border-l-2 px-2.5 py-1.5 text-left text-[13px]",
                                                active
                                                    ? "border-brand bg-brand/12 text-brand"
                                                    : "border-transparent text-white/70 hover:bg-white/[0.05]",
                                            )}
                                        >
                                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", active ? "bg-brand" : "bg-white/25")} />
                                            <span className="truncate">{row.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t border-white/10 px-3 py-3">
                    <OnboardingChecklist />
                </div>
            </aside>

            <div className="min-w-0 flex-1 overflow-hidden h-full">
                {children}
            </div>
            <Toaster />
            <ConsoleTour />
            <NewWorkspaceDialog
                open={newOpen}
                onOpenChange={setNewOpen}
                onCreated={() => {
                    void load()
                }}
            />
        </div>
    )
}
