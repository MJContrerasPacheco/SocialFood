import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserContext } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { I18nProvider } from "@/components/I18nProvider";
import CommerceNav from "./comercio/CommerceNav";
import OngNav from "./ong/OngNav";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserContext();

  if (!user) {
    redirect("/login");
  }

  if (!profile || !profile.role) {
    redirect("/login?error=profile");
  }

  const cookieStore = await cookies();
  const locale = getLocaleFromCookies(cookieStore);
  const translations = getTranslations(locale);
  const navItems = [
    { href: "/admin", label: translations.nav.admin, role: "admin" },
  ];
  const isCommerce = profile.role === "comercio";
  const isOng = profile.role === "ong";

  return (
    <I18nProvider locale={locale} translations={translations}>
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_45%),radial-gradient(circle_at_right,_rgba(34,197,94,0.14),_transparent_38%),linear-gradient(180deg,_#f8fafc,_#f1f5f9)]">
        <header className="border-b border-white/60 bg-white/70 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:gap-6">
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">
                SocialFood
              </p>
              <p className="text-sm text-slate-600">
                {translations.header.panelTitle}
              </p>
            </div>
            {isCommerce ? (
              <div className="flex w-full justify-center lg:flex-1">
                <CommerceNav labels={translations.nav.commerce} />
              </div>
            ) : isOng ? (
              <div className="flex w-full justify-center lg:flex-1">
                <OngNav labels={translations.nav.ong} />
              </div>
            ) : (
              <div className="hidden lg:block lg:flex-1" />
            )}
            <div className="flex w-full flex-wrap items-center justify-center gap-2 text-sm sm:justify-between sm:gap-3 lg:w-auto lg:justify-end">
              {!isCommerce && !isOng ? (
                <nav className="flex w-full flex-wrap items-center gap-2 text-sm sm:w-auto sm:gap-3">
                  {navItems
                    .filter((item) => item.role === profile.role)
                    .map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="btn-animate btn-glow-soft rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm"
                      >
                        {item.label}
                      </Link>
                    ))}
                </nav>
              ) : null}
              <LanguageSwitcher
                currentLocale={locale}
                label={translations.language.label}
              />
              <form action={signOut} className="w-full sm:w-auto">
                <button
                  type="submit"
                  className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white btn-glow-dark sm:w-auto"
                >
                  {translations.header.signOut}
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          {children}
        </main>
      </div>
    </I18nProvider>
  );
}
