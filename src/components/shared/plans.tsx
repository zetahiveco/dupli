"use client"

import { Button } from "../ui/button"
import { BookDemoButton } from "./book-demo-button"
import { checkoutPlan } from "@/app/console/billing/actions"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PiSpinner } from "react-icons/pi"
import { useState } from "react"
import { Check } from "lucide-react"

const personalFeatures = [
    "Unlimited runs, billed by machine-minute",
    "5,000 machine-minutes included per user",
    "All five harnesses, bring your own model keys",
    "Slack, Linear, GitHub and GitLab triggers",
    "Configurable environments with warm hooks",
    "Computer use with screenshots and recordings",
    "REST API, CLI and scheduled automations",
]

const enterpriseFeatures = [
    "SOC 2 Type II reporting and security review",
    "SAML SSO and SCIM provisioning",
    "Dedicated account manager and shared Slack",
    "Private VPC peering and egress allowlists",
    "Audit log export to your SIEM",
    "Volume machine-minutes and an uptime SLA",
]

function FeatureBullet({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center bg-brand/12 text-brand">
                <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {children}
        </li>
    )
}

type PlansProps = {
    disableStarter?: boolean
}

export default function Plans({ disableStarter = false }: PlansProps) {
    const router = useRouter()
    const { userId, orgId } = useAuth()
    const [isLoading, setIsLoading] = useState(false)

    const handleGetStarted = async (plan: string) => {
        try {
            setIsLoading(true)
            if (!userId || !orgId) {
                router.push("/auth/login")
                return
            }

            const checkoutSession = await checkoutPlan(plan)
            window.open(checkoutSession.url, "_blank")
            return
        } catch (err) {
            toast.error("Failed to start checkout")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="relative flex flex-col border border-white/10 bg-[#0E0E12]">
                <span className="absolute right-0 top-0 bg-brand px-3 py-1 text-[11px] font-semibold text-white">
                    Most popular
                </span>
                <div className="border-b border-white/10 px-8 py-8">
                    <p className="text-sm font-medium text-muted-foreground">Personal</p>
                    <p className="mt-2 text-5xl font-semibold tracking-tight text-brand-ink">
                        $20<span className="text-2xl font-medium text-muted-foreground">/mo</span>
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">Per user, billed monthly</p>
                    <p className="mt-1 text-sm text-muted-foreground">Billed monthly from day one</p>
                </div>
                <ul className="grow space-y-3 px-8 py-7">
                    {personalFeatures.map((feature) => (
                        <FeatureBullet key={feature}>{feature}</FeatureBullet>
                    ))}
                </ul>
                <div className="px-8 pb-8">
                    <Button
                        size="lg"
                        className="w-full bg-brand text-white hover:bg-brand/90"
                        disabled={isLoading || disableStarter}
                        onClick={() => handleGetStarted("BASE")}
                    >
                        {isLoading ? <PiSpinner className="animate-spin" /> : "Get started"}
                    </Button>
                    {disableStarter && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            You&apos;re already on a paid plan. Talk to us for volume minutes.
                        </p>
                    )}
                </div>
            </div>
            <div className="flex flex-col border border-white/10 bg-[#0E0E12]">
                <div className="border-b border-white/10 px-8 py-8">
                    <p className="text-sm font-medium text-muted-foreground">Enterprise</p>
                    <p className="mt-2 text-5xl font-semibold tracking-tight text-brand-ink">Contact</p>
                    <p className="mt-3 text-sm text-muted-foreground">SOC 2, SAML SSO, dedicated account manager</p>
                </div>
                <ul className="grow space-y-3 px-8 py-7">
                    {enterpriseFeatures.map((feature) => (
                        <FeatureBullet key={feature}>{feature}</FeatureBullet>
                    ))}
                </ul>
                <div className="px-8 pb-8">
                    <BookDemoButton
                        variant="outline"
                        size="lg"
                        className="w-full border-white/10 bg-transparent text-brand-ink hover:bg-white/[0.06]"
                    >
                        Contact sales
                    </BookDemoButton>
                </div>
            </div>
        </div>
    )
}
