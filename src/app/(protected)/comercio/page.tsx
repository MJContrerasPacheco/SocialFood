import Link from "next/link";
import { DONACIONES_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatDonationStatus } from "@/lib/donations";
import { FOOD_TYPES } from "@/lib/food-types";

type DonationSummary = {
  id: string;
  title: string | null;
  kg: number | null;
  status: string | null;
  created_at: string | null;
  category: string | null;
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

    const categoryLabel = item.category?.trim() || "Sin categoria";
    if (categoryLabel) {
      const key = categoryLabel.toLowerCase();
      const current =
        typeMap.get(key) ?? { label: categoryLabel, count: 0, kg: 0 };
      typeMap.set(key, {
        label: current.label,
        count: current.count + 1,
        kg: current.kg + kgValue,
      });
    }
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
    chartDates.length > 0
      ? chartDates
      : [formatDateInput(fallbackEnd)];
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

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Panel comercio
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          Hola {profile.name || "comercio"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Consulta tus metricas y el impacto total de excedentes publicados.
        </p>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-1 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Metricas generales
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 badge-animate">
            Ultima publicacion: {latestDonationDate}
          </span>
        </div>
        <form
          className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto]"
          method="get"
        >
          <label className="grid gap-2">
            Desde
            <input
              type="date"
              name="from"
              defaultValue={fromValue}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="grid gap-2">
            Hasta
            <input
              type="date"
              name="to"
              defaultValue={toValue}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="grid gap-2">
            Categoria
            <select
              name="category"
              defaultValue={categoryValue}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Todas</option>
              {FOOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="Sin categoria">Sin categoria</option>
            </select>
          </label>
          <button
            type="submit"
            className="w-full rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white btn-glow-dark sm:justify-self-end sm:w-auto"
          >
            Aplicar filtros
          </button>
          <Link
            href="/comercio"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs font-semibold text-slate-700 btn-glow-soft sm:justify-self-end sm:w-auto"
          >
            Limpiar
          </Link>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">Total donaciones</p>
            <p className="text-2xl font-semibold text-slate-900">
              {totals.count}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">Kg publicados</p>
            <p className="text-2xl font-semibold text-slate-900">
              {totals.kg.toFixed(1)}
            </p>
            <p className="text-xs text-slate-500">kg totales</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
            <p className="text-xs uppercase text-emerald-700">Disponibles</p>
            <p className="text-2xl font-semibold text-emerald-900">
              {totals.available.count}
            </p>
            <p className="text-xs text-emerald-700">
              {totals.available.kg.toFixed(1)} kg
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
            <p className="text-xs uppercase text-amber-700">Pendientes</p>
            <p className="text-2xl font-semibold text-amber-900">
              {totals.pending.count}
            </p>
            <p className="text-xs text-amber-700">
              {totals.pending.kg.toFixed(1)} kg
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs uppercase text-slate-600">Recogidas</p>
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
              Tipos de comida
            </h2>
            <span className="text-xs text-slate-500">Top categorias</span>
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
                      {item.count} publicaciones
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    {item.kg.toFixed(1)} kg
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Aun no hay tipos de comida registrados.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Kg por dia
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
                Estados de donaciones
              </h2>
              <span className="text-xs text-slate-500">Distribucion</span>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              {[
                {
                  label: "Disponibles",
                  value: totals.available.count,
                  kg: totals.available.kg,
                  color: "bg-emerald-500",
                  tone: "text-emerald-700",
                },
                {
                  label: "Pendientes",
                  value: totals.pending.count,
                  kg: totals.pending.kg,
                  color: "bg-amber-500",
                  tone: "text-amber-700",
                },
                {
                  label: "Recogidas",
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
            Actividad reciente
          </h2>
          <span className="text-xs text-slate-500">Ultimas 3</span>
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
                  <span>{formatDonationStatus(donacion.status)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Sin actividad reciente.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
