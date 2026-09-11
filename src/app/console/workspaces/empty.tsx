"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import NewWorkspaceDialog from "./new-dialog"

const EXAMPLES = [
    "Add a README that explains how to run the project locally.",
    "Write a failing test for the login form, then make it pass.",
    "Find a TODO in the repo and open a small, reviewable fix.",
]

export default function EmptyWorkspaces() {
    const [open, setOpen] = useState(false)

    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Workspace</p>
            <h1 className="text-2xl font-semibold">Give an agent its own Linux machine</h1>
            <p className="max-w-md text-sm text-white/50">
                Pick Claude Code, Codex, Gemini CLI or another harness. Chat, diffs, files and the browser stay on that run — not on your laptop.
            </p>
            <Button className="bg-brand text-white hover:bg-brand/90" onClick={() => setOpen(true)}>
                New workspace
            </Button>
            <ul className="mt-2 max-w-md space-y-1.5 text-left text-xs text-white/40">
                {EXAMPLES.map((example) => (
                    <li key={example}>Try: “{example}”</li>
                ))}
            </ul>
            <NewWorkspaceDialog open={open} onOpenChange={setOpen} />
        </div>
    )
}
