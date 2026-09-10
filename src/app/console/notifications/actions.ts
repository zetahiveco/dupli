"use server"

import { auth } from "@clerk/nextjs/server"

export async function getNotifications() {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) throw new Error("Unauthorized")
    return [] as Array<{ id: string; title: string; body?: string; isRead: boolean; createdAt: Date }>
}

export async function markAsRead(_notificationId: string) {
    return { success: true }
}

export async function markAllAsRead() {
    return { success: true }
}
