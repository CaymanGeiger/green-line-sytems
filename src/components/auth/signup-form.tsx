"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

type FormError = string | string[] | null;
type AccountType = "OWNER" | "EMPLOYEE";

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

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("OWNER");
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
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, accountType, password, confirmPassword }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const nextError = Array.isArray(body.passwordIssues)
          ? (body.passwordIssues as string[])
          : (body.error ?? "Unable to create account");

        setError((current) => (sameErrorValue(current, nextError) ? current : nextError));
        return;
      }

      setError((current) => (current ? null : current));
      router.push("/?welcome=1");
      router.refresh();
    } catch {
      const nextError = "Unable to create account";
      setError((current) => (sameErrorValue(current, nextError) ? current : nextError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Full name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        />
      </div>
      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-slate-700">I am joining as</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
              accountType === "OWNER"
                ? "border-green-600 bg-green-50 text-green-900"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            <input
              type="radio"
              name="account-type"
              value="OWNER"
              className="sr-only"
              checked={accountType === "OWNER"}
              onChange={() => setAccountType("OWNER")}
            />
            <span className="block font-semibold">Company owner</span>
            <span className="mt-1 block text-xs text-slate-500">I am setting up our workspace.</span>
          </label>
          <label
            className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
              accountType === "EMPLOYEE"
                ? "border-green-600 bg-green-50 text-green-900"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            <input
              type="radio"
              name="account-type"
              value="EMPLOYEE"
              className="sr-only"
              checked={accountType === "EMPLOYEE"}
              onChange={() => setAccountType("EMPLOYEE")}
            />
            <span className="block font-semibold">Employee</span>
            <span className="mt-1 block text-xs text-slate-500">I need an invite from my company owner.</span>
          </label>
        </div>
      </fieldset>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <PasswordInput id="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <PasswordInput
          id="confirm-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      <div className="min-h-[20px]" aria-live="polite">
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
      <Button type="submit" block loading={loading} loadingText="Creating Account...">
        Create Account
      </Button>
      <div className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="text-green-700 hover:text-green-800" href="/signin">
          Sign in
        </Link>
      </div>
    </form>
  );
}
