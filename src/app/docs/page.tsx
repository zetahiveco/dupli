import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Overview",
}

export default function DocsIndexPage() {
    return (
        <div className="space-y-10">
            <header className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
                <p className="text-slate-600">
                    Dupli runs coding agents inside isolated cloud machines. Create a workspace, upload files
                    onto the machine, send chat, pick a model, and review the files the agent changed. Automations start
                    the same flow from cron, a webhook, or a connected integration.
                </p>
            </header>
            <section className="space-y-3">
                <h2 className="text-xl font-semibold">Authentication</h2>
                <p className="text-slate-600">
                    The REST API uses{" "}
                    <code className="border border-white/10 bg-white/[0.04] px-1">Authorization: Bearer &lt;api_key&gt;</code>.
                    Generate a key in Settings. You can also send{" "}
                    <code className="border border-white/10 bg-white/[0.04] px-1">x-api-key</code>.
                </p>
            </section>
            <section className="grid gap-4 sm:grid-cols-3">
                <Link href="/docs/api" className="border border-white/10 p-5 transition-colors hover:border-brand/40">
                    <h2 className="text-lg font-semibold">REST API</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Workspaces, chat, file uploads, and automations.
                    </p>
                </Link>
                <Link href="/docs/webhooks" className="border border-white/10 p-5 transition-colors hover:border-brand/40">
                    <h2 className="text-lg font-semibold">Webhooks</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Fire a workspace from HTTP, cron, or a connected integration.
                    </p>
                </Link>
                <Link href="/docs/mcp" className="border border-white/10 p-5 transition-colors hover:border-brand/40">
                    <h2 className="text-lg font-semibold">Agents</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Call Dupli from Cursor, Claude, or any HTTP client.
                    </p>
                </Link>
            </section>
        </div>
    )
}
