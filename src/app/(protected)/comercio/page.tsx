import Link from "next/link";
import { cookies } from "next/headers";
import { DONACIONES_TABLE, DONATION_CERTIFICATES_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatDonationStatus } from "@/lib/donations";
import { FOOD_TYPES } from "@/lib/food-types";
import LockedSection from "@/components/LockedSection";
import { getPlanAccess } from "@/lib/plans";
import { getEffectivePlanForProfile } from "@/lib/plan-access";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";

type DonationSummary = {
  id: string;
  title: string | null;
  kg: number | null;
  status: string | null;
  created_at: string | null;
  category: string | null;
};

type CertificateSnapshot = {
  donation?: {
    kg?: number | null;
  };
  commerce?: {
    name?: string | null;
  };
  ong?: {
    name?: string | null;
  };
};

type RankingItem = {
  id: string;
  name: string;
  kg: number;
  count: number;
};

type SearchParams = {
  from?: string | string[];
  to?: string | string[];
  category?: string | string[];
};

export default async function ComercioPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const { user, profile } = await requireApprovedRole("comercio");
  const supabase = await createServerSupabase();
  const cookieStore = await cookies();
  const t = getTranslations(getLocaleFromCookies(cookieStore));
  const effectivePlan = getEffectivePlanForProfile(profile);
  const planAccess = getPlanAccess(effectivePlan);

  const resolvedParams = (await searchParams) ?? {};
  const getParam = (key: keyof SearchParams) => {
    const value = resolvedParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const fromValue = getParam("from") ?? "";
  const toValue = getParam("to") ?? "";
  const categoryValue = getParam("category") ?? "";

  const parseDateInput = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
  };
  const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);

  let query = supabase
    .from(DONACIONES_TABLE)
    .select("id, title, kg, status, created_at, category")
    .eq("user_id", user.id);

  if (fromValue) {
    query = query.gte("created_at", `${fromValue}T00:00:00`);
  }
  if (toValue) {
    query = query.lte("created_at", `${toValue}T23:59:59`);
  }
  if (categoryValue) {
    query =
      categoryValue === "Sin categoria"
        ? query.is("category", null)
        : query.eq("category", categoryValue);
  }

  const { data: donaciones } = await query.order("created_at", {
    ascending: false,
  });

  const items: DonationSummary[] = donaciones ?? [];
  const totals = {
    count: items.length,
    kg: 0,
    available: { count: 0, kg: 0 },
    pending: { count: 0, kg: 0 },
    collected: { count: 0, kg: 0 },
  };
  const typeMap = new Map<string, { label: string; count: number; kg: number }>();

  const getCategoryLabel = (value?: string | null) => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) {
      return t.common.noCategory;
    }
    return t.foodTypes[trimmed as keyof typeof t.foodTypes] ?? trimmed;
  };

  items.forEach((item) => {
    const kgValue = Number(item.kg ?? 0) || 0;
    totals.kg += kgValue;

    if (item.status === "available") {
      totals.available.count += 1;
      totals.available.kg += kgValue;
    } else if (item.status === "pending") {
      totals.pending.count += 1;
      totals.pending.kg += kgValue;
    } else if (item.status === "collected") {
      totals.collected.count += 1;
      totals.collected.kg += kgValue;
    }

    const categoryValue = item.category?.trim() ?? "";
    const key = categoryValue ? categoryValue.toLowerCase() : "no-category";
    const label = getCategoryLabel(categoryValue);
    const current = typeMap.get(key) ?? { label, count: 0, kg: 0 };
    typeMap.set(key, {
      label: current.label,
      count: current.count + 1,
      kg: current.kg + kgValue,
    });
  });

  const topTypes = Array.from(typeMap.values())
    .sort((a, b) => b.count - a.count || b.kg - a.kg)
    .slice(0, 4);
  const latestDonationDate = items[0]?.created_at?.slice(0, 10) ?? "--";
  const recentItems = items.slice(0, 3);

  const chartEnd = toValue
    ? parseDateInput(toValue)
    : parseDateInput(latestDonationDate);
  const fallbackEnd = chartEnd ?? new Date();
  const chartStart = fromValue
    ? parseDateInput(fromValue)
    : new Date(Date.UTC(
        fallbackEnd.getUTCFullYear(),
        fallbackEnd.getUTCMonth(),
        fallbackEnd.getUTCDate() - 13
      ));

  const buildRange = (start: Date, end: Date) => {
    const dates: string[] = [];
    const cursor = new Date(start.getTime());
    while (cursor <= end) {
      dates.push(formatDateInput(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  };

  const chartDates = buildRange(chartStart ?? new Date(), fallbackEnd);
  const resolvedChartDates =
    chartDates.length > 0 ? chartDates : [formatDateInput(fallbackEnd)];
  const dailyMap = new Map(resolvedChartDates.map((date) => [date, 0]));
  items.forEach((item) => {
    if (!item.created_at) {
      return;
    }
    const dateKey = item.created_at.slice(0, 10);
    if (!dailyMap.has(dateKey)) {
      return;
    }
    const current = dailyMap.get(dateKey) ?? 0;
    dailyMap.set(dateKey, current + (Number(item.kg ?? 0) || 0));
  });
  const dailySeries = resolvedChartDates.map((date) => ({
    date,
    kg: dailyMap.get(date) ?? 0,
  }));
  const maxDailyKg = Math.max(1, ...dailySeries.map((item) => item.kg));
  const statusTotal =
    totals.available.count + totals.pending.count + totals.collected.count;

  const now = new Date();
  const rankingYear = now.getUTCFullYear();
  const rankingStart = new Date(Date.UTC(rankingYear, 0, 1)).toISOString();
  const rankingEnd = new Date(Date.UTC(rankingYear + 1, 0, 1)).toISOString();
  let topCommerces: RankingItem[] = [];
  let topOngs: RankingItem[] = [];

  if (planAccess.stats && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminSupabase = createAdminSupabase();
    const { data: certificates } = await adminSupabase
      .from(DONATION_CERTIFICATES_TABLE)
      .select("commerce_user_id, ong_user_id, collected_at, snapshot")
      .gte("collected_at", rankingStart)
      .lt("collected_at", rankingEnd);

    const commerceTotals = new Map<string, RankingItem>();
    const ongTotals = new Map<string, RankingItem>();

    (certificates ?? []).forEach((item) => {
      const snapshot = item.snapshot as CertificateSnapshot | null;
      const kgValue = Number(snapshot?.donation?.kg ?? 0) || 0;

      if (item.commerce_user_id) {
        const existing = commerceTotals.get(item.commerce_user_id) ?? {
          id: item.commerce_user_id,
          name: snapshot?.commerce?.name ?? t.commerce.dashboard.unnamedCommerce,
          kg: 0,
          count: 0,
        };
        commerceTotals.set(item.commerce_user_id, {
          ...existing,
          kg: existing.kg + kgValue,
          count: existing.count + 1,
        });
      }

      if (item.ong_user_id) {
        const existing = ongTotals.get(item.ong_user_id) ?? {
          id: item.ong_user_id,
          name: snapshot?.ong?.name ?? t.commerce.dashboard.unnamedOng,
          kg: 0,
          count: 0,
        };
        ongTotals.set(item.ong_user_id, {
          ...existing,
          kg: existing.kg + kgValue,
          count: existing.count + 1,
        });
      }
    });

    const sortRanking = (items: Map<string, RankingItem>) =>
      Array.from(items.values())
        .sort((a, b) => b.kg - a.kg || b.count - a.count)
        .slice(0, 5);

    topCommerces = sortRanking(commerceTotals);
    topOngs = sortRanking(ongTotals);
  }

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          {t.commerce.dashboard.panelTag}
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          {t.common.greeting} {profile.name || t.common.fallbackCommerce}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t.commerce.dashboard.subtitle}
        </p>
      </section>

      <LockedSection
        locked={!planAccess.stats}
        title={t.commerce.dashboard.statsLockedTitle}
        description={t.commerce.dashboard.statsLockedDescription}
        actionLabel={t.lockedSection.upgradePlan}
      >
        <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-1 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t.commerce.dashboard.metricsTitle}
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 badge-animate">
              {t.commerce.dashboard.latestPublicationLabel}: {latestDonationDate}
            </span>
          </div>
          <form
            className="mt-4 grid items-end gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto]"
            method="get"
          >
            <label className="grid gap-2">
              {t.common.from}
              <input
                type="date"
                name="from"
                defaultValue={fromValue}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2">
              {t.common.to}
              <input
                type="date"
                name="to"
                defaultValue={toValue}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2">
              {t.common.category}
              <select
                name="category"
                defaultValue={categoryValue}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              >
                <option value="">{t.common.allFeminine}</option>
                {FOOD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t.foodTypes[type] ?? type}
                  </option>
                ))}
                <option value="Sin categoria">{t.common.noCategory}</option>
              </select>
            </label>
            <button
              type="submit"
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-900 px-5 text-sm font-semibold text-white btn-glow-dark sm:justify-self-end sm:w-auto"
            >
              {t.common.applyFilters}
            </button>
            <Link
              href="/comercio"
              className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 btn-glow-soft sm:justify-self-end sm:w-auto"
            >
              {t.common.clear}
            </Link>
          </form>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">
                {t.commerce.dashboard.totals.totalDonations}
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {totals.count}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">
                {t.commerce.dashboard.totals.kgPublished}
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {totals.kg.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500">
                {t.commerce.dashboard.totals.kgTotal}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
              <p className="text-xs uppercase text-emerald-700">
                {t.commerce.dashboard.totals.available}
              </p>
              <p className="text-2xl font-semibold text-emerald-900">
                {totals.available.count}
              </p>
              <p className="text-xs text-emerald-700">
                {totals.available.kg.toFixed(1)} kg
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
              <p className="text-xs uppercase text-amber-700">
                {t.commerce.dashboard.totals.pending}
              </p>
              <p className="text-2xl font-semibold text-amber-900">
                {totals.pending.count}
              </p>
              <p className="text-xs text-amber-700">
                {totals.pending.kg.toFixed(1)} kg
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs uppercase text-slate-600">
                {t.commerce.dashboard.totals.collected}
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {totals.collected.count}
              </p>
              <p className="text-xs text-slate-500">
                {totals.collected.kg.toFixed(1)} kg
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {t.commerce.dashboard.foodTypesTitle}
              </h2>
              <span className="text-xs text-slate-500">
                {t.commerce.dashboard.topCategories}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {topTypes.length > 0 ? (
                topTypes.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.count} {t.commerce.dashboard.postsLabel}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {item.kg.toFixed(1)} kg
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  {t.commerce.dashboard.foodTypesEmpty}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6">
            <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {t.commerce.dashboard.kgPerDay}
                </h2>
                <span className="text-xs text-slate-500">
                  {resolvedChartDates[0]} -
                  {resolvedChartDates[resolvedChartDates.length - 1]}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex min-h-[140px] items-end gap-1 sm:min-h-[160px] sm:gap-2">
                  {dailySeries.map((item, index) => {
                    const height = (item.kg / maxDailyKg) * 100;
                    return (
                      <div
                        key={item.date}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:gap-2"
                      >
                        <div className="flex h-24 w-full items-end sm:h-32">
                          <div
                            className="w-full rounded-full bg-emerald-200"
                            style={{ height: `${height}%` }}
                            title={`${item.kg.toFixed(1)} kg`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 sm:block">
                          {index % 4 === 0 ? item.date.slice(5) : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {t.commerce.dashboard.donationStatuses}
                </h2>
                <span className="text-xs text-slate-500">
                  {t.commerce.dashboard.distribution}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                {[
                  {
                    label: t.commerce.dashboard.totals.available,
                    value: totals.available.count,
                    kg: totals.available.kg,
                    color: "bg-emerald-500",
                    tone: "text-emerald-700",
                  },
                  {
                    label: t.commerce.dashboard.totals.pending,
                    value: totals.pending.count,
                    kg: totals.pending.kg,
                    color: "bg-amber-500",
                    tone: "text-amber-700",
                  },
                  {
                    label: t.commerce.dashboard.totals.collected,
                    value: totals.collected.count,
                    kg: totals.collected.kg,
                    color: "bg-slate-500",
                    tone: "text-slate-700",
                  },
                ].map((item) => {
                  const width = statusTotal
                    ? Math.round((item.value / statusTotal) * 100)
                    : 0;
                  return (
                    <div key={item.label} className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold uppercase ${item.tone}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.value} · {item.kg.toFixed(1)} kg
                        </p>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-3 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t.commerce.dashboard.recentTitle}
            </h2>
            <span className="text-xs text-slate-500">
              {t.commerce.dashboard.recentLabel}
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {recentItems.length > 0 ? (
              recentItems.map((donacion) => (
                <div
                  key={donacion.id}
                  className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {donacion.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{donacion.created_at?.slice(0, 10)}</span>
                    <span>·</span>
                    <span>{donacion.kg ?? 0} kg</span>
                    <span>·</span>
                    <span>{formatDonationStatus(donacion.status, t.status)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                {t.commerce.dashboard.recentEmpty}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-3 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t.commerce.dashboard.rankingTitle} {rankingYear}
            </h2>
            <span className="text-xs text-slate-500">
              {t.commerce.dashboard.rankingTagline}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {t.commerce.dashboard.rankingDescription}
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t.commerce.dashboard.rankingCommerceTitle}
              </p>
              <div className="mt-3 grid gap-2">
                {topCommerces.length > 0 ? (
                  topCommerces.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-700"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {index + 1}. {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.count} {t.commerce.dashboard.rankingDonationsLabel}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {item.kg.toFixed(1)} kg
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    {t.commerce.dashboard.rankingEmpty}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t.commerce.dashboard.rankingOngTitle}
              </p>
              <div className="mt-3 grid gap-2">
                {topOngs.length > 0 ? (
                  topOngs.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-700"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {index + 1}. {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.count} {t.commerce.dashboard.rankingCollectionsLabel}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {item.kg.toFixed(1)} kg
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    {t.commerce.dashboard.rankingEmpty}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </LockedSection>
    </div>
  );
}
