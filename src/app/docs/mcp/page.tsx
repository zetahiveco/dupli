import type { Metadata } from "next"
import { DocsMarkdown, readDocsMarkdown } from "../markdown"

export const metadata: Metadata = {
    title: "Agents",
}

export default async function McpDocsPage() {
    return <DocsMarkdown source={await readDocsMarkdown("mcp.md")} />
}
