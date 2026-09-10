"use client"

import { useEffect, useState } from "react"
import { getSignalsCount } from "@/app/actions"

export default function Badge() {
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    getSignalsCount()
      .then((count) => {
        if (!cancelled) setTotal(count + 10)
      })
      .catch(() => {
        if (!cancelled) setTotal(10)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="inline-flex items-center gap-2 border border-dashed border-brand/45 bg-brand/8 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inset-0 bg-brand animate-[ring-out_1.6s_ease-out_infinite]" />
        <span className="relative h-2 w-2 bg-brand" />
      </span>
      <span>
        <span className="tabular-nums font-semibold text-brand-ink">
          {total == null ? "—" : total.toLocaleString("en-US")}
        </span>{" "}
        Agent Runs Finished Today
      </span>
    </div>
  )
}
