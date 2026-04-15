"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/comercio", label: "Resumen" },
  { href: "/comercio/excedentes", label: "Excedentes" },
  { href: "/comercio/configuracion", label: "Configuracion" },
];

export default function CommerceNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex w-full max-w-[420px] flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/70 bg-[linear-gradient(120deg,rgba(16,185,129,0.18),rgba(14,116,144,0.12),rgba(255,255,255,0.9))] px-2 py-2 shadow-sm backdrop-blur sm:max-w-none sm:gap-2 sm:px-2 sm:py-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/comercio" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition btn-glow-soft sm:px-4 sm:py-2 sm:text-xs ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {item.label}
            <span
              className={`pointer-events-none absolute -bottom-1 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-emerald-400/90 shadow-[0_6px_14px_rgba(16,185,129,0.45)] transition-opacity ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
