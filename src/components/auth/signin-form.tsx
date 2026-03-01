"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

export function SignInForm({ notice }: { notice?: string | null } = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demo.dev");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const nextError = body.error ?? "Unable to sign in";
        setError((current) => (current === nextError ? current : nextError));
        return;
      }

      setError((current) => (current ? null : current));
      router.push("/");
      router.refresh();
    } catch {
      const nextError = "Unable to sign in";
      setError((current) => (current === nextError ? current : nextError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <PasswordInput id="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
      ) : null}
      <div className="min-h-[12px]" aria-live="polite">
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      </div>
      <Button type="submit" block disabled={loading}>
        {loading ? "Signing In..." : "Sign In"}
      </Button>
      <div className="flex justify-between text-sm text-slate-600">
        <Link className="text-blue-700 hover:text-blue-800" href="/signup">
          Create account
        </Link>
        <Link className="text-blue-700 hover:text-blue-800" href="/forgot-password">
          Forgot password
        </Link>
      </div>
    </form>
  );
}
