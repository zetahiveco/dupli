"use server"

import { prisma } from "@/lib/db"
import { getBilling, listOrgMembers } from "@/services/common/billing"
import { auth, clerkClient } from "@clerk/nextjs/server"
import DodoPayments from 'dodopayments';

async function createDodoCustomerIfNotExists(organizationId: string) {

    const billing = await prisma.billing.findFirstOrThrow({
        where: {
            organizationId: organizationId
        }
    })

    if (billing.thirdPartyId) {
        return
    }

    const dodoClient = new DodoPayments({
        bearerToken: process.env.DODO_BEARER_TOKEN,
        environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode"
    })

    const clerk = await clerkClient()

    // Get the admin user
    const members = await clerk.organizations.getOrganizationMembershipList({
        role: ["org:admin"],
        organizationId: organizationId
    })

    const organization = await clerk.organizations.getOrganization({
        organizationId: organizationId
    })

    if(!members.data[0].publicUserData) {
        throw new Error("Admin user not found")
    }

    const adminUser = await clerk.users.getUser(members.data[0].publicUserData.userId)

    // Check if the customer already exists
    const customers = await dodoClient.customers.list({
        email: adminUser.emailAddresses[0].emailAddress
    })

    let customerId = ""

    if (customers.items.length > 0) {
        customerId = customers.items[0].customer_id
    } else {

        const customer = await dodoClient.customers.create({
            email: adminUser.emailAddresses[0].emailAddress,
            name: organization.name
        })

        customerId = customer.customer_id
    }

    await prisma.billing.update({
        where: {
            organizationId: organizationId
        },
        data: {
            thirdPartyId: customerId
        }
    })
}


export async function onboardApp() {
    const { orgId, userId } = await auth()

    if (!orgId || !userId) {
        return { success: false as const }
    }

    const organizationSettings = await prisma.organizationSettings.findUnique({
        where: {
            organizationId: orgId
        }
    })

    if (!organizationSettings) {
        await prisma.organizationSettings.create({
            data: {
                organizationId: orgId
            }
        })
    }

    const userSettings = await prisma.userSettings.findUnique({
        where: {
            userId: userId
        }
    })

    if (!userSettings) {
        await prisma.userSettings.create({
            data: {
                userId: userId,
                organizationId: orgId
            }
        })
    }

    const billing = await prisma.billing.findUnique({
        where: {
            organizationId: orgId
        }
    })

    if (!billing) {
        await prisma.billing.create({
            data: {
                organizationId: orgId,
                expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1))
            }
        })
    }

    await createDodoCustomerIfNotExists(orgId)

    return {
        success: true
    }
}

export async function fetchBilling() {
    const { orgId, userId, orgRole } = await auth()

    if (!orgId || !userId) {
        throw new Error("Unauthorized")
    }

    const billing = await getBilling(orgId, userId)
    if (!billing) return null

    const members = await listOrgMembers(orgId)
    return {
        ...billing,
        members,
        isAdmin: orgRole === "org:admin",
        currentUserId: userId,
    }
}
