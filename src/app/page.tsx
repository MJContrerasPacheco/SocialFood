import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_55%),radial-gradient(circle_at_left,_rgba(14,116,144,0.14),_transparent_40%),linear-gradient(180deg,_#f8fafc,_#eff6ff)]">
      <div className="pointer-events-none absolute -left-10 top-20 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-12 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-600">
              SocialFood
            </p>
            <p className="text-sm text-slate-600">
              Plataforma de redistribucion alimentaria
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20"
          >
            Iniciar sesion
          </Link>
        </header>

        <main className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700 animate-fade-up">
              Impacto real
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl animate-fade-up">
              Conecta excedentes con quien mas lo necesita.
            </h1>
            <p className="text-base text-slate-600 animate-fade-up-delay-1">
              SocialFood coordina comercios, ONG y administracion con
              trazabilidad total, notificaciones y metricas ESG en tiempo real.
            </p>
            <div className="flex flex-wrap gap-3 animate-fade-up-delay-2">
              <Link
                href="/login"
                className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60"
              >
                Empezar ahora
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700"
              >
                Ver paneles
              </Link>
            </div>
          </section>

          <section className="grid gap-4">
            {[
              {
                title: "Cumplimiento legal",
                text: "Registra operaciones y genera informes para ley de desperdicio.",
              },
              {
                title: "Coordinacion inmediata",
                text: "ONG acceden a donaciones con alertas y rutas optimizadas.",
              },
              {
                title: "Impacto medible",
                text: "Metricas de kg salvados, solicitudes y beneficiarios.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </section>
        </main>

        <section className="grid gap-6 rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.15)] backdrop-blur lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
              Comercio
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Publica excedentes, gestiona historico y descarga informes ESG.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
              ONG
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Encuentra donaciones cercanas y solicita reservas al instante.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
              Administracion
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Supervisa datos globales, aprobaciones y auditorias.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
