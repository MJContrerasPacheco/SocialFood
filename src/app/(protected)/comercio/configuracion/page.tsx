import { ORGANIZATIONS_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import CommerceProfileForm from "../CommerceProfileForm";

export default async function ConfiguracionPage() {
  const { user, profile } = await requireApprovedRole("comercio");
  const supabase = await createServerSupabase();

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
          Configuracion
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          Ajustes de cuenta
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Actualiza la informacion del comercio y la ubicacion del local.
        </p>
      </section>

      <CommerceProfileForm initialValues={organization ?? undefined} />

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-700 sm:p-5">
        <p>
          Hola {profile.name || "comercio"}, recuerda mantener los datos de
          contacto actualizados para que las ONG puedan comunicarse contigo.
        </p>
      </section>
    </div>
  );
}
