import React from "react";

export type BillingMember = {
    userId: string
    name: string
    email: string
    imageUrl: string
    role: string
}

type Billing = {
    thirdPartyId: string | null;
    plan: string;
    subscriptionId: string | null;
    isActive: boolean;
    maxUsers: number;
    clerkUserCount: number;
    seatsRemaining: number;
    seatsOver: number;
    minutesPerUser: number;
    userMinutesUsed: number;
    userMinutesRemaining: number;
    userMinutesResetAt: Date | null;
    expiresAt: Date | null;
    minutesResetAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    members: BillingMember[];
    isAdmin: boolean;
    currentUserId: string;
}

export type BillingContextValue = {
    billing: Billing | null
    refresh: () => Promise<void>
}

export const BillingContext = React.createContext<BillingContextValue>({
    billing: null,
    refresh: async () => {},
})
