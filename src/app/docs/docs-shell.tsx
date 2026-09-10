"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { MdMenu } from "react-icons/md"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DocsSidebar } from "./docs-sidebar"

export function DocsShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isLoaded, isSignedIn } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        setMenuOpen(false)
    }, [pathname])

    return (
        <div className="flex h-svh flex-col overflow-hidden bg-ink text-brand-ink">
            <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0B0B0E] px-4">
                <div className="flex items-center gap-2">
                    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                        <SheetTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="lg:hidden">
                                <MdMenu className="size-5" />
                                <span className="sr-only">Open docs menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-72 bg-[#0B0B0E] p-0">
                            <SheetHeader className="border-b border-white/10">
                                <SheetTitle>Documentation</SheetTitle>
                            </SheetHeader>
                            <DocsSidebar onNavigate={() => setMenuOpen(false)} />
                        </SheetContent>
                    </Sheet>
                    <Link href="/docs" className="flex items-center gap-2">
                        <Image src="/logo.svg" alt="Dupli" width={22} height={22} />
                        <span className="text-sm font-semibold tracking-tight">Docs</span>
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/">Home</Link>
                    </Button>
                    {isLoaded && (
                        <Button asChild size="sm">
                            <Link href={isSignedIn ? "/console" : "/auth/login"}>
                                {isSignedIn ? "Console" : "Sign in"}
                            </Link>
                        </Button>
                    )}
                </div>
            </header>
            <div className="flex min-h-0 flex-1">
                <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-[#0B0B0E] lg:block">
                    <DocsSidebar />
                </aside>
                <main className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">{children}</div>
                </main>
            </div>
        </div>
    )
}
