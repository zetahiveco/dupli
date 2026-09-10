import Link from "next/link"
import type { ReactNode } from "react"
import { Minus, Plus } from "lucide-react"

const faqs: { question: string; answer: ReactNode }[] = [
  {
    question: "What exactly is Dupli?",
    answer:
      "Dupli runs coding agents inside isolated cloud machines. You connect a repository, describe the environment once, and every task you delegate boots its own Linux VM with your code, dependencies and services already in place. The agent works, verifies itself, and hands back a branch, a diff, a command log and — if it used a browser — a recording. You start runs from the dashboard, Slack, Linear, GitHub, GitLab, the CLI or the API.",
  },
  {
    question: "Which coding agents can I run?",
    answer:
      "Claude Code, Codex, DeepSeek Harness, opencode and Gemini CLI. They all run on the same environment primitives, so you can send one task to four harnesses and compare the diffs, or standardise on one and switch later without rebuilding anything. Bring your own model keys if you would rather bill inference directly to your provider.",
  },
  {
    question: "What does an agent's environment look like?",
    answer:
      "A Linux VM you define in a dupli.yml committed next to your code: base image, services, warm hooks, environment variables, mounted skills and MCP servers. Warm hooks run before the agent is assigned, so dependencies are installed and postgres is already listening. Median boot is under four seconds, and the machine is destroyed when the run ends.",
  },
  {
    question: "Why does isolation matter so much?",
    answer:
      "Because it is what lets an agent be useful and safe at the same time. An agent with its own disposable machine can install a package, restart a database, drop a schema or run the whole browser suite — and the worst case is one throwaway VM. On a shared laptop, every one of those actions is a risk to your working tree, and two agents cannot run at once without fighting over it.",
  },
  {
    question: "Is the output always a pull request?",
    answer:
      "No. A run can end in a pull request, a commit on a branch, a reply in the Slack thread or Linear issue that started it, or just a written answer with the evidence attached. Investigations often finish as a diagnosis plus a failing test rather than a fix, which is usually what you wanted.",
  },
  {
    question: "What repositories can I use?",
    answer:
      "Any GitHub or GitLab repository you have access to, including self-managed GitLab. Connect the account, pick which repositories to enable, and Dupli uses short-lived scoped tokens per run rather than a long-lived key sitting on a machine.",
  },
  {
    question: "How does billing work?",
    answer:
      "The base plan is $20 per user per month, billed from Clerk organization members, and includes 5,000 machine-minutes for that user. Machines sleep when idle. When a user is out of minutes, runs pause until the period resets. Enterprise is quoted with volume machine-minutes, an uptime SLA and annual invoicing.",
  },
  {
    question: "Can agents actually use a browser?",
    answer:
      "Yes. Each machine can run a real desktop session, so an agent can open your app, click through the flow it just changed, and attach screenshots and a screen recording to the run. That is the difference between an agent claiming a fix works and showing you that it does.",
  },
  {
    question: "How is Dupli different from Replicas?",
    answer: (
      <>
        Replicas pioneered the category and covers the same ground: cloud VMs, multiple harnesses, Slack and
        Linear triggers. We differ on isolation defaults, environment reproducibility and how much of the
        platform is available over the API rather than only the dashboard. We wrote an honest side-by-side,
        including what they do better, in{" "}
        <Link
          href="/blog/dupli-vs-replicas"
          className="text-brand underline underline-offset-2 hover:text-brand-soft"
        >
          Dupli vs Replicas
        </Link>
        .
      </>
    ),
  },
  {
    question: "What does Enterprise include?",
    answer:
      "SOC 2 Type II reporting and security review, SAML SSO with SCIM provisioning, a dedicated account manager and shared Slack channel, private VPC peering with egress allowlists, audit log export to your SIEM, volume machine-minutes and an uptime SLA. Contact us and we will size it during the pilot.",
  },
  {
    question: "What is your refund policy?",
    answer: (
      <>
        Refund eligibility depends on your plan and usage — see our{" "}
        <Link
          href="/refund-policy"
          className="text-brand underline underline-offset-2 hover:text-brand-soft"
        >
          Refund Policy
        </Link>{" "}
        for cancellation terms.
      </>
    ),
  },
]

export default function LandingFaq() {
  return (
    <section id="faq" className="marketing-rule scroll-mt-28">
      <div className="edge-grid edge-grid-2">
        <div className="flex flex-col justify-center px-6 py-16 md:px-10 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">FAQ</p>
          <h2 className="mt-4 text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-brand-ink md:text-4xl">
            Questions engineering teams ask us first
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Isolation, environments, harnesses, billing and how teams put agent runs into production.
          </p>
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">
          {faqs.map((faq) => (
            <details key={faq.question} name="faq" className="group/faq border-b border-[var(--marketing-line)] last:border-b-0">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-base font-medium text-brand-ink transition-colors group-hover/faq:text-brand">
                  {faq.question}
                </span>
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-[var(--marketing-line)] bg-transparent text-brand">
                  <Plus className="size-3 group-open/faq:hidden" />
                  <Minus className="hidden size-3 group-open/faq:block" />
                </span>
              </summary>
              <div className="animate-[faq-open_240ms_ease-out] pb-5 pr-11 text-sm leading-relaxed text-slate-600">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
