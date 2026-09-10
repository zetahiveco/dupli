"use server"

import { requireOrg } from "@/services/auth"
import { getOrgVars, getUserVars, setOrgVars, setUserVars } from "@/services/env"

export async function getEnvironmentVariables() {
    const { orgId, userId } = await requireOrg()
    const [org, user] = await Promise.all([getOrgVars(orgId), getUserVars(userId)])
    return { org, user }
}

export async function saveOrgEnvironmentVariables(vars: Record<string, string>) {
    const { orgId } = await requireOrg()
    await setOrgVars(orgId, vars)
    return { success: true }
}

export async function saveUserEnvironmentVariables(vars: Record<string, string>) {
    const { userId } = await requireOrg()
    await setUserVars(userId, vars)
    return { success: true }
}
