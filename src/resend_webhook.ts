import { prisma } from "@/lib/db"
import { sendWebhook } from "@/services/webhooks/webhook"

export async function resendWebhook() {

    const organizationSettings = await prisma.organizationSettings.findFirstOrThrow({
        where: {
            organizationId: "org_3Af7hX2GjSitIJLb6QJUs4dnQEK"
        }
    })

    const webhookLogs = await prisma.webhookLogItem.findMany({
        where: {
            organizationId: "org_3Af7hX2GjSitIJLb6QJUs4dnQEK"
        }
    })

    let count = 0

    for (const webhookLog of webhookLogs) {
        if(organizationSettings.webhookUrl) {
            console.log(`${count+1}/${webhookLogs.length} Resending webhook for organization ${webhookLog.organizationId} with URL ${organizationSettings.webhookUrl}`)
            await sendWebhook(webhookLog.organizationId, organizationSettings.webhookUrl, webhookLog.request)
        } else {
            console.log(`Webhook URL not found for organization ${webhookLog.organizationId}`)
        }

        count++
    }

}


resendWebhook().catch(console.error)