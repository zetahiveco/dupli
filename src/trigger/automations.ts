import { schedules } from "@trigger.dev/sdk/v3"
import { listDueCronAutomations } from "@/services/automations"
import { runAutomation } from "@/services/automation-run"

export const tickAutomations = schedules.task({
    id: "tick-automations",
    cron: "* * * * *",
    run: async () => {
        const due = await listDueCronAutomations()
        const results = []
        for (const automation of due) {
            try {
                results.push(await runAutomation({
                    organizationId: automation.organizationId,
                    automationId: automation.id,
                }))
            } catch (error) {
                results.push({
                    automationId: automation.id,
                    error: error instanceof Error ? error.message : "Failed",
                })
            }
        }
        return { ran: results.length, results }
    },
})
