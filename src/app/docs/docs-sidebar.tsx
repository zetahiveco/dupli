"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { DOCS_NAV, isNavExact, isNavSection, splitHref } from "./docs-nav"

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    const [hash, setHash] = useState("")

    useEffect(() => {
        const sync = () => setHash(window.location.hash)
        sync()
        window.addEventListener("hashchange", sync)
        window.addEventListener("popstate", sync)
        return () => {
            window.removeEventListener("hashchange", sync)
            window.removeEventListener("popstate", sync)
        }
    }, [pathname])

    useEffect(() => {
        const headingIds = DOCS_NAV.flatMap((item) => item.children ?? [])
            .map((child) => splitHref(child.href))
            .filter((item) => item.path === pathname && item.hash)
            .map((item) => item.hash.slice(1))

        if (headingIds.length === 0) return

        const elements = headingIds
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => Boolean(el))

        if (elements.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
                if (visible[0]?.target.id) {
                    setHash(`#${visible[0].target.id}`)
                }
            },
            { rootMargin: "-96px 0px -55% 0px", threshold: 0 },
        )

        for (const el of elements) observer.observe(el)
        return () => observer.disconnect()
    }, [pathname])

    return (
        <nav className="px-3 py-4">
            <p className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Docs
            </p>
            <ul className="space-y-3">
                {DOCS_NAV.map((item) => {
                    const sectionActive = isNavSection(item.href, pathname)
                    const exact = isNavExact(item.href, pathname, hash)
                    return (
                        <li key={item.href}>
                            <NavLink
                                href={item.href}
                                active={exact}
                                className={cn(
                                    "px-2 py-1.5 text-sm font-medium",
                                    exact
                                        ? "bg-brand/15 text-brand-ink"
                                        : sectionActive
                                          ? "text-brand-ink"
                                          : "text-slate-600 hover:bg-white/[0.04] hover:text-brand-ink",
                                )}
                                onNavigate={onNavigate}
                                onHash={setHash}
                            >
                                {item.label}
                            </NavLink>
                            {item.children && (
                                <ul className="mt-1 ml-3 border-l border-white/10">
                                    {item.children.map((child) => {
                                        const childActive = isNavExact(child.href, pathname, hash)
                                        return (
                                            <li key={child.href}>
                                                <NavLink
                                                    href={child.href}
                                                    active={childActive}
                                                    className={cn(
                                                        "-ml-px border-l-2 py-1 pl-3 pr-2 text-[13px]",
                                                        childActive
                                                            ? "border-brand bg-brand/15 text-brand-ink font-medium"
                                                            : "border-transparent text-slate-500 hover:text-brand-ink",
                                                    )}
                                                    onNavigate={onNavigate}
                                                    onHash={setHash}
                                                >
                                                    {child.label}
                                                </NavLink>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}

function NavLink({
    href,
    active,
    className,
    onNavigate,
    onHash,
    children,
}: {
    href: string
    active?: boolean
    className?: string
    onNavigate?: () => void
    onHash?: (hash: string) => void
    children: ReactNode
}) {
    const pathname = usePathname()
    const { path, hash } = splitHref(href)

    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("block", className)}
            onClick={() => {
                onHash?.(hash)
                onNavigate?.()
                if (hash && pathname === path) {
                    requestAnimationFrame(() => {
                        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" })
                    })
                }
            }}
        >
            {children}
        </Link>
    )
}
