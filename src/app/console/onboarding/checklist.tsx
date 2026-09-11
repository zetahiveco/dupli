"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { PiCheck, PiCircle, PiRocketLaunchFill } from "react-icons/pi"
import { CircularProgress } from "@/components/ui/circular-progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
    CONNECT_INTEGRATION,
    CREATE_API_KEY,
    CREATE_WORKSPACE,
    NEW_WORKSPACE_EVENT,
    PRODUCT_TOUR_EVENT,
    TAKE_TOUR,
} from "./types"
import { useOnboarding } from "./provider"

export default function OnboardingChecklist() {
    const router = useRouter()
    const pathname = usePathname()
    const { items, completed, progress } = useOnboarding()
    const [open, setOpen] = useState(false)

    if (items.length === 0) return null

    const doneCount = items.filter((item) => completed.includes(item)).length

    const handleItem = async (item: string) => {
        setOpen(false)

        if (item === CREATE_WORKSPACE) {
            window.dispatchEvent(new Event(NEW_WORKSPACE_EVENT))
            if (!pathname.startsWith("/console/workspaces")) {
                router.push("/console/workspaces")
            }
            return
        }

        if (item === CREATE_API_KEY) {
            if (pathname === "/console/settings") {
                document.getElementById("api-key")?.scrollIntoView({ behavior: "smooth" })
            } else {
                router.push("/console/settings#api-key")
            }
            return
        }

        if (item === CONNECT_INTEGRATION) {
            router.push("/console/integrations")
            return
        }

        if (item === TAKE_TOUR) {
            if (!pathname.startsWith("/console/workspaces")) {
                router.push("/console/workspaces?tour=1")
                return
            }
            window.dispatchEvent(new Event(PRODUCT_TOUR_EVENT))
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Tooltip open={open ? false : undefined}>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            aria-label="Getting started"
                            className={cn(
                                "flex w-full items-center gap-2 px-1 py-1.5 text-left hover:bg-white/[0.06] transition-all",
                                progress < 100 && "text-brand"
                            )}
                        >
                            <CircularProgress
                                value={progress}
                                size={34}
                                strokeWidth={3}
                                strokeColor="var(--primary)"
                            >
                                <PiRocketLaunchFill className="size-3.5 text-primary" />
                            </CircularProgress>
                            <span className="text-[11px] text-white/55">Getting started</span>
                        </button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                    Getting started
                </TooltipContent>
            </Tooltip>
            <PopoverContent side="right" align="end" sideOffset={12} className="w-72 p-0">
                <div className="px-4 py-3 border-b border-slate-200/90">
                    <p className="text-sm font-semibold">Getting started with Dupli</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {doneCount} of {items.length} complete
                    </p>
                </div>
                <ul className="p-2">
                    {items.map((item) => {
                        const done = completed.includes(item)
                        return (
                            <li key={item}>
                                <button
                                    type="button"
                                    onClick={() => void handleItem(item)}
                                    className="w-full flex items-start gap-2.5 px-2 py-2 text-left text-sm hover:bg-white/[0.06] transition-colors"
                                >
                                    {done ? (
                                        <PiCheck className="size-4 mt-0.5 shrink-0 text-green-600" />
                                    ) : (
                                        <PiCircle className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    )}
                                    <span className={done ? "text-muted-foreground" : undefined}>
                                        {item}
                                    </span>
                                    {done && (
                                        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                                            Replay
                                        </span>
                                    )}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </PopoverContent>
        </Popover>
    )
}
