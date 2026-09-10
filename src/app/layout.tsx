import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import "@/app/globals.css"
import { Toaster } from "@/components/ui/sonner"
import { clerkAppearance } from "@/lib/clerk-appearance"
import CrispChat from "./crisp"
import GoogleAnalytics from "./analytics"
import SentryInit from "./sentry"

export const metadata: Metadata = {
  title: "Dupli | Cloud Coding Agents",
  description:
    "Dupli runs coding agents inside isolated cloud machines preloaded with your repo, tooling and services. Claude Code, Codex, DeepSeek Harness, opencode and Gemini CLI — delegated from Slack, Linear, GitHub or the API. $20/mo per user.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClerkProvider dynamic appearance={clerkAppearance}>
          <SentryInit>
            <Toaster />
            <CrispChat />
            <GoogleAnalytics />
            {children}
          </SentryInit>
        </ClerkProvider>
      </body>
    </html>
  )
}
