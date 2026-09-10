import { NextResponse } from 'next/server';

export async function GET() {
    const content = `# Dupli — The Cloud Coding Agent

backed-by: isolation, not a shared box
domain: https://dupli.dev
status: One machine per agent. Delegate from Slack, Linear, GitHub or the API.

> Run coding agents inside isolated cloud machines with your codebases, tooling and dependencies.

- [Get Started](/auth/signup)
- [How It Works](/docs)
- [REST API](/docs/api)
- [Webhooks](/docs/webhooks)
- [Agents](/docs/mcp)
- [Pricing](/#pricing)
- [Dupli vs Replicas](/blog/dupli-vs-replicas)
- [Software Factory](/blog/software-factory)
- [DeepSeek Harness](/blog/deepseek-harness)

## Product

Dupli boots a dedicated Linux VM for every coding-agent run. Claude Code, Codex, DeepSeek Harness, opencode and Gemini CLI all run on the same environment primitives. Warm hooks preinstall dependencies. Agents drive a real desktop and browser, then hand back a pull request, a reply and a recording.

## How it works

- delegate — From Linear, Slack, GitHub, GitLab, the dashboard, the CLI or the API.
- sandbox — Each harness gets its own Linux VM. Nothing is shared between runs.
- pull_request — A diff, a reply, a recording. Merge it, comment on it, or send it again.

## Harnesses

Claude Code, Codex, DeepSeek Harness (dsh), opencode, Gemini CLI. Bring your own model keys.

## Pricing

- Personal: $20/mo per user. 5,000 machine-minutes included. Billed monthly.
- Enterprise: Contact. SOC 2, SAML SSO, dedicated account manager, VPC peering, SIEM export, uptime SLA.

## Contact

- support@dupli.dev
- founders@dupli.dev
- https://www.linkedin.com/company/dupli-dev

© 2026 Dupli (dba Zetahive Technologies Pvt Ltd)
`;

    return new NextResponse(content, {
        status: 200,
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8'
        }
    });
}
