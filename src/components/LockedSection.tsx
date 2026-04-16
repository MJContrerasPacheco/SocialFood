import Link from "next/link";

type LockedSectionProps = {
  locked: boolean;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
};

export default function LockedSection({
  locked,
  title,
  description,
  actionLabel = "Mejorar plan",
  actionHref = "/comercio/planes",
  children,
}: LockedSectionProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="mx-4 grid gap-3 rounded-2xl border border-emerald-200 bg-white/90 p-4 text-center text-sm text-slate-700 shadow-[0_20px_40px_rgba(15,23,42,0.15)]">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-600">{description}</p>
          <Link
            href={actionHref}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white btn-glow-dark"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
