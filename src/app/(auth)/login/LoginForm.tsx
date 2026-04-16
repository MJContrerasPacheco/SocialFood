"use client";

import { useActionState, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = {};

type LoginFormProps = {
  selectedPlan: "free" | "pro" | "business";
};

export default function LoginForm({ selectedPlan }: LoginFormProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [oauthRole, setOauthRole] = useState<"comercio" | "ong">("comercio");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthPending, setOauthPending] = useState(false);
  const [loginState, loginAction, loginPending] = useActionState(
    signIn,
    initialState
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signUp,
    initialState
  );

  const isLogin = mode === "login";

  const planQuery =
    oauthRole === "comercio" ? `&plan=${selectedPlan}` : "";

  const handleGoogleLogin = async () => {
    setOauthError(null);
    setOauthPending(true);

    try {
      const supabase = createBrowserSupabase();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?role=${oauthRole}${planQuery}`,
        },
      });

      if (error) {
        setOauthError("No se pudo iniciar con Google");
        setOauthPending(false);
      }
    } catch (err) {
      console.error(err);
      setOauthError("No se pudo iniciar con Google");
      setOauthPending(false);
    }
  };

  return (
    <div className="w-full max-w-lg rounded-3xl border border-white/40 bg-white/80 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur animate-fade-up-delay-2 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          SocialFood
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">
          {isLogin ? "Acceso seguro" : "Solicitar acceso"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isLogin
            ? "Inicia sesion para gestionar donaciones."
            : "Confirma tu email para activar el acceso."}
        </p>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Acceso con Google
          </p>
          <select
            value={oauthRole}
            onChange={(event) =>
              setOauthRole(event.target.value as "comercio" | "ong")
            }
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
          >
            <option value="comercio">Comercio</option>
            <option value="ong">ONG</option>
          </select>
        </div>
        {oauthError && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 notice-animate">
            {oauthError}
          </p>
        )}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={oauthPending}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 btn-glow-soft"
        >
          {oauthPending ? "Conectando..." : "Continuar con Google"}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            isLogin
              ? "bg-white text-slate-900 shadow"
              : "text-slate-500"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            isLogin
              ? "text-slate-500"
              : "bg-white text-slate-900 shadow"
          }`}
        >
          Registro
        </button>
      </div>

      {isLogin ? (
        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="plan" value={selectedPlan} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          {loginState?.error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 notice-animate">
              {loginState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={loginPending}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 btn-glow"
          >
            {loginPending ? "Accediendo..." : "Entrar"}
          </button>
        </form>
      ) : (
        <form action={signupAction} className="space-y-4">
          <input type="hidden" name="plan" value={selectedPlan} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="nombre">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="role">
              Rol
            </label>
            <select
              id="role"
              name="role"
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              defaultValue=""
            >
              <option value="" disabled>
                Selecciona un rol
              </option>
              <option value="comercio">Comercio</option>
              <option value="ong">ONG</option>
            </select>
          </div>
          {signupState?.error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 notice-animate">
              {signupState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={signupPending}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 btn-glow-dark"
          >
            {signupPending ? "Enviando..." : "Solicitar acceso"}
          </button>
        </form>
      )}
    </div>
  );
}
