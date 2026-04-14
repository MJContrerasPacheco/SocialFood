"use client";

import { useActionState } from "react";
import { createDonation, type DonationState } from "./actions";

const initialState: DonationState = {};

export default function CreateDonationForm() {
  const [state, action, pending] = useActionState(createDonation, initialState);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Nueva donacion
        </h2>
        <p className="text-sm text-slate-600">
          Publica excedentes con detalles y cantidad estimada.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="title">
          Titulo
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="description"
        >
          Descripcion
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="kg">
          Cantidad (kg)
        </label>
        <input
          id="kg"
          name="kg"
          type="number"
          min="1"
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      {state?.error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Publicando..." : "Publicar donacion"}
      </button>
    </form>
  );
}
