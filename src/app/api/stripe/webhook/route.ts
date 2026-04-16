import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { USER_TABLE } from "@/lib/constants";
import { getPlanFromPriceId, getStripe } from "@/lib/stripe";
import { getEffectivePlan } from "@/lib/plans";

export const runtime = "nodejs";

const toIsoDate = (value: number | null | undefined) => {
  if (!value) {
    return null;
  }
  return new Date(value * 1000).toISOString();
};

const updateSubscription = async (subscription: Stripe.Subscription) => {
  const adminSupabase = createAdminSupabase();
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const planFromPrice = getPlanFromPriceId(priceId) ?? "free";
  const status = subscription.status;
  const effectivePlan = getEffectivePlan(
    planFromPrice,
    status
  );

  await adminSupabase
    .from(USER_TABLE)
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: status,
      stripe_current_period_end: toIsoDate(subscription.current_period_end),
      stripe_price_id: priceId,
      plan_tier: effectivePlan,
    })
    .eq("stripe_customer_id", customerId);
};

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string | null;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await updateSubscription(subscription);
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      await updateSubscription(subscription);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const adminSupabase = createAdminSupabase();
      const customerId = subscription.customer as string;
      await adminSupabase
        .from(USER_TABLE)
        .update({
          stripe_subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          stripe_current_period_end: toIsoDate(subscription.current_period_end),
          plan_tier: "free",
        })
        .eq("stripe_customer_id", customerId);
    }
  } catch {
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
