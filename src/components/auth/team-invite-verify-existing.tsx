"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TeamInviteVerifyExisting({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function verify() {
      try {
        const response = await fetch("/api/auth/team-invite/verify-existing", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!active) {
            return;
          }
          setStatus("error");
          setError(body.error ?? "Unable to verify invite.");
          return;
        }

        if (!active) {
          return;
        }

        setStatus("success");
        window.setTimeout(() => {
          router.replace("/signin?invite=accepted");
        }, 800);
      } catch {
        if (!active) {
          return;
        }
        setStatus("error");
        setError("Unable to verify invite.");
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [router, token]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Verify workspace access</h1>
      {status === "loading" ? <p className="text-sm text-slate-600">Verifying your invite and applying access…</p> : null}
      {status === "success" ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Verification complete. Redirecting to sign in…
        </p>
      ) : null}
      {status === "error" ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error ?? "Verification link is invalid or expired."}
          </p>
          <Link href="/signin?invite=invalid" className="text-sm font-semibold text-green-700 hover:text-green-800">
            Return to sign in
          </Link>
        </div>
      ) : null}
    </div>
  );
}

