"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GET_STARTED_OPEN_EVENT, type GetStartedSnapshot } from "@/lib/get-started/shared";

type WelcomeGetStartedModalProps = {
  snapshot: GetStartedSnapshot;
};

function removeWelcomeParam(pathname: string, searchParams: URLSearchParams): string {
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.delete("welcome");
  const nextQuery = nextParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function WelcomeGetStartedModal({ snapshot }: WelcomeGetStartedModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const isOwnerMode = snapshot.mode === "OWNER_SETUP";
  const shouldAllowWelcome = useMemo(() => {
    if (snapshot.mode === "EMPLOYEE_JOIN") {
      return snapshot.organizationsCount === 0 && snapshot.teamsCount === 0;
    }

    return (
      snapshot.teamsCount === 0 &&
      !snapshot.hasAdditionalMember &&
      !snapshot.hasPendingInvite &&
      !snapshot.hasSimulatorTelemetry &&
      !snapshot.hasIncident &&
      !snapshot.hasRunbook
    );
  }, [snapshot]);

  const clearWelcomeQuery = useCallback(() => {
    const nextUrl = removeWelcomeParam(pathname, new URLSearchParams(searchParams.toString()));
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const hasWelcomeQuery = searchParams.get("welcome") === "1";
  const open = hasWelcomeQuery && shouldAllowWelcome && !dismissed;

  useEffect(() => {
    if (hasWelcomeQuery && !shouldAllowWelcome) {
      clearWelcomeQuery();
    }
  }, [clearWelcomeQuery, hasWelcomeQuery, shouldAllowWelcome]);

  function closeModal() {
    setDismissed(true);
    clearWelcomeQuery();
  }

  function startSetup() {
    closeModal();
    window.setTimeout(() => {
      window.dispatchEvent(new Event(GET_STARTED_OPEN_EVENT));
    }, 60);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close welcome modal"
        className="absolute inset-0 bg-slate-900/45"
        onClick={closeModal}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-get-started-title"
        className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-800">Welcome</p>
        <h2 id="welcome-get-started-title" className="mt-1 text-xl font-semibold text-slate-900">
          {isOwnerMode ? "Your workspace is ready" : "You are almost connected"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {isOwnerMode
            ? "Start with a guided launch checklist to set up your organization, team, and first incident workflow."
            : "Use the onboarding checklist to request an invite from your company owner/admin and complete your initial setup."}
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={startSetup}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-green-700 px-4 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            {isOwnerMode ? "Start setup" : "Open onboarding"}
          </button>
        </div>
      </div>
    </div>
  );
}
