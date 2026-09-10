"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MINUTE_BREAKDOWN } from "@/lib/billing-constants"
import { PiInfo } from "react-icons/pi"

export function MinuteBreakdownInfo({ className }: { className?: string }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={className ?? "text-gray-500 hover:text-gray-700"}
                    aria-label="Minute breakdown"
                >
                    <PiInfo />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
                <p className="text-sm font-semibold mb-2">Minute breakdown</p>
                <ul className="text-xs space-y-1.5 text-muted-foreground list-disc pl-4">
                    {MINUTE_BREAKDOWN.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    )
}
