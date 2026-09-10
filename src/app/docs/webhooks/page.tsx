import type { Metadata } from "next"
import { DocsMarkdown, readDocsMarkdown } from "../markdown"

export const metadata: Metadata = {
    title: "Webhooks",
}

export default async function WebhooksDocsPage() {
    return <DocsMarkdown source={await readDocsMarkdown("webhooks.md")} />
}
