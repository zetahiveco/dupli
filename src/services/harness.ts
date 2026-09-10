import { Harness } from "../../generated/prisma/enums"

export type ProviderOption = {
    id: string
    label: string
}

export type ModelOption = {
    id: string
    label: string
}

export type HarnessRunOptions = {
    provider?: string
    model?: string
    resume?: boolean
}

export type HarnessMeta = {
    id: Harness
    name: string
    vendor: string
    command: (prompt: string, options?: HarnessRunOptions) => string
    envKey: string
    needsProvider?: boolean
    providers?: ProviderOption[]
    models?: ModelOption[]
    /** CLI can continue the last session in this machine (`-c`, `--continue`, `resume --last`). */
    resumesSession?: boolean
}

function modelFlag(flag: string, model?: string) {
    if (!model || !/^[\w./:+-]+$/.test(model)) return ""
    return `${flag} ${model} `
}

/** Pi `--provider` / auth.json keys from https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/providers.md */
const PI_PROVIDERS: ProviderOption[] = [
    { id: "anthropic", label: "Anthropic" },
    { id: "openai", label: "OpenAI" },
    { id: "google", label: "Google Gemini" },
    { id: "openrouter", label: "OpenRouter" },
    { id: "fireworks", label: "Fireworks" },
    { id: "groq", label: "Groq" },
    { id: "together", label: "Together AI" },
    { id: "deepseek", label: "DeepSeek" },
    { id: "xai", label: "xAI" },
    { id: "mistral", label: "Mistral" },
    { id: "amazon-bedrock", label: "Amazon Bedrock" },
    { id: "azure-openai-responses", label: "Azure OpenAI Responses" },
    { id: "ant-ling", label: "Ant Ling" },
    { id: "baseten", label: "Baseten" },
    { id: "cerebras", label: "Cerebras" },
    { id: "cloudflare-ai-gateway", label: "Cloudflare AI Gateway" },
    { id: "cloudflare-workers-ai", label: "Cloudflare Workers AI" },
    { id: "huggingface", label: "Hugging Face" },
    { id: "kimi-coding", label: "Kimi For Coding" },
    { id: "minimax", label: "MiniMax" },
    { id: "minimax-cn", label: "MiniMax (China)" },
    { id: "nvidia", label: "NVIDIA NIM" },
    { id: "opencode", label: "OpenCode Zen" },
    { id: "opencode-go", label: "OpenCode Go" },
    { id: "qwen-token-plan", label: "Qwen Token Plan" },
    { id: "qwen-token-plan-individual", label: "Qwen Token Plan (Individual)" },
    { id: "qwen-token-plan-cn", label: "Qwen Token Plan (China)" },
    { id: "radius", label: "Radius" },
    { id: "vercel-ai-gateway", label: "Vercel AI Gateway" },
    { id: "xiaomi", label: "Xiaomi MiMo" },
    { id: "xiaomi-token-plan-cn", label: "Xiaomi MiMo Token Plan (China)" },
    { id: "xiaomi-token-plan-ams", label: "Xiaomi MiMo Token Plan (Amsterdam)" },
    { id: "xiaomi-token-plan-sgp", label: "Xiaomi MiMo Token Plan (Singapore)" },
    { id: "zai", label: "ZAI Coding Plan (Global)" },
    { id: "zai-coding-cn", label: "ZAI Coding Plan (China)" },
]

/** OpenCode `/connect` IDs from https://opencode.ai/docs/providers/ */
const OPENCODE_PROVIDERS: ProviderOption[] = [
    { id: "anthropic", label: "Anthropic" },
    { id: "openai", label: "OpenAI" },
    { id: "google", label: "Google" },
    { id: "google-vertex", label: "Google Vertex AI" },
    { id: "openrouter", label: "OpenRouter" },
    { id: "fireworks-ai", label: "Fireworks AI" },
    { id: "groq", label: "Groq" },
    { id: "togetherai", label: "Together AI" },
    { id: "deepseek", label: "DeepSeek" },
    { id: "xai", label: "xAI" },
    { id: "github-copilot", label: "GitHub Copilot" },
    { id: "opencode", label: "OpenCode Zen" },
    { id: "amazon-bedrock", label: "Amazon Bedrock" },
    { id: "azure", label: "Azure OpenAI" },
    { id: "azure-cognitive-services", label: "Azure Cognitive Services" },
    { id: "302ai", label: "302.AI" },
    { id: "baseten", label: "Baseten" },
    { id: "cerebras", label: "Cerebras" },
    { id: "cloudflare-ai-gateway", label: "Cloudflare AI Gateway" },
    { id: "cloudflare-workers-ai", label: "Cloudflare Workers AI" },
    { id: "cortecs", label: "Cortecs" },
    { id: "deepinfra", label: "Deep Infra" },
    { id: "digitalocean", label: "DigitalOcean" },
    { id: "edenai", label: "Eden AI" },
    { id: "frogbot", label: "FrogBot" },
    { id: "gitlab", label: "GitLab Duo" },
    { id: "gmicloud", label: "GMI Cloud" },
    { id: "helicone", label: "Helicone" },
    { id: "huggingface", label: "Hugging Face" },
    { id: "io-net", label: "IO.NET" },
    { id: "llmgateway", label: "LLM Gateway" },
    { id: "minimax", label: "MiniMax" },
    { id: "mistral", label: "Mistral" },
    { id: "modal", label: "Modal" },
    { id: "moonshotai", label: "Moonshot AI" },
    { id: "nebius", label: "Nebius Token Factory" },
    { id: "nvidia", label: "NVIDIA" },
    { id: "ovhcloud", label: "OVHcloud AI Endpoints" },
    { id: "poolside", label: "Poolside" },
    { id: "sap-ai-core", label: "SAP AI Core" },
    { id: "scaleway", label: "Scaleway" },
    { id: "scx-ai", label: "SCX.ai" },
    { id: "snowflake-cortex", label: "Snowflake Cortex" },
    { id: "stackit", label: "STACKIT" },
    { id: "venice", label: "Venice AI" },
    { id: "vercel", label: "Vercel AI Gateway" },
    { id: "zai", label: "Z.AI" },
    { id: "zenmux", label: "ZenMux" },
]

