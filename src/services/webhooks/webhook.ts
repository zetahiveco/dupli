import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import axios, { AxiosError } from "axios";

export async function logWebhook(organizationId: string, url: string, status: number, request: any, response: any, comments: string) {
    try {
        await prisma.webhookLogItem.create({
            data: {
                organizationId,
                url,
                status,
                request,
                response,
                comments
            }
        })
    } catch (err) {
        logger.error(err)
        logger.error(`Failed to log webhook for organization ${organizationId} url ${url} status ${status} response ${response} comments ${comments}`)
    }
}

export async function sendWebhook(organizationId: string, url: string, request: any) {
    try {
        const response = await axios.post(url, request)
        await logWebhook(organizationId, url, response.status, request, response.data, "Webhook sent")
        return response
    } catch (err) {
        if(err instanceof AxiosError) {
            await logWebhook(organizationId, url, err.status || 500, request, err.response ? err.response.data : "Unknown error", "Webhook failed")
        } else {
            await logWebhook(organizationId, url, 500, request, "Unknown error", "Unable to send webhook")
        }
        logger.error(err)
        logger.error(`Failed to send webhook for organization ${organizationId} url ${url} request ${request}`)
    }
}
