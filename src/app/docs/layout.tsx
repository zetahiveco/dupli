import type { Metadata } from "next"
import { DocsShell } from "./docs-shell"

export const metadata: Metadata = {
    title: {
        default: "Documentation",
        template: "%s · Dupli Docs",
    },
    description: "Dupli REST API, webhooks, automations, and cloud coding agent runtime.",
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return <DocsShell>{children}</DocsShell>
}
