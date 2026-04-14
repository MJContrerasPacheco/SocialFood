import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user, profile } = await getUserContext();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const confirmedValue = resolvedSearchParams?.confirmed;
  const confirmed =
    confirmedValue === "1" ||
    (Array.isArray(confirmedValue) && confirmedValue.includes("1"));

  if (user && profile?.role) {
    redirect(`/${profile.role}`);
  }

  return (
    <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="flex flex-col justify-between rounded-[32px] bg-slate-900 p-10 text-white shadow-[0_40px_120px_rgba(15,23,42,0.4)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300">
            Plataforma SocialFood
          </p>
          <h2 className="mt-6 text-4xl font-semibold leading-tight">
            Redistribucion de excedentes con trazabilidad y control.
          </h2>
          <p className="mt-4 text-base text-slate-200">
            Conecta comercios, ONG y administracion con flujos seguros,
            notificaciones y metricas de impacto en tiempo real.
          </p>
        </div>
        <div className="mt-12 grid gap-4 text-sm text-slate-200">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Comercio</p>
            <p className="text-xs text-slate-300">
              Publica excedentes, cumple normativa y genera informes legales.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">ONG</p>
            <p className="text-xs text-slate-300">
              Accede a donaciones en tiempo real y optimiza rutas.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Administracion</p>
            <p className="text-xs text-slate-300">
              Control total, auditoria y ranking de impacto social.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className="w-full max-w-lg space-y-4">
          {confirmed && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Email confirmado. Ya puedes iniciar sesion.
            </div>
          )}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
