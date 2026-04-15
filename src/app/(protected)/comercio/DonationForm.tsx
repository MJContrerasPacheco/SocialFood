"use client";

import { FOOD_TYPES } from "@/lib/food-types";
import type { DonationState } from "./actions";

type DonationFormValues = {
  title?: string | null;
  kg?: number | null;
  category?: string | null;
  storage?: string | null;
  expires_at?: string | null;
  pickup_window?: string | null;
  allergens?: string | null;
  description?: string | null;
  notes?: string | null;
};

type DonationFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  pendingLabel: string;
  action: (formData: FormData) => void;
  pending: boolean;
  state?: DonationState;
  initialValues?: DonationFormValues;
  donationId?: string;
  className?: string;
};

export default function DonationForm({
  title,
  subtitle,
  submitLabel,
  pendingLabel,
  action,
  pending,
  state,
  initialValues,
  donationId,
  className,
}: DonationFormProps) {
  return (
    <form
      action={action}
      className={
        className ??
        "grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-6"
      }
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
      {donationId ? (
        <input type="hidden" name="donacionId" value={donationId} />
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="title">
          Titulo
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initialValues?.title ?? ""}
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
          defaultValue={initialValues?.kg ?? ""}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="category"
          >
            Tipo de comida
          </label>
          <select
            id="category"
            name="category"
            defaultValue={initialValues?.category ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Selecciona un tipo</option>
            {FOOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="storage"
          >
            Conservacion
          </label>
          <select
            id="storage"
            name="storage"
            defaultValue={initialValues?.storage ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Selecciona</option>
            <option value="fresco">Fresco</option>
            <option value="refrigerado">Refrigerado</option>
            <option value="congelado">Congelado</option>
            <option value="seco">Seco</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="expires_at"
          >
            Caducidad estimada
          </label>
          <input
            id="expires_at"
            name="expires_at"
            type="date"
            defaultValue={initialValues?.expires_at ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="pickup_window"
          >
            Horario de recogida
          </label>
          <input
            id="pickup_window"
            name="pickup_window"
            placeholder="16:00 - 19:00"
            defaultValue={initialValues?.pickup_window ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="allergens"
        >
          Alergenos
        </label>
        <input
          id="allergens"
          name="allergens"
          placeholder="Gluten, lactosa..."
          defaultValue={initialValues?.allergens ?? ""}
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
          defaultValue={initialValues?.description ?? ""}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="notes">
          Notas adicionales
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Instrucciones de acceso, empaquetado, etc."
          defaultValue={initialValues?.notes ?? ""}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      {state?.error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 notice-animate">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 notice-animate">
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 btn-glow"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
