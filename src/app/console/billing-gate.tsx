"use client"

import { useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BillingContext } from "@/app/console/billing"
import Plans from "@/components/shared/plans"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { checkoutPlan, removeOrgMember } from "./billing/actions"
import { isPaidPlan } from "@/lib/billing-constants"
import { PiSpinner } from "react-icons/pi"

function BlockingDialog({
    open,
    title,
    description,
    children,
}: {
    open: boolean
    title: string
    description: string
    children: ReactNode
}) {
    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
                onOpenAutoFocus={(event) => event.preventDefault()}
                onPointerDownOutside={(event) => event.preventDefault()}
                onInteractOutside={(event) => event.preventDefault()}
                onEscapeKeyDown={(event) => event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    )
}

export default function BillingGate() {
    const { billing, refresh } = useContext(BillingContext)
    const pathname = usePathname()
    const router = useRouter()
    const [buying, setBuying] = useState(false)
    const [removingId, setRemovingId] = useState<string | null>(null)

    const seatsOver = Boolean(billing) && (billing?.clerkUserCount ?? 0) > (billing?.maxUsers ?? 0)
    const minutesOver = Boolean(billing) && (billing?.userMinutesRemaining ?? 0) <= 0
    const onBilling = pathname.startsWith("/console/billing")
    const paid = Boolean(billing && isPaidPlan(billing.plan, billing.isActive))

    useEffect(() => {
        if (!seatsOver && !minutesOver) return
        const timer = window.setInterval(() => {
            void refresh()
        }, 15000)
        return () => window.clearInterval(timer)
    }, [seatsOver, minutesOver, refresh])

    const purchaseSeats = async () => {
        try {
            setBuying(true)
            const checkoutSession = await checkoutPlan("BASE")
            window.open(checkoutSession.url, "_blank")
        } catch {
            toast.error("Failed to start checkout")
        } finally {
            setBuying(false)
        }
    }

    const removeMember = async (userId: string) => {
        try {
            setRemovingId(userId)
            await removeOrgMember(userId)
            toast.success("Member removed")
            await refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to remove member")
        } finally {
            setRemovingId(null)
        }
    }

    if (seatsOver && billing) {
        const extra = billing.seatsOver
        return (
            <BlockingDialog
                open
                title="This organization needs more seats"
                description={`Clerk has ${billing.clerkUserCount} members and the plan covers ${billing.maxUsers}. Purchase seats for every member or remove extra users. This dialog stays open until the seat count matches.`}
            >
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                        <p>
                            {extra} extra {extra === 1 ? "user" : "users"} · ${20 * billing.clerkUserCount}/mo for {billing.clerkUserCount} seats
                        </p>
                        <Button
                            className="bg-brand text-white hover:bg-brand/90"
                            disabled={buying || !billing.isAdmin}
                            onClick={() => void purchaseSeats()}
                        >
                            {buying ? <PiSpinner className="animate-spin" /> : `Purchase ${billing.clerkUserCount} seats`}
                        </Button>
                    </div>
                    {!billing.isAdmin && (
                        <p className="text-sm text-muted-foreground">
                            Ask an organization admin to purchase seats or remove a member.
                        </p>
                    )}
                    <div className="space-y-2">
                        {billing.members.map((member) => (
                            <div
                                key={member.userId}
                                className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{member.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">{member.email || member.role}</p>
                                </div>
                                {billing.isAdmin && member.userId !== billing.currentUserId ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={removingId === member.userId}
                                        onClick={() => void removeMember(member.userId)}
                                    >
                                        {removingId === member.userId ? <PiSpinner className="animate-spin" /> : "Remove"}
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        {member.userId === billing.currentUserId ? "You" : member.role}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <Plans disableStarter={paid} />
                </div>
            </BlockingDialog>
        )
    }

    if (minutesOver && billing && !onBilling) {
        return (
            <BlockingDialog
                open
                title="You're out of minutes"
                description={
                    paid
                        ? "Your 5,000 machine-minutes for this period are used up. Talk to us for more volume, or wait until minutes reset."
                        : "The base plan includes 5,000 machine-minutes per user each month. Purchase a plan to keep running cloud machines."
                }
            >
                <div className="space-y-4">
                    <Button variant="outline" onClick={() => router.push("/console/billing")}>
                        View billing
                    </Button>
                    <Plans disableStarter={paid} />
                </div>
            </BlockingDialog>
        )
    }

    return null
}
