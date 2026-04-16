"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LANGUAGE_LABELS,
  LANGUAGE_SHORT_LABELS,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n";

type LanguageSwitcherProps = {
  currentLocale?: Locale;
  label: string;
};

export default function LanguageSwitcher({
  currentLocale = DEFAULT_LOCALE,
  label,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleSelect = (locale: Locale) => {
    if (locale === currentLocale) {
      return;
    }
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale;
    startTransition(() => router.refresh());
  };

  return (
    <label className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <select
        aria-label={label}
        value={currentLocale}
        onChange={(event) => handleSelect(event.target.value as Locale)}
        className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LANGUAGE_LABELS[locale]} ({LANGUAGE_SHORT_LABELS[locale]})
          </option>
        ))}
      </select>
    </label>
  );
}
