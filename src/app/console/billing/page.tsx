"use client"

import { BillingContext } from "@/app/console/billing"
import Plans from "@/components/shared/plans"
import { useContext } from "react"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { MdOpenInNew } from "react-icons/md"
import { toast } from "sonner"
import { getCustomerPortalSession } from "./actions"
import { PiClipboard } from "react-icons/pi"
import { MinuteBreakdownInfo } from "@/components/shared/minute-breakdown-info"
import { isPaidPlan } from "@/lib/billing-constants"

export default function BillingPage() {
    const { billing } = useContext(BillingContext)

    if (!billing) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p>Billing not found</p>
            </div>
        )
    }

    const minutesPerUser = billing.minutesPerUser ?? 0
    const minutesUsed = billing.userMinutesUsed ?? 0
    const usedTotal = Math.min(minutesUsed, minutesPerUser)
    const remaining = Math.max(0, minutesPerUser - usedTotal)
    const seatsRemaining = billing.seatsRemaining ?? 0
    const clerkUserCount = billing.clerkUserCount ?? 0
    const maxUsers = billing.maxUsers ?? 0
    const paid = isPaidPlan(billing.plan, billing.isActive)

    const handleViewCustomerPortal = async () => {
        try {
            const customerPortalSession = await getCustomerPortalSession()
            window.open(customerPortalSession.url, "_blank")
        } catch {
            toast.error("Failed to view customer portal")
        }
    }

    return (
        <div>
            <div className="h-[60px] border-b border-white/10 px-5 flex flex-col justify-center">
                <h1 className="font-semibold">Billing</h1>
                <p className="text-sm text-muted-foreground">Manage seats and machine-minutes for this organization</p>
            </div>
            <div className="space-y-8 p-5 h-[calc(100vh-60px)] overflow-y-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Usage Overview</CardTitle>
                        <CardDescription>Seats follow Clerk members. Minutes are tracked per user.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Users left</p>
                                <p className="mt-1 text-2xl font-semibold">{seatsRemaining}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {clerkUserCount} of {maxUsers} seats used
                                </p>
                            </div>
                            <div className="border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Minutes per user</p>
                                <p className="mt-1 text-2xl font-semibold">{minutesPerUser.toLocaleString()}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {remaining.toLocaleString()} remaining for you this period
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium inline-flex items-center gap-1">
                                        Your machine-minutes
                                        <MinuteBreakdownInfo />
                                    </span>
                                    <span className="text-muted-foreground">
                                        {minutesUsed.toLocaleString()} / {minutesPerUser.toLocaleString()}
                                    </span>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted cursor-help">
                                            {minutesPerUser > 0 ? (
                                                <div
                                                    className="h-full bg-brand"
                                                    style={{
                                                        width: `${(usedTotal / minutesPerUser) * 100}%`,
                                                    }}
                                                />
                                            ) : null}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={6} className="rounded-md">
                                        <div className="flex flex-col gap-1">
                                            <div>
                                                Minutes used: <span className="font-medium">{usedTotal.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                Minutes remaining: <span className="font-medium">{remaining.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 text-sm text-muted-foreground border-t pt-4">
                            <span>Plan Name: {billing.plan}</span>
                            <span>Plan {billing.expiresAt ? `expires on ${format(billing.expiresAt, "MMMM dd, yyyy")}` : "Never Expires"}</span>
                            {billing.userMinutesResetAt && (
                                <span>
                                    Your minutes reset on {format(billing.userMinutesResetAt, "MMMM dd, yyyy")}
                                </span>
                            )}
                            <div className="flex items-center gap-2">
                                <span>Customer ID: {billing.thirdPartyId || "N/A"}</span>
                                {billing.thirdPartyId && (
                                    <button onClick={() => { navigator.clipboard.writeText(billing.thirdPartyId || ""); toast.success("Customer ID copied to clipboard") }}>
                                        <PiClipboard />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Subscription ID: {billing.subscriptionId || "N/A"}</span>
                                {billing.subscriptionId && (
                                    <button onClick={() => { navigator.clipboard.writeText(billing.subscriptionId || ""); toast.success("Subscription ID copied to clipboard") }}>
                                        <PiClipboard />
                                    </button>
                                )}
                            </div>
                            <span>Is Active: {billing.isActive ? "Yes" : "No"}</span>
                        </div>

                        {billing.plan !== "NO_PLAN" && billing.plan !== "CUSTOM" && (
                            <Button onClick={() => handleViewCustomerPortal()}>
                                <MdOpenInNew />
                                View Customer Portal
                            </Button>
                        )}
                    </CardContent>
                </Card>
                {!paid && <Plans />}
            </div>
        </div>
    )
}
