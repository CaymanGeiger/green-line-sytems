"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { GET_STARTED_OPEN_EVENT, type GetStartedSnapshot } from "@/lib/get-started/shared";

type GetStartedDrawerProps = {
  snapshot: GetStartedSnapshot;
};

type DrawerStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  complete: boolean;
};

function stepIcon(complete: boolean, index: number) {
  if (complete) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[11px] font-semibold text-green-700">
        ✓
      </span>
    );
  }

  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-600">
      {index + 1}
    </span>
  );
}

export function GetStartedDrawer({ snapshot }: GetStartedDrawerProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOwnerMode = snapshot.mode === "OWNER_SETUP";

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }

    window.addEventListener(GET_STARTED_OPEN_EVENT, handleOpen);
    return () => {
      window.removeEventListener(GET_STARTED_OPEN_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const steps = useMemo<DrawerStep[]>(() => {
    if (snapshot.mode === "EMPLOYEE_JOIN") {
      return [
        {
          id: "invite",
          title: "Request workspace access",
          description: "Ask your company owner/admin to invite this email into their organization.",
          href: "/account",
          complete: snapshot.hasPendingInvite || snapshot.organizationsCount > 0,
        },
        {
          id: "team",
          title: "Join a team",
          description: "Team access unlocks incidents, services, and scoped operations data.",
          href: "/account",
          complete: snapshot.teamsCount > 0,
        },
        {
          id: "simulator",
          title: "Run the simulator once",
          description: "Trigger sample telemetry and watch incidents/services update in real time.",
          href: "/test-dev-ops",
          complete: snapshot.hasSimulatorTelemetry,
        },
        {
          id: "operations",
          title: "Review active operations",
          description: "Open incidents or runbooks to get familiar with the incident workflow.",
          href: "/incidents",
          complete: snapshot.hasIncident || snapshot.hasRunbook,
        },
      ];
    }

    return [
      {
        id: "organization",
        title: "Create your first organization",
        description: "Organizations are top-level workspaces for teams, members, and permissions.",
        href: "/organizations",
        complete: snapshot.organizationsCount > 0,
      },
      {
        id: "team",
        title: "Create your first team",
        description: "Teams scope incidents, services, and access control.",
        href: "/organizations",
        complete: snapshot.teamsCount > 0,
      },
      {
        id: "member",
        title: "Add your first teammate",
        description: "Invite another member to collaborate across incidents and operations.",
        href: "/organizations",
        complete: snapshot.hasAdditionalMember || snapshot.hasPendingInvite,
      },
      {
        id: "simulator",
        title: "Run the simulator once",
        description: "Trigger sample events so the dashboard and incident views populate with telemetry.",
        href: "/test-dev-ops",
        complete: snapshot.hasSimulatorTelemetry,
      },
      {
        id: "operations",
        title: "Create operational content",
        description: "Create at least one incident or runbook to complete your initial workflow.",
        href: "/incidents",
        complete: snapshot.hasIncident || snapshot.hasRunbook,
      },
    ];
  }, [snapshot]);

  const completedCount = steps.filter((step) => step.complete).length;

  async function copyEmployeeAccessLink() {
    if (!snapshot.employeeAccessRequestLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(snapshot.employeeAccessRequestLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button
        type="button"
        aria-label="Close get started drawer"
        onClick={() => setOpen(false)}
        className={`absolute inset-0 bg-slate-900/35 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Get started"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-green-800">Get Started</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {isOwnerMode ? "Owner Setup Checklist" : "Employee Onboarding Checklist"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isOwnerMode
                  ? "Complete the core setup path for your GreenLine Systems workspace."
                  : "Get invited to your workspace, join a team, and start operating the platform."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 hover:text-rose-800"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {completedCount} / {steps.length} completed
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${Math.round((completedCount / steps.length) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {!isOwnerMode && snapshot.employeeAccessRequestLink ? (
              <section className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your access request link</p>
                <p className="mt-1 text-xs text-slate-600">
                  Share this with an organization owner/admin so they can configure your access and send verification.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    readOnly
                    value={snapshot.employeeAccessRequestLink}
                    className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={copyEmployeeAccessLink}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </section>
            ) : null}

            {steps.map((step, index) => (
              <article
                key={step.id}
                className={`rounded-lg border px-3 py-3 ${step.complete ? "border-green-200 bg-green-50/40" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start gap-3">
                  {stepIcon(step.complete, index)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{step.description}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold ${
                          step.complete ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {step.complete ? "Completed" : "Pending"}
                      </span>
                      <Link
                        href={step.href}
                        onClick={() => setOpen(false)}
                        className="text-xs font-semibold text-green-700 transition hover:text-green-800"
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
