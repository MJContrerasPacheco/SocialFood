import Link from "next/link";
import { signOut } from "@/app/actions/auth";

export default function DeniedPage() {
  return (
    <div className="w-full max-w-2xl rounded-3xl border border-rose-100 bg-white/80 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-600">
        Acceso denegado
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-slate-900">
        Tu solicitud fue rechazada
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        Si necesitas mas informacion, contacta con el equipo de soporte.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700"
          >
            Salir
          </button>
        </form>
        <Link
          href="/login"
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Volver al login
        </Link>
      </div>
    </div>
  );
}
