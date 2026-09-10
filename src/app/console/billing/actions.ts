"use server"

import { auth, clerkClient } from "@clerk/nextjs/server";
import DodoPayments from "dodopayments";
import { requireOrg } from "@/services/auth";
import { basePlanProductId, getBilling, getOrgUserCount, listOrgMembers } from "@/services/common/billing";

export async function getCustomerPortalSession() {
    const client = new DodoPayments({
        bearerToken: process.env.DODO_BEARER_TOKEN,
        environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
    });

    const { userId, orgId } = await requireOrg();

    const billing = await getBilling(orgId, userId);

    if (!billing) {
        throw new Error("Billing not found");
    }

    if (!billing.thirdPartyId) {
        throw new Error("Billing not found");
    }

    const customerPortalSession = await client.customers.customerPortal.create(billing.thirdPartyId);

    return {
        url: customerPortalSession.link,
    };
}

export async function checkoutPlan(plan = "BASE") {
    const { userId, orgId } = await requireOrg();

    const billing = await getBilling(orgId, userId);

    if (!billing) {
        throw new Error("Billing not found");
    }

    if (plan !== "BASE") {
        throw new Error("Unknown plan");
    }

    const quantity = Math.max(1, await getOrgUserCount(orgId));
    const productId = basePlanProductId();
    if (!productId) {
        throw new Error("Base plan is not configured");
    }

    const client = new DodoPayments({
        bearerToken: process.env.DODO_BEARER_TOKEN,
        environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
    });

    const checkoutSessionResponse = await client.checkoutSessions.create({
        product_cart: [{ product_id: productId, quantity }],
        customer: {
            customer_id: billing.thirdPartyId || "",
        },
    });

    return {
        url: checkoutSessionResponse.checkout_url,
        quantity,
    };
}

export async function removeOrgMember(memberUserId: string) {
    const { userId, orgId } = await requireOrg();
    const { orgRole } = await auth();

    if (orgRole !== "org:admin") {
        throw new Error("Only organization admins can remove members");
    }

    if (memberUserId === userId) {
        throw new Error("You cannot remove yourself");
    }

    const members = await listOrgMembers(orgId);
    const target = members.find((member) => member.userId === memberUserId);
    if (!target) {
        throw new Error("Member not found");
    }

    const admins = members.filter((member) => member.role === "org:admin");
    if (target.role === "org:admin" && admins.length <= 1) {
        throw new Error("Cannot remove the last admin");
    }

    const clerk = await clerkClient();
    await clerk.organizations.deleteOrganizationMembership({
        organizationId: orgId,
        userId: memberUserId,
    });

    return { success: true as const };
}
