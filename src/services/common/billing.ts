import { prisma } from "@/lib/db"
import { clerkClient } from "@clerk/nextjs/server"
import {
    BASE_MINUTES_PER_USER,
    isPaidPlan,
} from "@/lib/billing-constants"
import { peekSandbox } from "@/services/daytona"

export {
    BASE_MINUTES_PER_USER,
    BASE_PLAN_PRICE_USD,
    MINUTE_BREAKDOWN,
    isPaidPlan,
    isInsufficientMinutesMessage,
} from "@/lib/billing-constants"

export class InsufficientMinutesError extends Error {
    status = 402
    needed: number
    remaining: number

    constructor(needed: number, remaining: number) {
        super(
            `Insufficient minutes: this request needs ${needed} minutes, ${remaining} remaining`
        )
        this.name = "InsufficientMinutesError"
        this.needed = needed
        this.remaining = remaining
    }
}

export type OrgMember = {
    userId: string
    name: string
    email: string
    imageUrl: string
    role: string
}

type MinuteCursors = Record<string, string>

function asCursors(raw: unknown): MinuteCursors {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
    const out: MinuteCursors = {}
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === "string" && value) out[key] = value
    }
    return out
}

function nextMonth(from = new Date()) {
    return new Date(new Date(from).setMonth(from.getMonth() + 1))
}

function sandboxIsStarted(state: unknown) {
    return String(state || "").toLowerCase() === "started"
}

export function includedMinutesForPlan(plan: string, isActive: boolean) {
    return isPaidPlan(plan, isActive) ? BASE_MINUTES_PER_USER : 0
}

export async function listOrgMembers(organizationId: string): Promise<OrgMember[]> {
    const clerk = await clerkClient()
    const members: OrgMember[] = []
    let offset = 0
    const limit = 100
    while (true) {
        const page = await clerk.organizations.getOrganizationMembershipList({
            organizationId,
            limit,
            offset,
        })
        for (const membership of page.data) {
            const userId = membership.publicUserData?.userId
            if (!userId) continue
            members.push({
                userId,
                name: [membership.publicUserData.firstName, membership.publicUserData.lastName]
                    .filter(Boolean)
                    .join(" ") || membership.publicUserData.identifier || "Member",
                email: membership.publicUserData.identifier || "",
                imageUrl: membership.publicUserData.imageUrl || "",
                role: membership.role,
            })
        }
        if (page.data.length < limit) break
        offset += limit
    }
    return members
}

export async function getOrgUserCount(organizationId: string) {
    const clerk = await clerkClient()
    const page = await clerk.organizations.getOrganizationMembershipList({
        organizationId,
        limit: 1,
    })
    return page.totalCount ?? (await listOrgMembers(organizationId)).length
}

export async function ensureUserSettings(userId: string, organizationId: string) {
    return prisma.userSettings.upsert({
        where: { userId },
        create: { userId, organizationId },
        update: { organizationId },
    })
}

async function resetUserMinutesIfNeeded(
    userId: string,
    organizationId: string,
    minutesResetAt: Date | null,
) {
    const settings = await ensureUserSettings(userId, organizationId)
    const periodEnd = settings.minutesResetAt || minutesResetAt
    if (periodEnd && periodEnd < new Date()) {
        return prisma.userSettings.update({
            where: { userId },
            data: {
                minutesUsed: 0,
                minutesResetAt: minutesResetAt || nextMonth(),
                minuteCursors: {},
            },
        })
    }
    if (!settings.minutesResetAt && minutesResetAt) {
        return prisma.userSettings.update({
            where: { userId },
            data: { minutesResetAt },
        })
    }
    return settings
}

export async function resetOrgUserMinutes(organizationId: string, minutesResetAt: Date) {
    await prisma.userSettings.updateMany({
        where: { organizationId },
        data: {
            minutesUsed: 0,
            minutesResetAt,
            minuteCursors: {},
        },
    })
}

export async function getUserMinutes(userId: string, organizationId: string) {
    const billing = await prisma.billing.findUnique({
        where: { organizationId },
    })
    if (!billing) throw new Error("Billing not found")

    let resetAt = billing.minutesResetAt
    if (billing.expiresAt && billing.expiresAt > new Date() && resetAt && resetAt < new Date()) {
        resetAt = nextMonth()
        await prisma.billing.update({
            where: { organizationId },
            data: { minutesResetAt: resetAt },
        })
        await resetOrgUserMinutes(organizationId, resetAt)
    }

    const settings = await resetUserMinutesIfNeeded(userId, organizationId, resetAt)
    const included = includedMinutesForPlan(billing.plan, billing.isActive)
    const used = settings.minutesUsed ?? 0
    return {
        included,
        used,
        remaining: Math.max(0, included - used),
        resetAt: settings.minutesResetAt || resetAt,
    }
}

export async function remainingMinutes(userId: string, organizationId: string) {
    return (await getUserMinutes(userId, organizationId)).remaining
}

export async function hasMinutes(userId: string, organizationId: string, needed = 1) {
    try {
        return (await remainingMinutes(userId, organizationId)) >= needed
    } catch {
        return false
    }
}

