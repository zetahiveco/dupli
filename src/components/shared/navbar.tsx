"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { MdClose, MdMenu, MdOpenInNew } from "react-icons/md"
import { PiCaretDown, PiCaretUp, PiLock } from "react-icons/pi"
import { BookOpen, Code2, Newspaper, ShieldCheck, Terminal, Webhook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CAPABILITIES, HARNESSES } from "./platform"
import { HarnessLogo } from "./harness-logo"
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

const developers = [
    {
        href: "/docs/api",
        label: "REST API",
        description: "Workspaces, chat, uploads, and automations",
        icon: Code2,
    },
    {
        href: "/docs/mcp",
        label: "Agents",
        description: "Call Dupli from Cursor, Claude, or HTTP",
        icon: Terminal,
    },
    {
        href: "/docs/webhooks",
        label: "Webhooks & Automations",
        description: "Fire runs from schedules, webhooks and events",
        icon: Webhook,
    },
]

const resources = [
    {
        href: "/docs",
        label: "Documentation",
        description: "Environment config, API reference and harness setup",
        icon: BookOpen,
    },
    {
        href: "/blog",
        label: "Blog",
        description: "Dupli vs Replicas, software factory, DeepSeek Harness",
        icon: Newspaper,
    },
    {
        href: "/#security",
        label: "Security",
        description: "SOC 2, SAML SSO, scoped credentials and audit logs",
        icon: ShieldCheck,
    },
]

const triggerClass =
    "group inline-flex h-10 w-max items-center justify-center bg-transparent px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-brand/12 hover:text-brand-ink focus:bg-brand/12 focus:outline-none data-[state=open]:bg-brand/12"

const menuItemClass =
    "flex items-start gap-3 px-3 py-3 transition-colors hover:bg-brand/12"

function MenuIcon({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-brand/25 bg-brand/8 text-brand">
            {children}
        </div>
    )
}

