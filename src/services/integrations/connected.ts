import type { AutomationTrigger } from "../../../generated/prisma/enums"
import { connectedNangoIds } from "./nango"
import {
    integrationTriggers,
    NANGO_PROVIDERS,
    triggerIntegrationName,
    triggerNeedsIntegration,
} from "./providers"

export { triggerIntegrationName, triggerNeedsIntegration }

export async function isTriggerConnected(organizationId: string, trigger: AutomationTrigger) {
    if (!triggerNeedsIntegration(trigger)) return true

    const provider = NANGO_PROVIDERS.find((item) => "trigger" in item && item.trigger === trigger)
    if (!provider) return true

    const ids = await connectedNangoIds(organizationId)
    return ids.includes(provider.id)
}

export async function assertTriggerConnected(organizationId: string, trigger: AutomationTrigger) {
    if (await isTriggerConnected(organizationId, trigger)) return
    const name = triggerIntegrationName(trigger)
    throw new Error(`Connect ${name} in Integrations before using this trigger.`)
}

export async function connectedTriggerMap(organizationId: string) {
    const entries = await Promise.all(
        integrationTriggers().map(async (trigger) => [trigger, await isTriggerConnected(organizationId, trigger)] as const),
    )
    return Object.fromEntries(entries) as Record<AutomationTrigger, boolean>
}
