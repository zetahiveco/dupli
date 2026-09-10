"use server"

import { prisma } from "@/lib/db"

export async function getSignalsCount() {
    return prisma.workspace.count({
        where: {
            updatedAt: {
                gte: new Date(Date.now() - 1000 * 60 * 60 * 24),
            },
        },
    })
}
