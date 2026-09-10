import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function MarketingShell({
  children,
  footer,
  className,
}: {
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-h-svh overflow-x-clip bg-ink text-brand-ink", className)}>
      <div className="marketing-shell">
        <div className="marketing-frame">{children}</div>
      </div>
      {footer}
    </div>
  )
}
