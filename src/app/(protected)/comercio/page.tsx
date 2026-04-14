import { DONACIONES_TABLE, ORGANIZATIONS_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatDonationStatus } from "@/lib/donations";
import CreateDonationForm from "./CreateDonationForm";
import CommerceProfileForm from "./CommerceProfileForm";
import { markDonationCollected } from "./actions";

export default async function ComercioPage() {
  const { user, profile } = await requireApprovedRole("comercio");
  const supabase = await createServerSupabase();

  const { data: donaciones } = await supabase
    .from(DONACIONES_TABLE)
    .select("id, title, description, kg, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: organization } = await supabase
    .from(ORGANIZATIONS_TABLE)
    .select(
      "name, contact_email, telefono, whatsapp, address, city, region, postal_code, lat, lng"
    )
    .eq("user_id", user.id)
    .single();

  return (
    <div className="grid gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Panel comercio
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          Hola {profile.name || "comercio"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Gestiona excedentes, crea donaciones y descarga informes.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <CreateDonationForm />
        <CommerceProfileForm initialValues={organization ?? undefined} />
      </div>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Donaciones recientes
          </h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {donaciones?.length ?? 0} registros
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {donaciones && donaciones.length > 0 ? (
            donaciones.map((donacion) => (
              <div
                key={donacion.id}
                className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 sm:grid-cols-[1.4fr_0.6fr_0.6fr_auto]"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {donacion.title}
                  </p>
                  {donacion.description && (
                    <p className="text-xs text-slate-500">
                      {donacion.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Publicado: {donacion.created_at?.slice(0, 10)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Cantidad</p>
                  <p className="font-semibold">{donacion.kg} kg</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Estado</p>
                  <p className="font-semibold">
                    {formatDonationStatus(donacion.status)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Accion</p>
                  {donacion.status === "pending" ? (
                    <form action={markDonationCollected}>
                      <input type="hidden" name="donacionId" value={donacion.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Marcar recogida
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-slate-500">--</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Aun no hay donaciones publicadas.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
