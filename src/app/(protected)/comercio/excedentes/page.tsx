import Link from "next/link";
import { cookies } from "next/headers";
import { DONACIONES_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatDonationStatus } from "@/lib/donations";
import { FOOD_TYPES } from "@/lib/food-types";
import { getPlanAccess } from "@/lib/plans";
import { getEffectivePlanForProfile } from "@/lib/plan-access";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";
import CreateDonationForm from "../CreateDonationForm";
import DeleteDonationControl from "../DeleteDonationControl";
import { markDonationCollected } from "../actions";

type SearchParams = {
  from?: string | string[];
  to?: string | string[];
  status?: string | string[];
  category?: string | string[];
  sort?: string | string[];
};

type DonationItem = {
  id: string;
  title: string | null;
  description: string | null;
  kg: number | null;
  status: string | null;
  created_at: string | null;
  category: string | null;
  storage: string | null;
  expires_at: string | null;
  pickup_window: string | null;
  allergens: string | null;
  notes: string | null;
};

export default async function ExcedentesPage({
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

  const getCategoryLabel = (value?: string | null) => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) {
      return t.common.noCategory;
    }
    return t.foodTypes[trimmed as keyof typeof t.foodTypes] ?? trimmed;
  };

  const storageLabels = {
    fresco: t.storage.options.fresco,
    refrigerado: t.storage.options.refrigerado,
    congelado: t.storage.options.congelado,
    seco: t.storage.options.seco,
  } as const;

  const getStorageLabel = (value?: string | null) => {
    if (!value) {
      return null;
    }
    return storageLabels[value as keyof typeof storageLabels] ?? value;
  };

  const resolvedParams = (await searchParams) ?? {};
  const getParam = (key: keyof SearchParams) => {
    const value = resolvedParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const fromValue = getParam("from") ?? "";
  const toValue = getParam("to") ?? "";
  const statusValue = getParam("status") ?? "";
  const categoryValue = getParam("category") ?? "";
  const sortValue = getParam("sort") ?? "created_desc";

  let query = supabase
    .from(DONACIONES_TABLE)
    .select(
      "id, title, description, kg, status, created_at, category, storage, expires_at, pickup_window, allergens, notes"
    )
    .eq("user_id", user.id);

  if (fromValue) {
    query = query.gte("created_at", `${fromValue}T00:00:00`);
  }
  if (toValue) {
    query = query.lte("created_at", `${toValue}T23:59:59`);
  }
  if (statusValue) {
    query = query.eq("status", statusValue);
  }
  if (categoryValue) {
    query =
      categoryValue === "Sin categoria"
        ? query.is("category", null)
        : query.eq("category", categoryValue);
  }

  const sortMap = {
    created_desc: { column: "created_at", ascending: false },
    created_asc: { column: "created_at", ascending: true },
    kg_desc: { column: "kg", ascending: false },
    kg_asc: { column: "kg", ascending: true },
    title_asc: { column: "title", ascending: true },
  } as const;
  const sortConfig =
    sortMap[sortValue as keyof typeof sortMap] ?? sortMap.created_desc;

  const { data: donaciones } = await query.order(sortConfig.column, {
    ascending: sortConfig.ascending,
  });
  const donations: DonationItem[] = donaciones ?? [];

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          {t.commerce.excedentes.panelTag}
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          {t.commerce.excedentes.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t.commerce.excedentes.subtitle}
        </p>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <form
          method="get"
          className="grid items-end gap-3 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]"
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
          <label className="grid gap-2">
            {t.common.status}
            <select
              name="status"
              defaultValue={statusValue}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            >
              <option value="">{t.common.all}</option>
              <option value="available">{t.status.available}</option>
              <option value="pending">{t.status.pending}</option>
              <option value="collected">{t.status.collected}</option>
            </select>
          </label>
          <label className="grid gap-2">
            {t.common.sort}
            <select
              name="sort"
              defaultValue={sortValue}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            >
              <option value="created_desc">{t.commerce.excedentes.sorting.recent}</option>
              <option value="created_asc">{t.commerce.excedentes.sorting.oldest}</option>
              <option value="kg_desc">{t.commerce.excedentes.sorting.mostKg}</option>
              <option value="kg_asc">{t.commerce.excedentes.sorting.leastKg}</option>
              <option value="title_asc">{t.commerce.excedentes.sorting.titleAsc}</option>
            </select>
          </label>
          <button
            type="submit"
            className="h-10 w-full rounded-full border border-slate-200 bg-slate-900 px-5 text-sm font-semibold text-white btn-glow-dark sm:justify-self-end sm:w-auto"
          >
            {t.common.applyFilters}
          </button>
          <Link
            href="/comercio/excedentes"
            className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 btn-glow-soft sm:justify-self-end sm:w-auto"
          >
            {t.common.clear}
          </Link>
        </form>
      </section>

      <CreateDonationForm />

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.commerce.excedentes.recentTitle}
          </h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 badge-animate">
            {donaciones?.length ?? 0} {t.commerce.excedentes.recordsLabel}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:gap-4">
          {donations.length > 0 ? (
            donations.map((donacion, index) => {
              const detailChips = [
                donacion.category
                  ? `${t.commerce.excedentes.details.type}: ${getCategoryLabel(donacion.category)}`
                  : null,
                donacion.storage
                  ? `${t.commerce.excedentes.details.storage}: ${getStorageLabel(donacion.storage)}`
                  : null,
                donacion.expires_at
                  ? `${t.commerce.excedentes.details.expiry}: ${donacion.expires_at}`
                  : null,
                donacion.pickup_window
                  ? `${t.commerce.excedentes.details.pickup}: ${donacion.pickup_window}`
                  : null,
                donacion.allergens
                  ? `${t.commerce.excedentes.details.allergens}: ${donacion.allergens}`
                  : null,
              ].filter(Boolean) as string[];

              return (
                <div
                  key={donacion.id}
                  className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 sm:grid-cols-[1.4fr_0.6fr_0.6fr_auto] card-animate animate-fade-up"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {donacion.title}
                    </p>
                    {donacion.description ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {donacion.description}
                      </p>
                    ) : null}
                    {detailChips.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {detailChips.map((chip) => (
                          <span
                            key={`${donacion.id}-${chip}`}
                            className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {donacion.notes ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {t.commerce.excedentes.details.notes}: {donacion.notes}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {t.commerce.excedentes.details.published}: {donacion.created_at?.slice(0, 10)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">{t.common.quantity}</p>
                    <p className="font-semibold">{donacion.kg} kg</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">{t.common.status}</p>
                    <p className="font-semibold">
                      {formatDonationStatus(donacion.status, t.status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">{t.common.action}</p>
                    {donacion.status === "available" ? (
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/comercio/excedentes/${donacion.id}/editar`}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 btn-glow-soft"
                        >
                          {t.common.edit}
                        </Link>
                        <DeleteDonationControl donationId={donacion.id} />
                      </div>
                    ) : donacion.status === "pending" ? (
                      <form action={markDonationCollected}>
                        <input
                          type="hidden"
                          name="donacionId"
                          value={donacion.id}
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white btn-glow-dark"
                        >
                          {t.commerce.excedentes.markCollected}
                        </button>
                      </form>
                    ) : donacion.status === "collected" ? (
                      planAccess.reports ? (
                        <a
                          href={`/comercio/excedentes/${donacion.id}/certificado`}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 btn-glow-soft"
                        >
                          {t.commerce.excedentes.downloadCertificate}
                        </a>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled
                            className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500"
                          >
                            {t.commerce.excedentes.certificateLocked}
                          </button>
                          <Link
                            href="/comercio/planes"
                            className="text-[11px] font-semibold text-emerald-700"
                          >
                            {t.commerce.excedentes.viewPlans}
                          </Link>
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-slate-500">--</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">
              {t.commerce.excedentes.empty}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
