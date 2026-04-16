"use client";

import { createContext, useContext } from "react";
import type { Locale, TranslationSet } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  t: TranslationSet;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  locale: Locale;
  translations: TranslationSet;
  children: React.ReactNode;
};

export function I18nProvider({
  locale,
  translations,
  children,
}: I18nProviderProps) {
  return (
    <I18nContext.Provider value={{ locale, t: translations }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return value;
}
