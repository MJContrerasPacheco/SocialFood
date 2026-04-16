"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import { isPlanTier, type PlanTier } from "@/lib/plans";

type LoginLayoutProps = {
  confirmed: boolean;
  initialPlan?: string | null;
  authError?: string | null;
  authErrorReason?: string | null;
};

type PlanOption = {
  id: PlanTier;
  title: string;
  price: string;
  perks: string[];
};

const planOptions: PlanOption[] = [
  {
    id: "free",
    title: "Free",
    price: "0 EUR/mes",
    perks: ["Subir excedentes", "Acceso basico"],
  },
  {
    id: "pro",
    title: "Pro",
    price: "10 EUR/mes",
    perks: ["PDF certificados", "Soporte estandar"],
  },
  {
    id: "business",
    title: "Business",
    price: "30 EUR/mes",
    perks: ["Estadisticas completas", "Informes avanzados"],
  },
];

export default function LoginLayout({
  confirmed,
  initialPlan,
  authError,
  authErrorReason,
}: LoginLayoutProps) {
  const resolvedPlan = isPlanTier(initialPlan ?? "")
    ? (initialPlan as PlanTier)
    : "free";
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(resolvedPlan);

  return (
    <div className="grid w-full gap-6 sm:gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="flex flex-col justify-between rounded-[32px] bg-slate-900 p-6 text-white shadow-[0_40px_120px_rgba(15,23,42,0.4)] animate-fade-up sm:p-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300">
            Plataforma SocialFood
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight sm:mt-6 sm:text-4xl">
            Redistribucion de excedentes con trazabilidad y control.
          </h2>
          <p className="mt-4 text-base text-slate-200">
            Conecta comercios, ONG y administracion con flujos seguros,
            notificaciones y metricas de impacto en tiempo real.
          </p>

          <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Plan comercio
              </p>
              <p className="mt-1 text-xs text-slate-200">
                El plan se aplica solo a cuentas de comercio.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {planOptions.map((plan) => {
                const isActive = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`rounded-2xl border p-3 text-left text-[11px] transition sm:text-xs ${
                      isActive
                        ? "border-emerald-300 bg-emerald-400/20"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">
                      {plan.title}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-200">
                      {plan.price}
                    </p>
                    <ul className="mt-2 space-y-1 text-[11px] text-slate-200">
                      {plan.perks.map((perk) => (
                        <li key={perk}>{perk}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-300">
              Seleccionado: {planOptions.find((plan) => plan.id === selectedPlan)?.title}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 text-sm text-slate-200 sm:mt-12">
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
        <div className="w-full max-w-lg space-y-4 animate-fade-up-delay-1">
          {confirmed && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 notice-animate">
              Email confirmado. Ya puedes iniciar sesion.
            </div>
          )}
          {authError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 notice-animate">
              No se pudo completar el acceso con Google.
              {authErrorReason ? ` (${authErrorReason})` : ""}
            </div>
          )}
          <LoginForm selectedPlan={selectedPlan} />
        </div>
      </div>
    </div>
  );
}
