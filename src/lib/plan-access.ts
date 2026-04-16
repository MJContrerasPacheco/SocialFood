import "server-only";

import { getEffectivePlan, isPlanTier, type PlanTier } from "@/lib/plans";

type PlanProfile = {
  id?: string | null;
  email?: string | null;
  plan_tier?: PlanTier | null;
  stripe_subscription_status?: string | null;
};

const parseAllowlist = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const allowlistEmails = parseAllowlist(process.env.PLAN_ALLOWLIST_EMAILS);
const allowlistUserIds = parseAllowlist(process.env.PLAN_ALLOWLIST_USER_IDS);

export const isPlanAllowlisted = (profile?: PlanProfile | null) => {
  if (!profile) {
    return false;
  }
  const email = profile.email?.toLowerCase() ?? null;
  if (email && allowlistEmails.includes(email)) {
    return true;
  }
  if (profile.id && allowlistUserIds.includes(profile.id.toLowerCase())) {
    return true;
  }
  return false;
};

export const getEffectivePlanForProfile = (profile?: PlanProfile | null) => {
  if (isPlanAllowlisted(profile)) {
    const rawPlan = profile?.plan_tier ?? null;
    return isPlanTier(rawPlan ?? "") ? (rawPlan as PlanTier) : "free";
  }
  return getEffectivePlan(
    profile?.plan_tier ?? null,
    profile?.stripe_subscription_status ?? null
  );
};
