import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell-bg relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="auth-card w-full max-w-md rounded-2xl border p-6 shadow-xl backdrop-blur">
        {children}
      </div>
    </div>
  );
}
