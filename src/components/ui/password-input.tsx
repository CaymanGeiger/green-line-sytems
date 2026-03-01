"use client";

import { InputHTMLAttributes, useState } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
};

export function PasswordInput({ inputClassName, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={showPassword ? "text" : "password"}
        className={(
          "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none " +
          (inputClassName ?? "")
        ).trim()}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-700"
      >
        {showPassword ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5.14 0 9.28 3.11 10.94 8-1 2.95-3.06 5.3-5.7 6.68M6.61 6.61C4.05 8 2.07 10.24 1.06 13c.67 1.98 1.78 3.72 3.2 5.08"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path
              d="M1.06 12C2.72 7.11 6.86 4 12 4s9.28 3.11 10.94 8C21.28 16.89 17.14 20 12 20S2.72 16.89 1.06 12Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
