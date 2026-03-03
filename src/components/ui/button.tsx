import type { ButtonHTMLAttributes, ReactNode } from "react";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  block?: boolean;
  loading?: boolean;
  loadingText?: ReactNode;
  spinnerSize?: number;
};

const variantMap: Record<ButtonVariant, string> = {
  primary: "bg-green-700 text-white ring-1 ring-green-700 hover:bg-green-800",
  secondary: "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50",
  danger: "bg-rose-700 text-white ring-1 ring-rose-700 hover:bg-rose-800",
};

export function Button({
  children,
  variant = "primary",
  block = false,
  className,
  loading = false,
  loadingText,
  spinnerSize = 14,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantMap[variant]} ${block ? "w-full" : ""} ${className ?? ""}`.trim()}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <LoadingSpinner size={spinnerSize} ariaLabel="Loading" />
          <span>{loadingText ?? children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
