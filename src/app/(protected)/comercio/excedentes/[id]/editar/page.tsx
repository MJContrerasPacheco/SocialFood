import Link from "next/link";
import { cookies } from "next/headers";
import { DONACIONES_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";
import EditDonationForm from "../../../EditDonationForm";

export default async function EditDonationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireApprovedRole("comercio");
  const supabase = await createServerSupabase();
  const cookieStore = await cookies();
  const t = getTranslations(getLocaleFromCookies(cookieStore));

  const { data: donation } = await supabase
    .from(DONACIONES_TABLE)
    .select(
      "id, title, description, kg, status, category, storage, expires_at, pickup_window, allergens, notes"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!donation) {
    return (
      <div className="grid gap-4">
        <section className="rounded-3xl border border-rose-100 bg-white/80 p-6 text-sm text-rose-600 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          {t.commerce.edit.notFound}
        </section>
        <Link
          href="/comercio/excedentes"
          className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 btn-glow-soft"
        >
          {t.commerce.edit.backToSurplus}
        </Link>
      </div>
    );
  }

  if (donation.status !== "available") {
    return (
      <div className="grid gap-4">
        <section className="rounded-3xl border border-amber-100 bg-amber-50/70 p-6 text-sm text-amber-700 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          {t.commerce.edit.notEditable}
        </section>
        <Link
          href="/comercio/excedentes"
          className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 btn-glow-soft"
        >
          {t.commerce.edit.backToSurplus}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          {t.commerce.edit.panelTag}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          {t.commerce.edit.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t.commerce.edit.subtitle}
        </p>
      </section>

      <EditDonationForm donationId={donation.id} initialValues={donation} />

      <Link
        href="/comercio/excedentes"
        className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 btn-glow-soft"
      >
        {t.commerce.edit.backToSurplus}
      </Link>
    </div>
  );
}
