type BadgeProps = {
  tone:
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "critical"
    | "open"
    | "resolved";
  children: string;
};

const toneMap: Record<BadgeProps["tone"], string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  open: "bg-orange-50 text-orange-700 border-orange-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
}
