export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(14,116,144,0.16),_transparent_40%),linear-gradient(135deg,_#f8fafc,_#ecfeff)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
