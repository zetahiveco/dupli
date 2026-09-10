import fs from "fs"
import path from "path"
import { isValidElement, type ReactNode } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getAppUrl } from "@/app/console/settings/actions"

export async function readDocsMarkdown(file: string) {
    const source = fs.readFileSync(path.join(process.cwd(), "src", "app", "docs", "content", file), "utf8")
    const { appUrl } = await getAppUrl()
    return source.replaceAll("$APP_URL", appUrl)
}

function headingText(node: ReactNode): string {
    if (node == null || typeof node === "boolean") return ""
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(headingText).join("")
    if (isValidElement(node)) {
        const props = node.props as { children?: ReactNode }
        return headingText(props.children)
    }
    return ""
}

export function slugifyHeading(value: string) {
    return value
        .toLowerCase()
        .replace(/[`*_]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function Heading({
    as: Tag,
    children,
}: {
    as: "h1" | "h2" | "h3" | "h4"
    children: ReactNode
}) {
    const id = slugifyHeading(headingText(children))
    return (
        <Tag id={id} className="scroll-mt-20">
            {children}
        </Tag>
    )
}

export function DocsMarkdown({ source }: { source: string }) {
    return (
        <div className="mdc">
            <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => <Heading as="h1">{children}</Heading>,
                    h2: ({ children }) => <Heading as="h2">{children}</Heading>,
                    h3: ({ children }) => <Heading as="h3">{children}</Heading>,
                    h4: ({ children }) => <Heading as="h4">{children}</Heading>,
                    table: ({ children }) => (
                        <div className="mdc-table-wrap">
                            <table>{children}</table>
                        </div>
                    ),
                    pre: ({ children }) => (
                        <pre className="mt-3 mb-4 overflow-x-auto border border-slate-200 bg-slate-50 p-4 text-sm">
                            {children}
                        </pre>
                    ),
                    code: ({ children, className }) => {
                        const inline = !className
                        if (inline) {
                            return (
                                <code className="border border-slate-200 bg-slate-50 px-1 py-0.5 text-[13px]">
                                    {children}
                                </code>
                            )
                        }
                        return <code className={className}>{children}</code>
                    },
                }}
            >
                {source}
            </Markdown>
        </div>
    )
}
