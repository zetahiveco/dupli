import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Server, Terminal, GitPullRequest, MonitorPlay } from "lucide-react"

const proofPoints = [
    "$20/mo per user, billed monthly",
    "Claude Code, Codex, DeepSeek Harness",
    "SOC 2 Type I and Type II in progress",
]

const surfaces = [
    { icon: Terminal, label: "Any harness" },
    { icon: Server, label: "One VM per run" },
    { icon: GitPullRequest, label: "PR, reply, recording" },
    { icon: MonitorPlay, label: "Real computer use" },
]

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-svh bg-ink">
            <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
                <aside className="relative hidden overflow-hidden bg-ink px-12 py-14 text-white lg:flex lg:flex-col">
                    <div
                        className="pointer-events-none absolute inset-0"
                        aria-hidden
                        style={{
                            background:
                                "radial-gradient(ellipse 70% 50% at 12% 0%, rgba(255,132,55,0.28), transparent 58%), radial-gradient(ellipse 60% 45% at 95% 100%, rgba(255,181,135,0.12), transparent 55%)",
                        }}
                    />
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07]"
                        aria-hidden
                        style={{
                            backgroundImage:
                                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                            backgroundSize: "36px 36px",
                        }}
                    />

                    <div className="relative flex h-full flex-col justify-between">
                        <Link href="/" className="inline-flex w-fit">
                            <Image src="/logo-full.svg" alt="Dupli" height={52} width={150} />
                        </Link>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <span className="inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inset-0 rounded-full bg-brand animate-[ring-out_1.8s_ease-out_infinite]" />
                                        <span className="relative h-1.5 w-1.5 rounded-full bg-brand" />
                                    </span>
                                    Fleet running now
                                </span>
                                <h2 className="max-w-md text-3xl font-semibold leading-[1.15] tracking-tight">
                                    The Cloud Coding Agent
                                </h2>
                                <p className="max-w-md text-sm leading-relaxed text-white/60">
                                    Dupli runs coding agents inside isolated Linux machines preloaded with your
                                    repo, tooling and services. Delegate from Slack, Linear or GitHub — review a
                                    pull request, a recording and a full command log.
                                </p>
                            </div>

                            <div className="grid max-w-md grid-cols-2 gap-2">
                                {surfaces.map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-md"
                                    >
                                        <item.icon className="h-3.5 w-3.5 shrink-0 text-brand-soft" />
                                        <span className="truncate text-xs text-white/75">{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            <ul className="space-y-2">
                                {proofPoints.map((point) => (
                                    <li key={point} className="flex items-center gap-2.5 text-sm text-white/60">
                                        <span className="h-1 w-3 shrink-0 bg-brand" />
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="text-xs text-white/35">
                            © 2026 Dupli (dba Zetahive Technologies Pvt Ltd)
                        </p>
                    </div>
                </aside>

                <main className="relative flex items-center justify-center px-6 py-12">
                    <div
                        className="pointer-events-none absolute inset-0"
                        aria-hidden
                        style={{
                            background:
                                "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,132,55,0.16), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(194,91,38,0.10), transparent 55%)",
                        }}
                    />

                    <div className="relative w-full max-w-[440px] space-y-5">
                        <div className="flex items-center justify-between lg:hidden">
                            <Link href="/" className="inline-flex">
                                <Image src="/logo-full.svg" alt="Dupli" height={44} width={126} />
                            </Link>
                        </div>

                        <div className="auth-clerk">{children}</div>

                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-brand"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to dupli.dev
                        </Link>
                    </div>
                </main>
            </div>
        </div>
    )
}
