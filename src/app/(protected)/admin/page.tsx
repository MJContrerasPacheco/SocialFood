import { cookies } from "next/headers";
import { DONACIONES_TABLE, DONATION_CERTIFICATES_TABLE, USER_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatDonationStatus } from "@/lib/donations";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";
import CreateUserForm from "./CreateUserForm";
import { deleteUser, updateUserRole } from "./actions";

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

export default async function AdminPage() {
  const { user } = await requireApprovedRole("admin");
  const cookieStore = await cookies();
  const t = getTranslations(getLocaleFromCookies(cookieStore));

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-white/80 p-4 text-sm text-rose-600 animate-fade-up sm:p-8">
        {t.admin.missingKey}
      </div>
    );
  }

  const adminSupabase = createAdminSupabase();
  const { data: usuarios } = await adminSupabase
    .from(USER_TABLE)
    .select("id, name, email, role")
    .order("created_at", { ascending: false });

  const { data: donaciones } = await adminSupabase
    .from(DONACIONES_TABLE)
    .select("id, title, kg, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const yearStart = new Date(Date.UTC(currentYear, 0, 1)).toISOString();
  const yearEnd = new Date(Date.UTC(currentYear + 1, 0, 1)).toISOString();

  const { data: certificates } = await adminSupabase
    .from(DONATION_CERTIFICATES_TABLE)
    .select("commerce_user_id, ong_user_id, collected_at, snapshot")
    .gte("collected_at", yearStart)
    .lt("collected_at", yearEnd);

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

  const buildRanking = (totals: Map<string, RankingItem>) =>
    Array.from(totals.values())
      .sort((a, b) => b.kg - a.kg || b.count - a.count)
      .slice(0, 5);

  const topCommerces = buildRanking(commerceTotals);
  const topOngs = buildRanking(ongTotals);

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          {t.admin.panelTag}
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          {t.admin.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t.admin.subtitle}
        </p>
      </section>

      <CreateUserForm />

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.admin.usersTitle}
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 badge-animate">
            {usuarios?.length ?? 0} {t.admin.usersCountLabel}
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {usuarios && usuarios.length > 0 ? (
            usuarios.map((usuario, index) => {
              const isSelf = usuario.id === user.id;
              return (
              <div
                key={usuario.id}
                className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 sm:grid-cols-[1.4fr_0.8fr] card-animate animate-fade-up"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {usuario.name || t.admin.noName}
                  </p>
                  <p className="text-xs text-slate-500">{usuario.email}</p>
                  {isSelf ? (
                    <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                      {t.admin.yourAccount}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <form action={updateUserRole} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={usuario.id} />
                    <select
                      name="role"
                      defaultValue={usuario.role}
                      disabled={isSelf}
                      className={`rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold ${
                        isSelf
                          ? "bg-slate-100 text-slate-400"
                          : "bg-white text-slate-700"
                      }`}
                    >
                      <option value="comercio">{t.admin.roleLabels.commerce}</option>
                      <option value="ong">{t.admin.roleLabels.ong}</option>
                      <option value="admin">{t.admin.roleLabels.admin}</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isSelf}
                      className="rounded-full border border-slate-200 bg-slate-900 px-3 py-1 text-xs font-semibold text-white btn-glow-dark"
                    >
                      {t.admin.saveRole}
                    </button>
                  </form>
                  <form action={deleteUser}>
                    <input type="hidden" name="userId" value={usuario.id} />
                    <button
                      type="submit"
                      disabled={isSelf}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        isSelf
                          ? "border-slate-200 bg-slate-100 text-slate-400"
                          : "border-rose-200 bg-rose-50 text-rose-600"
                      }`}
                    >
                      {t.admin.deleteUser}
                    </button>
                  </form>
                </div>
              </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">{t.admin.noUsers}</p>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-3 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.admin.recentTitle}
          </h2>
          <div className="mt-4 grid gap-3">
            {donaciones && donaciones.length > 0 ? (
              donaciones.map((donacion, index) => (
                <div
                  key={donacion.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 card-animate animate-fade-up"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {donacion.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {donacion.kg} kg · {formatDonationStatus(donacion.status, t.status)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {donacion.id.slice(0, 8)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">{t.admin.noData}</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-3 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t.admin.rankingTitle} {currentYear}
            </h2>
            <span className="text-xs text-slate-500">
              {t.admin.rankingTagline}
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t.admin.rankingCommerceTitle}
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
                          {item.count} {t.admin.rankingDonationsLabel}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {item.kg.toFixed(1)} kg
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    {t.admin.rankingEmpty}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t.admin.rankingOngTitle}
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
                          {item.count} {t.admin.rankingCollectionsLabel}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {item.kg.toFixed(1)} kg
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    {t.admin.rankingEmpty}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
