"use client"

import React from "react"
import { PiBookFill, PiCreditCardFill, PiGearFill, PiStackFill } from "react-icons/pi"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { Toaster } from "../ui/sonner"
import NotificationsPopover from "./notifications-popover"
import OnboardingChecklist from "@/app/console/onboarding/checklist"

const routes = [
    {
        name: "Database",
        icon: PiStackFill,
        path: "/console/database"
    },
    {
        name: "Settings",
        icon: PiGearFill,
        path: "/console/settings"
    },
    {
        name: "Billing",
        icon: PiCreditCardFill,
        path: "/console/billing"
    },
    {
        name: "Documentation",
        icon: PiBookFill,
        path: "/docs"
    }
]


export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const lockBodyScroll =
        pathname.startsWith("/console/database") ||
        pathname.startsWith("/console/integrations") ||
        pathname.startsWith("/console/profiles") ||
        pathname.startsWith("/console/monitor") ||
        pathname.startsWith("/console/tasks")

    return (
        <div className="w-screen h-screen flex overflow-hidden">
            <div className="h-screen flex flex-col justify-between w-[60px] shrink-0 bg-[#0B0B0E] border-r border-white/10">
                <div className="flex flex-col items-center gap-1 pt-5 w-full">
                    <Image src="/logo.svg" alt="Dupli" width={30} height={30} className="mb-2" />
                    {routes.map((route) => (
                        <Tooltip key={route.path}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => router.push(route.path)}
                                    className={`ripple ripple-dark relative overflow-hidden w-full py-3 pl-2 pr-2 active:scale-95 flex items-center justify-center rounded-none gap-2 transition-all duration-200 text-[15px] border-l-[3px] min-h-[44px]
                                        ${pathname === route.path || pathname.startsWith(route.path + "/")
                                            ? "bg-brand/15 border-brand text-brand font-semibold"
                                            : "border-transparent hover:bg-white/[0.06] text-white/55"
                                        }`}
                                >
                                    <route.icon className="text-xl" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" align="center">
                                {route.name}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                    <NotificationsPopover />
                </div>
                <OnboardingChecklist />
            </div>
            <Toaster />
            <div
                style={{ width: "calc(100vw - 60px)" }}
                className={`h-full min-h-0 overflow-x-hidden ${lockBodyScroll ? "overflow-y-hidden" : "overflow-y-auto"}`}
            >
                {children}
            </div>
        </div>
    )
}
