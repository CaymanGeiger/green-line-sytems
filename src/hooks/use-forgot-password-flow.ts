"use client";

import { useRouter } from "next/navigation";
import { ClipboardEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";

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

export function useForgotPasswordFlow() {
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

  function setCodeInputRef(index: number, element: HTMLInputElement | null) {
    codeInputRefs.current[index] = element;
  }

  return {
    stage,
    email,
    setEmail,
    codeDigits,
    code,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    devCode,
    notice,
    error,
    resetError,
    loading,
    handleRequest,
    handleResendCode,
    handleVerify,
    handleReset,
    setCodeDigit,
    onCodeKeyDown,
    onCodePaste,
    setCodeInputRef,
    codeLength: CODE_LENGTH,
  };
}
