"use client";

import type { CSSProperties } from "react";

type LoadingSpinnerProps = {
  size?: number;
  thickness?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
};

type LoadingInlineProps = {
  label?: string;
  className?: string;
  spinnerClassName?: string;
  size?: number;
};

// Adapted from MUI CircularProgress animation model (MIT).
export function LoadingSpinner({
  size = 20,
  thickness = 3.6,
  color = "currentColor",
  className,
  ariaLabel = "Loading",
}: LoadingSpinnerProps) {
  const rootStyle: CSSProperties = {
    width: size,
    height: size,
    color,
    animation: "dcc-circular-rotate 1.4s linear infinite",
  };

  const circleStyle: CSSProperties = {
    strokeDasharray: "80px, 200px",
    strokeDashoffset: 0,
    animation: "dcc-circular-dash 1.4s ease-in-out infinite",
  };

  return (
    <>
      <style jsx global>{`
        @keyframes dcc-circular-rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes dcc-circular-dash {
          0% {
            stroke-dasharray: 1px, 200px;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 100px, 200px;
            stroke-dashoffset: -15px;
          }
          100% {
            stroke-dasharray: 100px, 200px;
            stroke-dashoffset: -125px;
          }
        }
      `}</style>
      <span
        role="progressbar"
        aria-label={ariaLabel}
        className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`.trim()}
      >
        <svg
          viewBox="22 22 44 44"
          focusable="false"
          aria-hidden="true"
          style={rootStyle}
        >
          <circle
            cx="44"
            cy="44"
            r={(44 - thickness) / 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            strokeLinecap="round"
            style={circleStyle}
          />
        </svg>
      </span>
    </>
  );
}

export function LoadingInline({ label = "Loading...", className, spinnerClassName, size = 18 }: LoadingInlineProps) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-slate-500 ${className ?? ""}`.trim()}>
      <LoadingSpinner size={size} className={spinnerClassName} />
      <span>{label}</span>
    </span>
  );
}