export async function consumeMinutes(
    userId: string,
    organizationId: string,
    minutes: number,
    options?: { strict?: boolean },
) {
    if (minutes <= 0) {
        const usage = await getUserMinutes(userId, organizationId)
        return { ...usage, minutesConsumed: 0 }
    }

    const usage = await getUserMinutes(userId, organizationId)
    const strict = options?.strict !== false
    if (strict && usage.remaining < minutes) {
        throw new InsufficientMinutesError(minutes, usage.remaining)
    }

    const toConsume = strict ? minutes : Math.min(minutes, usage.remaining)
    if (toConsume <= 0) {
        return { ...usage, minutesConsumed: 0 }
    }

    const updated = await prisma.userSettings.update({
        where: { userId },
        data: {
            minutesUsed: { increment: toConsume },
        },
    })

    return {
        included: usage.included,
        used: updated.minutesUsed,
        remaining: Math.max(0, usage.included - updated.minutesUsed),
        resetAt: usage.resetAt,
        minutesConsumed: toConsume,
    }
}

export async function assertHasMinutes(userId: string, organizationId: string, needed = 1) {
    const usage = await getUserMinutes(userId, organizationId)
    if (usage.remaining < needed) {
        throw new InsufficientMinutesError(needed, usage.remaining)
    }
    return usage
}

export async function markSandboxBillingStart(userId: string, organizationId: string, sandboxId: string) {
    const settings = await ensureUserSettings(userId, organizationId)
    const cursors = asCursors(settings.minuteCursors)
    if (cursors[sandboxId]) return
    cursors[sandboxId] = new Date().toISOString()
    await prisma.userSettings.update({
        where: { userId },
        data: { minuteCursors: cursors },
    })
}

export async function flushSandboxMinutes(userId: string, organizationId: string, sandboxId: string) {
    const settings = await ensureUserSettings(userId, organizationId)
    const cursors = asCursors(settings.minuteCursors)
    let started = false
    try {
        const sandbox = await peekSandbox(sandboxId)
        started = sandboxIsStarted(sandbox.state)
    } catch {
        started = false
    }

    const now = new Date()
    const cursor = cursors[sandboxId]
    if (started) {
        const from = cursor ? new Date(cursor) : now
        const elapsed = Number.isNaN(from.getTime())
            ? 0
            : Math.floor((now.getTime() - from.getTime()) / 60_000)
        if (elapsed > 0) {
            await consumeMinutes(userId, organizationId, elapsed, { strict: false })
        }
        cursors[sandboxId] = now.toISOString()
    } else if (cursor) {
        const from = new Date(cursor)
        const elapsed = Number.isNaN(from.getTime())
            ? 0
            : Math.floor((now.getTime() - from.getTime()) / 60_000)
        if (elapsed > 0) {
            await consumeMinutes(userId, organizationId, elapsed, { strict: false })
        }
        delete cursors[sandboxId]
    } else {
        return getUserMinutes(userId, organizationId)
    }

    await prisma.userSettings.update({
        where: { userId },
        data: { minuteCursors: cursors },
    })
    return getUserMinutes(userId, organizationId)
}

export async function clearSandboxCursor(userId: string, organizationId: string, sandboxId: string) {
    await flushSandboxMinutes(userId, organizationId, sandboxId)
    const settings = await ensureUserSettings(userId, organizationId)
    const cursors = asCursors(settings.minuteCursors)
    if (!cursors[sandboxId]) return
    delete cursors[sandboxId]
    await prisma.userSettings.update({
        where: { userId },
        data: { minuteCursors: cursors },
    })
}

export async function flushUserSandboxMinutes(userId: string, organizationId: string) {
    const settings = await ensureUserSettings(userId, organizationId)
    const cursors = asCursors(settings.minuteCursors)
    const sandboxIds = new Set(Object.keys(cursors))
    const workspaces = await prisma.workspace.findMany({
        where: { userId, organizationId, sandboxId: { not: null } },
        select: { sandboxId: true },
    })
    for (const row of workspaces) {
        if (row.sandboxId) sandboxIds.add(row.sandboxId)
    }
    for (const sandboxId of sandboxIds) {
        try {
            await flushSandboxMinutes(userId, organizationId, sandboxId)
        } catch {
            // sandbox may already be gone
        }
    }
    return getUserMinutes(userId, organizationId)
}

export async function getBilling(organizationId: string, userId?: string) {
    const billing = await prisma.billing.findUnique({
        where: { organizationId },
    })

    if (!billing) {
        return null
    }

    let minutesResetAt = billing.minutesResetAt
    if (billing.expiresAt && billing.expiresAt > new Date() && minutesResetAt && minutesResetAt < new Date()) {
        minutesResetAt = nextMonth()
        await prisma.billing.update({
            where: { organizationId },
            data: { minutesResetAt },
        })
        await resetOrgUserMinutes(organizationId, minutesResetAt)
    }

    const [clerkUserCount, userMinutes] = await Promise.all([
        getOrgUserCount(organizationId),
        userId ? flushUserSandboxMinutes(userId, organizationId) : Promise.resolve(null),
    ])

    const minutesPerUser = includedMinutesForPlan(billing.plan, billing.isActive)
    const seatsRemaining = Math.max(0, billing.maxUsers - clerkUserCount)

    return {
        ...billing,
        plan: billing.plan === "STARTER" ? "BASE" : billing.plan,
        minutesResetAt,
        clerkUserCount,
        seatsRemaining,
        seatsOver: Math.max(0, clerkUserCount - billing.maxUsers),
        minutesPerUser,
        userMinutesUsed: userMinutes?.used ?? 0,
        userMinutesRemaining: userMinutes?.remaining ?? minutesPerUser,
        userMinutesResetAt: userMinutes?.resetAt ?? minutesResetAt,
    }
}

export type BillingWithTotals = NonNullable<Awaited<ReturnType<typeof getBilling>>>

export function basePlanProductId() {
    return process.env.DODO_BASE_PLAN || process.env.DODO_STARTER_PLAN || ""
}
