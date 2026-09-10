import { cn } from "@/lib/utils"

export const HARNESS_ICONS: Record<string, string> = {
    CLAUDE_CODEX: "/harnesses/claude.svg",
    "claude-code": "/harnesses/claude.svg",
    OPENAI_CODEX: "/harnesses/openai.svg",
    codex: "/harnesses/openai.svg",
    GEMINI_CLI: "/harnesses/gemini.svg",
    "gemini-cli": "/harnesses/gemini.svg",
    DEEPSEEK_HARNESS: "/harnesses/deepseek.svg",
    "deepseek-harness": "/harnesses/deepseek.svg",
    FX: "/harnesses/fireworks.svg",
    KIMI_CODE: "/harnesses/kimi.svg",
    OPENCODE: "/harnesses/opencode.svg",
    opencode: "/harnesses/opencode.svg",
    MUSE_CODE: "/harnesses/muse.svg",
    PI: "/harnesses/pi.svg",
}

export function harnessIcon(id: string) {
    return HARNESS_ICONS[id] || "/harnesses/claude.svg"
}

export function HarnessLogo({
    harness,
    className,
    title,
}: {
    harness: string
    className?: string
    title?: string
}) {
    return (
        <span
            role="img"
            aria-label={title || harness}
            title={title}
            className={cn("inline-block h-4 w-4 shrink-0 bg-current", className)}
            style={{
                maskImage: `url(${harnessIcon(harness)})`,
                WebkitMaskImage: `url(${harnessIcon(harness)})`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
            }}
        />
    )
}
