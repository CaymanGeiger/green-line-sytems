import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  block?: boolean;
};

const variantMap: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

export function Button({ children, variant = "primary", block = false, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantMap[variant]} ${block ? "w-full" : ""} ${className ?? ""}`.trim()}
    >
      {children}
    </button>
  );
}
