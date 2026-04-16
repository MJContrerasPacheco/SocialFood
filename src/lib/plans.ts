export const PLAN_TIERS = ["free", "pro", "business"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export type PlanAccess = {
  reports: boolean;
  stats: boolean;
};

const PLAN_ACCESS: Record<PlanTier, PlanAccess> = {
  free: { reports: false, stats: false },
  pro: { reports: true, stats: false },
  business: { reports: true, stats: true },
};

export const isPlanTier = (value: string): value is PlanTier =>
  PLAN_TIERS.includes(value as PlanTier);

export const getPlanAccess = (plan: PlanTier) => PLAN_ACCESS[plan];

export const isActiveSubscription = (status?: string | null) =>
  status === "active" || status === "trialing";

export const getEffectivePlan = (
  plan: PlanTier | null | undefined,
  status?: string | null
): PlanTier => {
  if (!plan) {
    return "free";
  }
  if (plan === "free") {
    return "free";
  }
  return isActiveSubscription(status) ? plan : "free";
};

export const getPlanLabel = (plan: PlanTier) => {
  switch (plan) {
    case "pro":
      return "SocialFood Pro";
    case "business":
      return "SocialFood Business";
    default:
      return "SocialFood Free";
  }
};

export const getPlanPriceLabel = (plan: PlanTier) => {
  switch (plan) {
    case "pro":
      return "10 EUR/mes";
    case "business":
      return "30 EUR/mes";
    default:
      return "0 EUR/mes";
  }
};
