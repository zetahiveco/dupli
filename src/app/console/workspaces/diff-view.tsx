"use client"

import { cn } from "@/lib/utils"

type LineKind = "add" | "del" | "hunk" | "meta" | "ctx"

function lineKind(line: string): LineKind {
    if (
        line.startsWith("diff ") ||
        line.startsWith("index ") ||
        line.startsWith("+++") ||
        line.startsWith("---") ||
        line.startsWith("new file") ||
        line.startsWith("deleted file") ||
        line.startsWith("old mode") ||
        line.startsWith("new mode")
    ) {
        return "meta"
    }
    if (line.startsWith("@@")) return "hunk"
    if (line.startsWith("+")) return "add"
    if (line.startsWith("-")) return "del"
    return "ctx"
}

function mark(kind: LineKind) {
    if (kind === "add") return "+"
    if (kind === "del") return "-"
    return " "
}

export default function DiffView({ patch }: { patch: string }) {
    const lines = patch.replace(/\n$/, "").split("\n")
    return (
        <pre className="min-h-full overflow-x-auto text-[13px] leading-5">
            {lines.map((line, index) => {
                const kind = lineKind(line)
                const body = kind === "add" || kind === "del" ? line.slice(1) : line
                return (
                    <div
                        key={`${index}:${line.slice(0, 48)}`}
                        className={cn(
                            "flex min-w-full whitespace-pre-wrap break-all",
                            kind === "add" && "bg-[#1c3d2a] text-[#d4edda]",
                            kind === "del" && "bg-[#3d1c1c] text-[#f8d7da]",
                            kind === "hunk" && "bg-[#1a2d3d] text-[#7eb8da]",
                            kind === "meta" && "text-white/30",
                            kind === "ctx" && "text-white/65",
                        )}
                    >
                        <span
                            className={cn(
                                "w-4 shrink-0 select-none text-center",
                                kind === "add" && "text-[#3fb950]",
                                kind === "del" && "text-[#f85149]",
                                kind === "hunk" && "text-[#7eb8da]",
                            )}
                        >
                            {mark(kind)}
                        </span>
                        <span className="flex-1 pr-2">{body || " "}</span>
                    </div>
                )
            })}
        </pre>
    )
}
