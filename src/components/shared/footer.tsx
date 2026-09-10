import Image from "next/image"
import Link from "next/link"
import { PiLinkedinLogo } from "react-icons/pi"
import { CAPABILITIES } from "./platform"

const developerLinks = [
    { href: "/docs/api", label: "REST API" },
    { href: "/docs/mcp", label: "Agents" },
    { href: "/docs/webhooks", label: "Webhooks & Automations" },
    { href: "/#harnesses", label: "Supported Harnesses" },
    { href: "/docs", label: "Documentation" },
]

const companyLinks = [
    { href: "/#pricing", label: "Pricing" },
    { href: "/#security", label: "Enterprise" },
    { href: "/blog", label: "Blog" },
    { href: "/blog/dupli-vs-replicas", label: "Dupli vs Replicas" },
    { href: "/#faq", label: "FAQ" },
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-of-service", label: "Terms of Service" },
    { href: "/refund-policy", label: "Refund Policy" },
]

const linkClass = "text-sm text-white/55 transition hover:text-brand"

export default function Footer() {
    return (
        <footer className="relative w-full overflow-hidden border-t border-white/10 bg-[#08080A] text-white">
            <div
                className="pointer-events-none absolute inset-0 opacity-80"
                aria-hidden
                style={{
                    background:
                        "radial-gradient(ellipse 80% 50% at 15% 0%, rgba(255,132,55,0.16), transparent 58%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(255,181,135,0.08), transparent 52%)",
                }}
            />
            <div className="relative w-full px-6 py-14 md:px-10 lg:px-16">
                <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-sm space-y-4">
                        <Link href="/" className="inline-flex items-center">
                            <Image src="/logo-full.svg" alt="Dupli" height={36} width={88} className="h-9 w-auto" />
                        </Link>
                        <p className="text-sm leading-relaxed text-white/55">
                            The cloud coding agent. Run agents inside isolated cloud machines with your
                            codebases, tooling and dependencies — one machine per agent.
                        </p>
                        <Link
                            href="/auth/signup"
                            className="inline-flex bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand/90"
                        >
                            Get started
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-semibold text-white">Platform</p>
                            {CAPABILITIES.map((capability) => (
                                <Link key={capability.id} href={capability.href} className={linkClass}>
                                    {capability.label}
                                </Link>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-semibold text-white">Developers</p>
                            {developerLinks.map((link) => (
                                <Link key={link.href} href={link.href} className={linkClass}>
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-semibold text-white">Company</p>
                            {companyLinks.map((link) => (
                                <Link key={link.href} href={link.href} className={linkClass}>
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-semibold text-white">Connect</p>
                            <Link
                                href="https://www.linkedin.com/company/dupli-dev"
                                className="inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-brand"
                            >
                                LinkedIn <PiLinkedinLogo />
                            </Link>
                            <Link href="mailto:support@dupli.dev" className={linkClass}>
                                support@dupli.dev
                            </Link>
                            <Link href="mailto:founders@dupli.dev" className={linkClass}>
                                founders@dupli.dev
                            </Link>
                            <Link href="/auth/login" className={linkClass}>
                                Log in
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-white/40">© 2026 Dupli (dba Zetahive Technologies Pvt Ltd)</p>
                    <p className="inline-flex items-center gap-2 text-sm text-white/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        All systems operational
                    </p>
                </div>
            </div>
        </footer>
    )
}