export default function Navbar() {
    const { isSignedIn } = useAuth()
    const [show, setShow] = useState(false)
    const [mobileAccordion, setMobileAccordion] = useState("")
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const authLink = isSignedIn ? (
        <Link
            href="/console"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-brand"
        >
            <MdOpenInNew className="h-4 w-4" />
            View Console
        </Link>
    ) : (
        <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-brand"
        >
            <PiLock className="h-4 w-4" />
            Login
        </Link>
    )

    return (
        <>
        <nav
            className={`marketing-nav marketing-rule transition-colors duration-300 ${
                scrolled
                    ? "bg-[#08080A]/85 backdrop-blur-xl"
                    : "bg-[#08080A]/60 backdrop-blur-lg"
            }`}
        >
            <div className="flex h-18 items-center justify-between px-6 md:px-10">
                <div className="flex items-center gap-6">
                    <Link className="link link-hover flex items-center" href="/">
                        <Image src="/logo-full.svg" alt="Dupli" height={36} width={88} className="h-9 w-auto" priority />
                    </Link>
                    <NavigationMenu className="hidden md:flex">
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className={triggerClass}>Platform</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="grid w-180 grid-cols-3 gap-1">
                                        {CAPABILITIES.map((item) => (
                                            <Link key={item.id} href={item.href} className={menuItemClass}>
                                                <MenuIcon>
                                                    <item.icon className="h-4 w-4" />
                                                </MenuIcon>
                                                <div>
                                                    <p className="text-sm font-medium text-brand-ink">{item.label}</p>
                                                    <p className="mt-0.5 text-xs text-slate-500">{item.nav}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className={triggerClass}>Harnesses</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="w-95 space-y-1">
                                        {HARNESSES.map((item) => (
                                            <Link key={item.id} href="/#harnesses" className={menuItemClass}>
                                                <MenuIcon>
                                                    <HarnessLogo harness={item.id} className="h-4 w-4 text-brand" />
                                                </MenuIcon>
                                                <div>
                                                    <p className="text-sm font-medium text-brand-ink">{item.name}</p>
                                                    <p className="mt-0.5 text-xs text-slate-500">{item.note}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className={triggerClass}>Developers</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="w-95 space-y-1">
                                        {developers.map((item) => (
                                            <Link key={item.label} href={item.href} className={menuItemClass}>
                                                <MenuIcon>
                                                    <item.icon className="h-4 w-4" />
                                                </MenuIcon>
                                                <div>
                                                    <p className="text-sm font-medium text-brand-ink">{item.label}</p>
                                                    <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className={triggerClass}>Resources</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="w-95 space-y-1">
                                        {resources.map((item) => (
                                            <Link key={item.label} href={item.href} className={menuItemClass}>
                                                <MenuIcon>
                                                    <item.icon className="h-4 w-4" />
                                                </MenuIcon>
                                                <div>
                                                    <p className="text-sm font-medium text-brand-ink">{item.label}</p>
                                                    <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild className={triggerClass}>
                                    <Link href="/#pricing">Pricing</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild className={triggerClass}>
                                    <Link href="/#security">Enterprise</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                <div className="hidden items-center gap-2 md:flex">
                    {authLink}
                    {!isSignedIn && (
                        <Link href="/auth/signup">
                            <Button className="bg-brand px-5 text-white hover:bg-brand/90">Get started</Button>
                        </Link>
                    )}
                </div>

                <button className="mt-1 block text-2xl md:hidden" onClick={() => setShow(!show)} aria-label="Toggle menu">
                    {show ? <MdClose /> : <MdMenu />}
                </button>
            </div>

            {show && (
                <div className="absolute top-18 inset-x-0 z-30 border-b border-white/10 bg-[#0B0B0E]/95 py-5 shadow-2xl backdrop-blur-2xl md:hidden">
                    <div className="flex flex-col gap-3 px-6 md:px-10">
                        <button
                            onClick={() => setMobileAccordion(mobileAccordion === "platform" ? "" : "platform")}
                            className="flex items-center gap-2 py-2 text-left font-medium"
                        >
                            Platform {mobileAccordion === "platform" ? <PiCaretUp /> : <PiCaretDown />}
                        </button>
                        {mobileAccordion === "platform" && (
                            <div className="space-y-1 border border-brand/20 bg-white/[0.03] p-2">
                                {CAPABILITIES.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className="block px-3 py-2.5 text-sm hover:bg-brand/12"
                                        onClick={() => setShow(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setMobileAccordion(mobileAccordion === "harnesses" ? "" : "harnesses")}
                            className="flex items-center gap-2 py-2 text-left font-medium"
                        >
                            Harnesses {mobileAccordion === "harnesses" ? <PiCaretUp /> : <PiCaretDown />}
                        </button>
                        {mobileAccordion === "harnesses" && (
                            <div className="space-y-1 border border-brand/20 bg-white/[0.03] p-2">
                                {HARNESSES.map((item) => (
                                    <Link
                                        key={item.id}
                                        href="/#harnesses"
                                        className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-brand/12"
                                        onClick={() => setShow(false)}
                                    >
                                        <HarnessLogo harness={item.id} className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setMobileAccordion(mobileAccordion === "developers" ? "" : "developers")}
                            className="flex items-center gap-2 py-2 text-left font-medium"
                        >
                            Developers {mobileAccordion === "developers" ? <PiCaretUp /> : <PiCaretDown />}
                        </button>
                        {mobileAccordion === "developers" && (
                            <div className="space-y-1 border border-brand/20 bg-white/[0.03] p-2">
                                {developers.map((item) => (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className="block px-3 py-2.5 text-sm hover:bg-brand/12"
                                        onClick={() => setShow(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setMobileAccordion(mobileAccordion === "resources" ? "" : "resources")}
                            className="flex items-center gap-2 py-2 text-left font-medium"
                        >
                            Resources {mobileAccordion === "resources" ? <PiCaretUp /> : <PiCaretDown />}
                        </button>
                        {mobileAccordion === "resources" && (
                            <div className="space-y-1 border border-brand/20 bg-white/[0.03] p-2">
                                {resources.map((item) => (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className="block px-3 py-2.5 text-sm hover:bg-brand/12"
                                        onClick={() => setShow(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <Link className="py-2 font-medium" href="/#pricing" onClick={() => setShow(false)}>
                            Pricing
                        </Link>
                        <Link className="py-2 font-medium" href="/#security" onClick={() => setShow(false)}>
                            Enterprise
                        </Link>
                        {isSignedIn ? (
                            <Link
                                className="inline-flex items-center gap-1.5 py-2 font-medium"
                                href="/console"
                                onClick={() => setShow(false)}
                            >
                                <MdOpenInNew className="h-4 w-4" />
                                View Console
                            </Link>
                        ) : (
                            <>
                                <Link
                                    className="inline-flex items-center gap-1.5 py-2 font-medium"
                                    href="/auth/login"
                                    onClick={() => setShow(false)}
                                >
                                    <PiLock className="h-4 w-4" />
                                    Login
                                </Link>
                                <Link href="/auth/signup" onClick={() => setShow(false)}>
                                    <Button className="w-full bg-brand text-white hover:bg-brand/90">Get started</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
        <div className="h-18 w-full shrink-0" aria-hidden />
        </>
    )
}
