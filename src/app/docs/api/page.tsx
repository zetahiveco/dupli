import type { Metadata } from "next"
import { DocsMarkdown, readDocsMarkdown } from "../markdown"
import { ApiKeyBar } from "./try-it"

export const metadata: Metadata = {
    title: "REST API",
}

export default async function ApiDocsPage() {
    const source = await readDocsMarkdown("api.md")
    const [intro, ...rest] = source.split(/\n---\n/)

    return (
        <>
            <DocsMarkdown source={intro} />
            <ApiKeyBar />
            <DocsMarkdown source={rest.join("\n---\n")} />
        </>
    )
}
