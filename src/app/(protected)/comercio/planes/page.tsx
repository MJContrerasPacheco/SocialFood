import { requireApprovedRole } from "@/lib/auth";
import { getPlanAccess, type PlanTier } from "@/lib/plans";
import { getEffectivePlanForProfile, isPlanAllowlisted } from "@/lib/plan-access";
import { createCheckoutSession } from "./actions";
import { cookies } from "next/headers";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";

const planList: PlanTier[] = ["free", "pro", "business"];

export default async function CommercePlanPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string | string[]; canceled?: string; allowlisted?: string }>; 
}) {
  const { profile } = await requireApprovedRole("comercio");
  const cookieStore = await cookies();
  const t = getTranslations(getLocaleFromCookies(cookieStore));
  const resolved = (await searchParams) ?? {};
  const planParam = Array.isArray(resolved.plan) ? resolved.plan[0] : resolved.plan;
  const allowlistedParam = Array.isArray(resolved.allowlisted)
    ? resolved.allowlisted[0]
    : resolved.allowlisted;

  const isAllowlisted = isPlanAllowlisted(profile);
  const effectivePlan = getEffectivePlanForProfile(profile);
  const access = getPlanAccess(effectivePlan);
  const planFeatures: Record<PlanTier, readonly string[]> = {
    free: t.commerce.plans.features.free,
    pro: t.commerce.plans.features.pro,
    business: t.commerce.plans.features.business,
  };

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          {t.commerce.plans.panelTag}
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          {t.commerce.plans.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t.commerce.plans.subtitle}
        </p>
      </section>

      {resolved.canceled ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {t.commerce.plans.canceled}
        </section>
      ) : null}

      {allowlistedParam === "1" ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {t.commerce.plans.allowlistedApplied}
        </section>
      ) : null}

      {isAllowlisted ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {t.commerce.plans.allowlistedInfo}
        </section>
      ) : null}

      <section className="grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-6 lg:grid-cols-3">
        {planList.map((plan) => {
          const isActive = effectivePlan === plan;
          const isHighlighted = planParam === plan;
          const isDisabled = isActive;
          return (
            <div
              key={plan}
              className={`flex h-full flex-col justify-between rounded-2xl border bg-white p-4 ${
                isHighlighted
                  ? "border-emerald-300 shadow-[0_20px_40px_rgba(16,185,129,0.15)]"
                  : "border-slate-100"
              }`}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {t.commerce.plans.labels[plan]}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {t.commerce.plans.prices[plan]}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {planFeatures[plan].map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                  <li>
                    {t.commerce.plans.pdfReportsLabel}: {getPlanAccess(plan).reports ? t.common.yes : t.common.no}
                  </li>
                  <li>
                    {t.commerce.plans.statsLabel}: {getPlanAccess(plan).stats ? t.common.yes : t.common.no}
                  </li>
                </ul>
              </div>
              <form action={createCheckoutSession} className="mt-6">
                <input type="hidden" name="plan" value={plan} />
                <button
                  type="submit"
                  disabled={isDisabled}
                  className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isDisabled
                      ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
                      : "border border-slate-200 bg-slate-900 text-white btn-glow-dark"
                  }`}
                >
                  {isActive
                    ? t.commerce.plans.currentPlanButton
                    : isAllowlisted
                      ? t.commerce.plans.applyPlanButton
                      : t.commerce.plans.choosePlanButton}
                </button>
              </form>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-700 sm:p-5">
        <p>
          {t.commerce.plans.currentPlanLabel}:{" "}
          <span className="font-semibold">{t.commerce.plans.labels[effectivePlan]}</span>.{" "}
          {access.stats
            ? t.commerce.plans.summary.fullAccess
            : access.reports
              ? t.commerce.plans.summary.reportsOnly
              : t.commerce.plans.summary.surplusOnly}
        </p>
      </section>
    </div>
  );
}