export const HARNESS_META: HarnessMeta[] = [
    {
        id: "CLAUDE_CODEX",
        name: "Claude Code",
        vendor: "Anthropic",
        command: (prompt, options) =>
            `claude -p --dangerously-skip-permissions ${options?.resume ? "-c " : ""}${modelFlag("--model", options?.model)}${JSON.stringify(prompt)}`,
        envKey: "ANTHROPIC_API_KEY",
        resumesSession: true,
        models: [
            { id: "sonnet", label: "Sonnet" },
            { id: "opus", label: "Opus" },
            { id: "haiku", label: "Haiku" },
        ],
    },
    {
        id: "OPENAI_CODEX",
        name: "Codex",
        vendor: "OpenAI",
        command: (prompt, options) =>
            `codex exec --sandbox workspace-write --ask-for-approval never ${options?.resume ? "resume --last " : ""}${modelFlag("--model", options?.model)}${JSON.stringify(prompt)}`,
        envKey: "OPENAI_API_KEY",
        resumesSession: true,
        models: [
            { id: "gpt-5.1", label: "GPT-5.1" },
            { id: "gpt-5", label: "GPT-5" },
            { id: "o3", label: "o3" },
            { id: "o4-mini", label: "o4-mini" },
        ],
    },
    {
        id: "GEMINI_CLI",
        name: "Gemini CLI",
        vendor: "Google",
        command: (prompt, options) =>
            `gemini --yolo ${options?.resume ? "--resume latest " : ""}${modelFlag("-m", options?.model)}-p ${JSON.stringify(prompt)}`,
        envKey: "GEMINI_API_KEY",
        resumesSession: true,
        models: [
            { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
            { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        ],
    },
    {
        id: "DEEPSEEK_HARNESS",
        name: "DeepSeek Harness",
        vendor: "DeepSeek",
        command: (prompt, options) => `dsh --headless ${modelFlag("--model", options?.model)}${JSON.stringify(prompt)}`,
        envKey: "DEEPSEEK_API_KEY",
        models: [
            { id: "deepseek-chat", label: "DeepSeek Chat" },
            { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
        ],
    },
    {
        id: "FX",
        name: "FX",
        vendor: "Fireworks",
        command: (prompt) => `fx ${JSON.stringify(prompt)}`,
        envKey: "FIREWORKS_API_KEY",
    },
    {
        id: "KIMI_CODE",
        name: "Kimi Code",
        vendor: "Moonshot",
        command: (prompt) => `kimi ${JSON.stringify(prompt)}`,
        envKey: "MOONSHOT_API_KEY",
    },
    {
        id: "OPENCODE",
        name: "opencode",
        vendor: "Open source",
        command: (prompt, options) =>
            `opencode run --auto ${options?.resume ? "--continue " : ""}${modelFlag("--model", options?.model)}${JSON.stringify(prompt)}`,
        envKey: "OPENCODE_API_KEY",
        needsProvider: true,
        resumesSession: true,
        providers: OPENCODE_PROVIDERS,
    },
    {
        id: "MUSE_CODE",
        name: "Muse",
        vendor: "Muse",
        command: (prompt) => `muse ${JSON.stringify(prompt)}`,
        envKey: "MUSE_API_KEY",
    },
    {
        id: "PI",
        name: "Pi",
        vendor: "Pi",
        command: (prompt, options) =>
            `pi ${options?.resume ? "-c " : ""}${options?.provider ? `--provider ${options.provider} ` : ""}${modelFlag("--model", options?.model)}${JSON.stringify(prompt)}`,
        envKey: "PI_API_KEY",
        resumesSession: true,
        needsProvider: true,
        providers: PI_PROVIDERS,
    },
]

export function harnessMeta(id: Harness) {
    return HARNESS_META.find((item) => item.id === id) ?? HARNESS_META[0]
}

export function harnessName(id: Harness) {
    return harnessMeta(id).name
}

export function defaultProvider(id: Harness) {
    return harnessMeta(id).providers?.[0]?.id ?? ""
}

export function harnessModels(id: Harness) {
    return harnessMeta(id).models ?? []
}

export function defaultModel(id: Harness) {
    return harnessMeta(id).models?.[0]?.id ?? ""
}

