export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";

const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY_LIVE!,
  environment: "live_mode",
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY_LIVE!,
});

export async function POST(req: Request) {
  try {
    const { adminDb } = await import("../../lib/firebase-admin");

    const rawBody = await req.text();
    const headers = {
      "webhook-id":        req.headers.get("webhook-id") || "",
      "webhook-signature": req.headers.get("webhook-signature") || "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
    };

    const event = client.webhooks.unwrap(rawBody, { headers });
    const data  = event.data as any;


    const customerEmail = data.customer?.email?.toLowerCase()?.trim();

    if (!customerEmail) {
      console.error("❌ No customer email in payload");
      return NextResponse.json({ received: true });
    }

    let userQuery = await adminDb
      .collection("users")
      .where("email", "==", customerEmail)
      .limit(1)
      .get();

    if (userQuery.empty && data.customer?.customer_id) {
      userQuery = await adminDb
        .collection("users")
        .where("dodoCustomerId", "==", data.customer.customer_id)
        .limit(1)
        .get();
    }

    if (userQuery.empty) {
      console.error(`❌ No user found for email: ${customerEmail}`);
      return NextResponse.json({ received: true });
    }

    const userId = userQuery.docs[0].id;
    
    const PLAN_MAP: Record<string, string> = {
      "pdt_0NcbbD8tiMjvLAGeiI4p4": "pro_monthly",
    };

    switch (event.type) {
      case "payment.succeeded":
      case "subscription.active":
      case "subscription.renewed":
      case "subscription.plan_changed":
      case "subscription.updated": {
        const allowedStatuses = ["active", "cancelled", "succeeded"];
        const shouldBePro     = allowedStatuses.includes(data.status);
        const isCancelIntent  =
          data.cancel_at_next_billing_date === true ||
          data.cancelled_at != null ||
          data.status === "cancelled";

        const planName = PLAN_MAP[data.product_cart?.[0]?.product_id] 
          || PLAN_MAP[data.product_id] 
          || "unknown_plan";

        await adminDb.collection("users").doc(userId).set(
          {
            email:              customerEmail,
            name:               data.customer?.name             ?? null,
            dodoCustomerId:     data.customer?.customer_id      ?? null,
            subscriptionId:     data.subscription_id            ?? null,
            plan:               planName,
            subscriptionStatus: data.status                     ?? null,
            isPro:              shouldBePro,
            address: {
              street:  data.billing?.street  ?? null,
              city:    data.billing?.city    ?? null,
              state:   data.billing?.state   ?? null,
              zip:     data.billing?.zipcode ?? null,
              country: data.billing?.country ?? null,
            },
            planInterval:  data.payment_frequency_interval ?? null,
            currency:      data.currency                   ?? null,
            cancel_at_next_billing_date: isCancelIntent
              ? (data.cancel_at_next_billing_date ?? null)
              : false,
            cancelled_at: isCancelIntent
              ? (data.cancelled_at ? new Date(data.cancelled_at) : null)
              : null,
            next_billing_date: data.next_billing_date
              ? new Date(data.next_billing_date)
              : null,
            expire:      data.expires_at ? new Date(data.expires_at) : null,
            lastUpdated: new Date(),
            provider:    "dodo",
          },
          { merge: true }
        );
        break;
      }

      case "subscription.cancelled":
        await adminDb.collection("users").doc(userId).update({
          cancel_at_next_billing_date: true,
          cancelled_at: data.cancelled_at ? new Date(data.cancelled_at) : new Date(),
          lastUpdated:  new Date(),
        });
        console.log(`🚫 Subscription cancelled for ${userId}`);
        break;

      case "payment.failed":
      case "subscription.on_hold":
      case "subscription.expired":
        await adminDb.collection("users").doc(userId).update({
          subscriptionStatus: data.status ?? null,
          isPro:        false,
          lastUpdated:  new Date(),
        });
        console.log(`⚠️ isPro=false (${event.type}) for ${userId}`);
        break;

      default:
        console.log("ℹ️ Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err: any) {
    console.error("❌ Webhook error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}