import "server-only";

import Stripe from "stripe";
import type { PlanTier } from "@/lib/plans";

let stripe: Stripe | null = null;

export const getStripe = () => {
  if (stripe) {
    return stripe;
  }
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  stripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16",
  });
  return stripe;
};

export const getPriceIdForPlan = (plan: PlanTier) => {
  const mapping: Record<PlanTier, string | undefined> = {
    free: process.env.STRIPE_PRICE_FREE,
    pro: process.env.STRIPE_PRICE_PRO,
    business: process.env.STRIPE_PRICE_BUSINESS,
  };
  const priceId = mapping[plan];
  if (!priceId) {
    throw new Error(`Missing Stripe price id for ${plan}`);
  }
  return priceId;
};

export const getPlanFromPriceId = (priceId?: string | null): PlanTier | null => {
  if (!priceId) {
    return null;
  }
  if (priceId === process.env.STRIPE_PRICE_FREE) {
    return "free";
  }
  if (priceId === process.env.STRIPE_PRICE_PRO) {
    return "pro";
  }
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) {
    return "business";
  }
  return null;
};
