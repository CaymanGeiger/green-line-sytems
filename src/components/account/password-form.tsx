"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

type FormError = string | string[] | null;

const PASSWORD_RULES = [
  "Must be at least 8 characters.",
  "Must include at least one uppercase letter.",
  "Must include at least one special character (! ? @ # $).",
] as const;

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

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<FormError>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passwordIssues = [...getPasswordPolicyMessages(newPassword)];
    if (newPassword !== confirmPassword) {
      passwordIssues.push("Passwords do not match.");
    }

    if (passwordIssues.length > 0) {
      setError((current) => (sameErrorValue(current, passwordIssues) ? current : passwordIssues));
      setSuccess((current) => (current ? null : current));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const nextError = Array.isArray(body.passwordIssues)
          ? (body.passwordIssues as string[])
          : (body.error ?? "Unable to update password");

        setError((current) => (sameErrorValue(current, nextError) ? current : nextError));
        setSuccess((current) => (current ? null : current));
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError((current) => (current ? null : current));
      setSuccess((current) => (current === "Password updated." ? current : "Password updated."));
    } catch {
      const nextError = "Unable to update password";
      setError((current) => (sameErrorValue(current, nextError) ? current : nextError));
      setSuccess((current) => (current ? null : current));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Current password
        <PasswordInput
          id="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          inputClassName="mt-1"
        />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        New password
        <PasswordInput
          id="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          inputClassName="mt-1"
        />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Confirm password
        <PasswordInput
          id="confirm-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          inputClassName="mt-1"
        />
      </label>
      <div className="min-h-[20px]" aria-live="polite">
        {Array.isArray(error) ? (
          <ul className="list-disc space-y-1 pl-4 text-xs font-semibold text-rose-600">
            {error.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : error ? (
          <p className="text-xs font-semibold text-rose-600">{error}</p>
        ) : success ? (
          <p className="text-xs font-semibold text-green-600">{success}</p>
        ) : null}
      </div>
      <Button type="submit" loading={loading} loadingText="Saving..." className="h-10 px-4 text-sm">
        Update password
      </Button>
    </form>
  );
}
