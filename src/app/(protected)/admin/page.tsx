import { DONACIONES_TABLE, USER_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatDonationStatus } from "@/lib/donations";
import CreateUserForm from "./CreateUserForm";

export default async function AdminPage() {
  await requireApprovedRole("admin");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-white/80 p-4 text-sm text-rose-600 animate-fade-up sm:p-8">
        Falta SUPABASE_SERVICE_ROLE_KEY en .env.local para el panel admin.
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

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Panel admin
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          Control general de la plataforma
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Crea usuarios y revisa la actividad de donaciones.
        </p>
      </section>

      <CreateUserForm />

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Usuarios registrados
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 badge-animate">
            {usuarios?.length ?? 0} usuarios
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {usuarios && usuarios.length > 0 ? (
            usuarios.map((usuario, index) => (
              <div
                key={usuario.id}
                className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 sm:grid-cols-[1.4fr_0.6fr] card-animate animate-fade-up"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {usuario.name || "Sin nombre"}
                  </p>
                  <p className="text-xs text-slate-500">{usuario.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Rol</p>
                  <p className="font-semibold capitalize">{usuario.role}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No hay usuarios.</p>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-3 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Donaciones recientes
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
                      {donacion.kg} kg · {formatDonationStatus(donacion.status)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {donacion.id.slice(0, 8)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sin datos.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
