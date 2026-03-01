"use client";

import { useRouter } from "next/navigation";
import { ClipboardEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

const CODE_LENGTH = 6;
const PASSWORD_RULES = [
  "Must be at least 8 characters.",
  "Must include at least one uppercase letter.",
  "Must include at least one special character (! ? @ # $).",
] as const;

type Stage = "request" | "verify" | "reset";
type FormError = string | string[] | null;

function getPasswordPolicyMessages(password: string) {
  const issues: string[] = [];

  if (password.length < 8) {
    issues.push(PASSWORD_RULES[0]);
  }

  if (!/[A-Z]/.test(password)) {
    issues.push(PASSWORD_RULES[1]);
  }

  if (!/[!?@#$]/.test(password)) {
    issues.push(PASSWORD_RULES[2]);
  }

  return issues;
}

function sameErrorValue(current: FormError, next: FormError) {
  if (current === next) {
    return true;
  }

  if (!current || !next) {
    return false;
  }

  if (typeof current === "string" || typeof next === "string") {
    return false;
  }

  return current.join("|") === next.join("|");
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("request");
  const [email, setEmail] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(Array.from({ length: CODE_LENGTH }, () => ""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<FormError>(null);
  const [loading, setLoading] = useState(false);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const code = codeDigits.join("");

  async function requestResetCode() {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const nextError = body.error ?? "Unable to process request";
        setError((current) => (current === nextError ? current : nextError));
        return false;
      }

      if (body.devCode) {
        setDevCode(body.devCode);
      }

      setError((current) => (current ? null : current));
      return true;
    } catch {
      const nextError = "Unable to process request";
      setError((current) => (current === nextError ? current : nextError));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await requestResetCode();

    if (!ok) {
      return;
    }

    setCodeDigits(Array.from({ length: CODE_LENGTH }, () => ""));
    setStage("verify");
    setNotice((current) =>
      current === "Verification code sent. Enter the 6-digit code below."
        ? current
        : "Verification code sent. Enter the 6-digit code below.",
    );
    requestAnimationFrame(() => codeInputRefs.current[0]?.focus());
  }

  async function handleResendCode() {
    const ok = await requestResetCode();

    if (!ok) {
      return;
    }

    setCodeDigits(Array.from({ length: CODE_LENGTH }, () => ""));
    setNotice((current) => (current === "A new verification code was sent." ? current : "A new verification code was sent."));
    requestAnimationFrame(() => codeInputRefs.current[0]?.focus());
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const nextError = body.error ?? "Unable to verify code";
        setError((current) => (current === nextError ? current : nextError));
        return;
      }

      setError((current) => (current ? null : current));
      setNotice((current) => (current ? null : current));
      setStage("reset");
    } catch {
      const nextError = "Unable to verify code";
      setError((current) => (current === nextError ? current : nextError));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passwordIssues = [...getPasswordPolicyMessages(newPassword)];
    if (newPassword !== confirmPassword) {
      passwordIssues.push("Passwords do not match.");
    }

    if (passwordIssues.length > 0) {
      setResetError((current) => (sameErrorValue(current, passwordIssues) ? current : passwordIssues));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
          password: newPassword,
          confirmPassword,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const nextError = Array.isArray(body.passwordIssues)
          ? (body.passwordIssues as string[])
          : (body.error ?? "Unable to reset password");

        setResetError((current) => (sameErrorValue(current, nextError) ? current : nextError));
        return;
      }

      setResetError((current) => (current ? null : current));
      router.push("/signin?reset=success");
      router.refresh();
    } catch {
      const nextError = "Unable to reset password";
      setResetError((current) => (sameErrorValue(current, nextError) ? current : nextError));
    } finally {
      setLoading(false);
    }
  }

  function setCodeDigit(index: number, rawValue: string) {
    const digit = rawValue.replace(/\D/g, "").slice(-1);

    setCodeDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < CODE_LENGTH - 1) {
      codeInputRefs.current[index + 1]?.focus();
    }
  }

  function onCodeKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !codeDigits[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      codeInputRefs.current[index + 1]?.focus();
    }
  }

  function onCodePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);

    if (!pasted) {
      return;
    }

    setCodeDigits((prev) => {
      const next = [...prev];

      for (let i = 0; i < CODE_LENGTH; i += 1) {
        next[i] = pasted[i] ?? "";
      }

      return next;
    });

    const targetIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    codeInputRefs.current[targetIndex]?.focus();
  }

  return (
    <div className="space-y-4">
      {stage === "request" ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Account email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="min-h-[20px]" aria-live="polite">
            {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
          </div>
          <Button type="submit" block disabled={loading}>
            {loading ? "Sending..." : "Request reset code"}
          </Button>
        </form>
      ) : null}

      {stage === "verify" ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <p className="mb-1 block text-sm font-medium text-slate-700">Verification code</p>
            <div className="flex items-center justify-between gap-2">
              {codeDigits.map((digit, index) => (
                <input
                  key={`code-${index}`}
                  ref={(element) => {
                    codeInputRefs.current[index] = element;
                  }}
                  type="text"
                  value={digit}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  onChange={(event) => setCodeDigit(index, event.target.value)}
                  onKeyDown={(event) => onCodeKeyDown(index, event)}
                  onPaste={onCodePaste}
                  aria-label={`Digit ${index + 1}`}
                  className="h-12 w-11 rounded-lg border border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              ))}
            </div>
          </div>
          {devCode ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Dev code: <span className="font-semibold">{devCode}</span>
            </p>
          ) : null}
          <div className="min-h-[20px]" aria-live="polite">
            {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
            {!error && notice ? <p className="text-xs font-semibold text-blue-700">{notice}</p> : null}
          </div>
          <div className="space-y-2">
            <Button type="submit" block disabled={loading || code.length !== CODE_LENGTH}>
              {loading ? "Verifying..." : "Verify code"}
            </Button>
            <Button type="button" variant="secondary" block disabled={loading} onClick={handleResendCode}>
              Resend code
            </Button>
          </div>
        </form>
      ) : null}

      {stage === "reset" ? (
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">
              New password
            </label>
            <PasswordInput id="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
          <div className="min-h-[20px]" aria-live="polite">
            {Array.isArray(resetError) ? (
              <ul className="list-disc space-y-1 pl-4 text-xs font-semibold text-rose-600">
                {resetError.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : resetError ? (
              <p className="text-xs font-semibold text-rose-600">{resetError}</p>
            ) : null}
          </div>
          <Button type="submit" block disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
