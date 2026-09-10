import { z } from "zod"


export const OrganizationFormSchema = z.object({
    webhookUrl: z.string().optional(),
    emailNotify: z.boolean().optional(),
})
