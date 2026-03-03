import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, action, children, className }: CardProps) {
  return (
    <section
      className={`panel-stroke rounded-2xl border border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(148,163,184,0.1)] ${className ?? ""}`.trim()}
    >
      {(title || subtitle || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
