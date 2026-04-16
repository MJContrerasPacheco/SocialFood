import { ORGANIZATIONS_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";
import OngProfileForm from "../OngProfileForm";

export default async function OngConfiguracionPage() {
  const { user, profile } = await requireApprovedRole("ong");
  const supabase = await createServerSupabase();
  const cookieStore = await cookies();
  const t = getTranslations(getLocaleFromCookies(cookieStore));

  const { data: organization } = await supabase
    .from(ORGANIZATIONS_TABLE)
    .select(
      "name, contact_email, tax_id, registry_number, signature_data_url, telefono, whatsapp, address, city, region, postal_code, lat, lng"
    )
    .eq("user_id", user.id)
    .single();

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          {t.ong.config.panelTag}
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          {t.ong.config.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t.ong.config.subtitle}
        </p>
      </section>

      <OngProfileForm initialValues={organization ?? undefined} />

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-700 sm:p-5">
        <p>
          {t.common.greeting} {profile.name || t.common.fallbackOng},{" "}
          {t.ong.config.reminder}
        </p>
      </section>
    </div>
  );
}
