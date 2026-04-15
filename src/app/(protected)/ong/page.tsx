import Link from "next/link";
import { DONATION_CERTIFICATES_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

type SearchParams = {
  from?: string | string[];
  to?: string | string[];
};

type CertificateSnapshot = {
  donation?: {
    title?: string | null;
    kg?: number | null;
  };
  commerce?: {
    name?: string | null;
  };
};

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);

export default async function OngResumenPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const { user, profile } = await requireApprovedRole("ong");
  const supabase = await createServerSupabase();

  const resolvedParams = (await searchParams) ?? {};
  const getParam = (key: keyof SearchParams) => {
    const value = resolvedParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const fromValue = getParam("from") ?? "";
  const toValue = getParam("to") ?? "";

  let query = supabase
    .from(DONATION_CERTIFICATES_TABLE)
    .select("operation_id, collected_at, created_at, snapshot")
    .eq("ong_user_id", user.id);

  if (fromValue) {
    query = query.gte("collected_at", `${fromValue}T00:00:00`);
  }
  if (toValue) {
    query = query.lte("collected_at", `${toValue}T23:59:59`);
  }

  const { data: certificates } = await query.order("collected_at", {
    ascending: false,
  });

  const items = certificates ?? [];
  const commerceNames = new Set<string>();
  let totalKg = 0;

  items.forEach((item) => {
    const snapshot = item.snapshot as CertificateSnapshot | null;
    const kgValue = Number(snapshot?.donation?.kg ?? 0) || 0;
    totalKg += kgValue;
    if (snapshot?.commerce?.name) {
      commerceNames.add(snapshot.commerce.name);
    }
  });

  const latestCollected = items[0]?.collected_at ?? items[0]?.created_at ?? "--";
  const recentItems = items.slice(0, 4);

  const chartEnd = toValue
    ? parseDateInput(toValue)
    : latestCollected !== "--"
      ? parseDateInput(String(latestCollected).slice(0, 10))
      : null;
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
    const dateKey = (item.collected_at ?? item.created_at ?? "").slice(0, 10);
    if (!dailyMap.has(dateKey)) {
      return;
    }
    const snapshot = item.snapshot as CertificateSnapshot | null;
    const kgValue = Number(snapshot?.donation?.kg ?? 0) || 0;
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + kgValue);
  });

  const dailySeries = resolvedChartDates.map((date) => ({
    date,
    kg: dailyMap.get(date) ?? 0,
  }));
  const maxDailyKg = Math.max(1, ...dailySeries.map((item) => item.kg));

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Panel ONG
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          Hola {profile.name || "ONG"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Consulta el impacto de las recogidas realizadas.
        </p>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-1 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Estadisticas de recogidas
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 badge-animate">
            Ultima recogida: {latestCollected?.slice(0, 10) ?? "--"}
          </span>
        </div>
        <form
          className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,1fr))_auto_auto]"
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
          <button
            type="submit"
            className="h-10 w-full rounded-full border border-slate-200 bg-slate-900 px-4 text-xs font-semibold text-white btn-glow-dark flex items-center justify-center leading-none sm:justify-self-end sm:w-auto"
          >
            Aplicar filtros
          </button>
          <Link
            href="/ong"
            className="h-10 w-full rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 btn-glow-soft flex items-center justify-center leading-none sm:justify-self-end sm:w-auto"
          >
            Limpiar
          </Link>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">Recogidas</p>
            <p className="text-2xl font-semibold text-slate-900">
              {items.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">Kg recuperados</p>
            <p className="text-2xl font-semibold text-slate-900">
              {totalKg.toFixed(1)} kg
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">Comercios activos</p>
            <p className="text-2xl font-semibold text-slate-900">
              {commerceNames.size}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">Raciones estimadas</p>
            <p className="text-2xl font-semibold text-slate-900">
              {Math.max(0, Math.round(totalKg * 2))}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Kg diarios (14 dias)
            </p>
            <span className="text-xs text-slate-500">
              Total: {totalKg.toFixed(1)} kg
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(12px,1fr))] gap-2">
            {dailySeries.map((item) => (
              <div key={item.date} className="flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-full bg-emerald-100"
                  style={{ height: 72 }}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      height: `${Math.max(6, (item.kg / maxDailyKg) * 100)}%`,
                      marginTop: `${Math.max(0, 100 - (item.kg / maxDailyKg) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  {item.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Recogidas recientes
          </h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 badge-animate">
            {items.length} registros
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {recentItems.length > 0 ? (
            recentItems.map((item) => {
              const snapshot = item.snapshot as CertificateSnapshot | null;
              return (
                <div
                  key={item.operation_id}
                  className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 sm:grid-cols-[1.3fr_0.7fr]"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {snapshot?.donation?.title || "Excedente"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Comercio: {snapshot?.commerce?.name || "No informado"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Recogida: {item.collected_at?.slice(0, 10) || "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Kg</p>
                    <p className="font-semibold">
                      {Number(snapshot?.donation?.kg ?? 0).toFixed(1)} kg
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">
              Aun no tienes recogidas registradas.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
