"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import NewWorkspaceDialog from "./new-dialog"

export default function EmptyWorkspaces() {
    const [open, setOpen] = useState(false)

    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Workspace</p>
            <h1 className="text-2xl font-semibold">Pick a workspace or start a new one</h1>
            <p className="max-w-md text-sm text-white/50">
                Each workspace is an isolated Linux machine. Messages, diffs and the terminal stay on the run.
            </p>
            <Button className="bg-brand text-white hover:bg-brand/90" onClick={() => setOpen(true)}>
                New workspace
            </Button>
            <NewWorkspaceDialog open={open} onOpenChange={setOpen} />
        </div>
    )
}
