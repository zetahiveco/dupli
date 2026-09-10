"use server"

import { requireOrg } from "@/services/auth"
import { getAnalytics } from "@/services/analytics"

export async function loadAnalytics() {
    const { orgId } = await requireOrg()
    return getAnalytics(orgId)
}
