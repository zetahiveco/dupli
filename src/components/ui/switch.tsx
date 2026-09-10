"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "ripple ripple-dark peer relative overflow-hidden inline-flex h-5 w-9 shrink-0 items-center rounded-none border border-slate-200/90 dark:border-white/15 shadow-none transition-all duration-200 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=unchecked]:bg-white/50 data-[state=unchecked]:backdrop-blur-sm data-[state=unchecked]:dark:bg-white/10",
        "data-[state=checked]:bg-primary/90 data-[state=checked]:border-primary/50 data-[state=checked]:dark:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-3.5 rounded-none ring-0 transition-transform border border-slate-200/80 dark:border-white/20",
          "bg-white/95 dark:bg-white/90 shadow-none data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-[calc(100%+0.25rem)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
