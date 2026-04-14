import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

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

  const navItems = [
    { href: "/comercio", label: "Comercio", role: "comercio" },
    { href: "/ong", label: "ONG", role: "ong" },
    { href: "/admin", label: "Admin", role: "admin" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_45%),radial-gradient(circle_at_right,_rgba(34,197,94,0.14),_transparent_38%),linear-gradient(180deg,_#f8fafc,_#f1f5f9)]">
      <header className="border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">
              SocialFood
            </p>
            <p className="text-sm text-slate-600">Panel de gestion</p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            {navItems
              .filter((item) => item.role === profile.role)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm"
                >
                  {item.label}
                </Link>
              ))}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Salir
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
