"use client";

import { useActionState } from "react";
import { createUser, type AdminState } from "./actions";
import { useI18n } from "@/components/I18nProvider";

const initialState: AdminState = {};

export default function CreateUserForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(createUser, initialState);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-1 sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t.admin.createUser.title}
        </h2>
        <p className="text-sm text-slate-600">
          {t.admin.createUser.subtitle}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="nombre">
            {t.admin.createUser.nameLabel}
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
            {t.admin.createUser.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="password"
          >
            {t.admin.createUser.passwordLabel}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="role">
            {t.admin.createUser.roleLabel}
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="" disabled>
              {t.admin.createUser.rolePlaceholder}
            </option>
            <option value="comercio">{t.admin.roleLabels.commerce}</option>
            <option value="ong">{t.admin.roleLabels.ong}</option>
            <option value="admin">{t.admin.roleLabels.admin}</option>
          </select>
        </div>
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
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 btn-glow-dark"
      >
        {pending ? t.admin.createUser.pending : t.admin.createUser.submit}
      </button>
    </form>
  );
}
