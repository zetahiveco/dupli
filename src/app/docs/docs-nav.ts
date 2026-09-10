export type DocsNavChild = {
    href: string
    label: string
}

export type DocsNavItem = {
    href: string
    label: string
    children?: DocsNavChild[]
}

export const DOCS_NAV: DocsNavItem[] = [
    { href: "/docs", label: "Overview" },
    {
        href: "/docs/api",
        label: "REST API",
        children: [
            { href: "/docs/api#get-api-v1-workspaces", label: "GET /workspaces" },
            { href: "/docs/api#post-api-v1-workspaces", label: "POST /workspaces" },
            { href: "/docs/api#get-api-v1-workspaces-id", label: "GET /workspaces/:id" },
            { href: "/docs/api#patch-api-v1-workspaces-id", label: "PATCH /workspaces/:id" },
            { href: "/docs/api#delete-api-v1-workspaces-id", label: "DELETE /workspaces/:id" },
            { href: "/docs/api#post-api-v1-workspaces-id-files", label: "POST /workspaces/:id/files" },
            { href: "/docs/api#get-api-v1-workspaces-id-chat", label: "GET /workspaces/:id/chat" },
            { href: "/docs/api#post-api-v1-workspaces-id-chat", label: "POST /workspaces/:id/chat" },
            { href: "/docs/api#get-api-v1-automations", label: "GET /automations" },
            { href: "/docs/api#post-api-v1-automations", label: "POST /automations" },
            { href: "/docs/api#get-api-v1-automations-id", label: "GET /automations/:id" },
            { href: "/docs/api#patch-api-v1-automations-id", label: "PATCH /automations/:id" },
            { href: "/docs/api#delete-api-v1-automations-id", label: "DELETE /automations/:id" },
            { href: "/docs/api#post-api-v1-automations-run", label: "POST /automations/run" },
            { href: "/docs/api#post-api-v1-automations-id", label: "POST /automations/:id" },
        ],
    },
    {
        href: "/docs/webhooks",
        label: "Webhooks",
        children: [
            { href: "/docs/webhooks#automation-webhook", label: "Automation webhook" },
            { href: "/docs/webhooks#api-run", label: "API run" },
            { href: "/docs/webhooks#payload", label: "Payload" },
            { href: "/docs/webhooks#delivery", label: "Delivery" },
        ],
    },
    {
        href: "/docs/mcp",
        label: "Agents",
        children: [
            { href: "/docs/mcp#from-cursor-or-claude", label: "From Cursor or Claude" },
            { href: "/docs/mcp#automations-from-your-stack", label: "Automations from your stack" },
        ],
    },
]

export function splitHref(href: string) {
    const [path, hash] = href.split("#")
    return { path, hash: hash ? `#${hash}` : "" }
}

export function isNavExact(href: string, pathname: string, hash: string) {
    const { path, hash: itemHash } = splitHref(href)
    if (itemHash) return pathname === path && hash === itemHash
    if (path === "/docs") return pathname === "/docs"
    if (path === "/docs/api" || path === "/docs/mcp" || path === "/docs/webhooks") return pathname === path && !hash
    return pathname === path
}

export function isNavSection(href: string, pathname: string) {
    const { path } = splitHref(href)
    if (path === "/docs") return pathname === "/docs"
    return pathname === path || pathname.startsWith(`${path}/`)
}
