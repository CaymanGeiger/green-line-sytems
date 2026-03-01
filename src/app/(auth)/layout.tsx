import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_52%),linear-gradient(180deg,#f8fafc,#eef2ff)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur">
        {children}
      </div>
    </div>
  );
}
