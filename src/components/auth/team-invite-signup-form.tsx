"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export function TeamInviteSignUpForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<FormError>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passwordIssues = [...getPasswordPolicyMessages(password)];
    if (password !== confirmPassword) {
      passwordIssues.push("Passwords do not match.");
    }

    if (passwordIssues.length > 0) {
      setError((current) => (sameErrorValue(current, passwordIssues) ? current : passwordIssues));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/team-invite/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          name,
          password,
          confirmPassword,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const nextError = Array.isArray(body.passwordIssues)
          ? (body.passwordIssues as string[])
          : (body.error ?? "Unable to accept invite");

        setError((current) => (sameErrorValue(current, nextError) ? current : nextError));
        return;
      }

      setError((current) => (current ? null : current));
      router.push("/");
      router.refresh();
    } catch {
      const nextError = "Unable to accept invite";
      setError((current) => (sameErrorValue(current, nextError) ? current : nextError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          readOnly
          className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
        />
      </div>
      <div>
        <label htmlFor="invite-name" className="mb-1 block text-sm font-medium text-slate-700">
          Full name
        </label>
        <input
          id="invite-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="invite-password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <PasswordInput
          id="invite-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="invite-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <PasswordInput
          id="invite-confirm-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>

      <div className="min-h-[12px]" aria-live="polite">
        {Array.isArray(error) ? (
          <ul className="list-disc space-y-1 pl-4 text-xs font-semibold text-rose-600">
            {error.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : error ? (
          <p className="text-xs font-semibold text-rose-600">{error}</p>
        ) : null}
      </div>

      <Button type="submit" block disabled={loading}>
        {loading ? "Creating account..." : "Accept invite"}
      </Button>
      <div className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="text-blue-700 hover:text-blue-800" href="/signin">
          Sign in
        </Link>
      </div>
    </form>
  );
}
