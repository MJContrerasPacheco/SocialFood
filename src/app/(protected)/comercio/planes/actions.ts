"use server";

import { redirect } from "next/navigation";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { USER_TABLE } from "@/lib/constants";
import { getStripe, getPriceIdForPlan } from "@/lib/stripe";
import { isPlanTier, type PlanTier } from "@/lib/plans";
import { isPlanAllowlisted } from "@/lib/plan-access";

export async function createCheckoutSession(formData: FormData) {
  const { user, profile } = await requireApprovedRole("comercio");
  const planValue = String(formData.get("plan") || "");

  if (!isPlanTier(planValue)) {
    return;
  }

  const plan = planValue as PlanTier;
  const stripe = getStripe();
  const supabase = await createServerSupabase();

  if (isPlanAllowlisted({
    id: profile.id,
    email: profile.email,
    plan_tier: profile.plan_tier,
    stripe_subscription_status: profile.stripe_subscription_status,
  })) {
    await supabase
      .from(USER_TABLE)
      .update({ plan_tier: plan })
      .eq("id", user.id);

    redirect(`/comercio/planes?plan=${plan}&allowlisted=1`);
  }

  let customerId = profile.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        user_id: user.id,
        role: "comercio",
      },
    });
    customerId = customer.id;
    await supabase
      .from(USER_TABLE)
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const priceId = getPriceIdForPlan(plan);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      plan_tier: plan,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan_tier: plan,
      },
    },
    success_url: `${siteUrl}/comercio?checkout=success`,
    cancel_url: `${siteUrl}/comercio/planes?canceled=1`,
  });

  if (session.url) {
    redirect(session.url);
  }
}
