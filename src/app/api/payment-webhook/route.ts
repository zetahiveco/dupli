import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { basePlanProductId, resetOrgUserMinutes } from "@/services/common/billing";
import { Buffer } from "buffer";

function verifyWebhookSignature(
  webhookId: string,
  timestamp: string,
  payload: string,
  signature: string
): boolean {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Webhook secret not configured");
  }

  const actualSecret = secret.startsWith("whsec_")
    ? secret.substring(6)
    : secret;

  const actualSignature = signature.startsWith("v1,")
    ? signature.substring(3)
    : signature;

  const secretBuffer = Buffer.from(actualSecret, "base64");

  const computedSignature = createHmac("sha256", secretBuffer)
    .update(`${webhookId}.${timestamp}.${payload}`)
    .digest("base64");

  return computedSignature === actualSignature;
}

function nextMonth(from = new Date()) {
  return new Date(new Date(from).setMonth(from.getMonth() + 1));
}

function subscriptionQuantity(data: any): number {
  const direct = Number(data.quantity ?? data.units ?? data.product_cart?.[0]?.quantity);
  if (Number.isFinite(direct) && direct > 0) return Math.floor(direct);
  return 1;
}

async function handleSubscriptionEvent(data: any) {
  const customerId = data.customer.customer_id;
  const productId = data.product_id;
  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  const minutesResetAt = nextMonth();
  const maxUsers = subscriptionQuantity(data);

  const validProductIds = [basePlanProductId()].filter(Boolean);

  if (!validProductIds.includes(productId)) {
    throw new Error("Invalid product ID");
  }

  const billing = await prisma.billing.findFirstOrThrow({
    where: { thirdPartyId: customerId },
  });

  if (billing.subscriptionId && billing.subscriptionId !== data.subscription_id) {
    return;
  }

  await prisma.billing.update({
    where: {
      organizationId: billing.organizationId,
    },
    data: {
      subscriptionId: data.subscription_id,
      plan: "BASE",
      maxUsers,
      expiresAt,
      minutesResetAt,
      isActive: true,
    },
  });

  await resetOrgUserMinutes(billing.organizationId, minutesResetAt);
}

export async function POST(request: NextRequest) {
  try {
    const webhookId = request.headers.get("webhook-id");
    const webhookTimestamp = request.headers.get("webhook-timestamp");
    const webhookSignature = request.headers.get("webhook-signature");

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      return new NextResponse("Missing webhook headers", { status: 400 });
    }

    const payload = await request.text();

    logger.log("Webhook received");
    logger.log("webhookId", webhookId);
    logger.log("webhookTimestamp", webhookTimestamp);
    logger.log("webhookSignature", webhookSignature);
    logger.log("payload", payload);

    const isValid = verifyWebhookSignature(
      webhookId,
      webhookTimestamp,
      payload,
      webhookSignature
    );

    logger.log("isValid", isValid);

    if (!isValid) {
      return new NextResponse("Invalid webhook signature", { status: 401 });
    }

    const parsedPayload = JSON.parse(payload);

    if (
      parsedPayload.type === "subscription.active" ||
      parsedPayload.type === "subscription.renewed" ||
      parsedPayload.type === "subscription.plan_changed"
    ) {
      await handleSubscriptionEvent(parsedPayload.data);
    }

    if (parsedPayload.type === "subscription.on_hold" || parsedPayload.type === "subscription.failed") {
      const billing = await prisma.billing.findFirstOrThrow({
        where: { thirdPartyId: parsedPayload.data.customer.customer_id },
      });

      if (billing.subscriptionId && billing.subscriptionId !== parsedPayload.data.subscription_id) {
        return new NextResponse("OK", { status: 200 });
      }

      await prisma.billing.update({
        where: { organizationId: billing.organizationId },
        data: {
          isActive: false,
        },
      });
    }

    if (parsedPayload.type === "subscription.cancelled" || parsedPayload.type === "subscription.expired") {
      const billing = await prisma.billing.findFirstOrThrow({
        where: { thirdPartyId: parsedPayload.data.customer.customer_id },
      });

      if (billing.subscriptionId && billing.subscriptionId !== parsedPayload.data.subscription_id) {
        return new NextResponse("OK", { status: 200 });
      }

      const minutesResetAt = nextMonth();
      await prisma.billing.update({
        where: { organizationId: billing.organizationId },
        data: {
          plan: "NO_PLAN",
          maxUsers: 1,
          expiresAt: minutesResetAt,
          minutesResetAt,
          subscriptionId: null,
          isActive: true,
        },
      });
      await resetOrgUserMinutes(billing.organizationId, minutesResetAt);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
