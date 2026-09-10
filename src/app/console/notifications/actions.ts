"use server"

import { requireOrg } from "@/services/auth"

export async function getNotifications() {
    await requireOrg()
    return [] as Array<{ id: string; title: string; body?: string; isRead: boolean; createdAt: Date }>
}

export async function markAsRead(_notificationId: string) {
    return { success: true }
}

export async function markAllAsRead() {
    return { success: true }
}
