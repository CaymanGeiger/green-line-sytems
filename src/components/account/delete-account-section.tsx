"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AppSelect } from "@/components/ui/app-select";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

const DELETE_ACCOUNT_CONFIRMATION_PHRASE = "DELETE ACCOUNT";

type DeleteMode = "TRANSFER" | "FULL_DELETE";

export type DeleteAccountOrganizationOption = {
  id: string;
  name: string;
  candidates: Array<{
    userId: string;
    name: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
  }>;
};

type DeleteAccountSectionProps = {
  ownedOrganizations: DeleteAccountOrganizationOption[];
};

function getDefaultAssignments(
  organizations: DeleteAccountOrganizationOption[],
): Record<string, string> {
  return organizations.reduce<Record<string, string>>((accumulator, organization) => {
    const ownerCandidate = organization.candidates.find((candidate) => candidate.role === "OWNER");
    const firstCandidate = ownerCandidate ?? organization.candidates[0];
    if (firstCandidate) {
      accumulator[organization.id] = firstCandidate.userId;
    }
    return accumulator;
  }, {});
}

export function DeleteAccountSection({ ownedOrganizations }: DeleteAccountSectionProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DeleteMode>("TRANSFER");
  const [assignments, setAssignments] = useState<Record<string, string>>(
    getDefaultAssignments(ownedOrganizations),
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const transferUnavailableOrganizations = useMemo(
    () => ownedOrganizations.filter((organization) => organization.candidates.length === 0),
    [ownedOrganizations],
  );
  const canUseTransfer =
    ownedOrganizations.length === 0 || transferUnavailableOrganizations.length === 0;

  function openDialog() {
    setAssignments(getDefaultAssignments(ownedOrganizations));
    setCurrentPassword("");
    setConfirmation("");
    setError(null);
    setLoading(false);
    setMode(canUseTransfer ? "TRANSFER" : "FULL_DELETE");
    setOpen(true);
  }

  function closeDialog() {
    if (loading) {
      return;
    }

    setOpen(false);
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPassword.trim()) {
      setError("Current password is required.");
      return;
    }

    if (confirmation.trim().toUpperCase() !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
      setError(`Type "${DELETE_ACCOUNT_CONFIRMATION_PHRASE}" to continue.`);
      return;
    }

    if (mode === "TRANSFER") {
      const missingAssignment = ownedOrganizations.find(
        (organization) => organization.candidates.length > 0 && !assignments[organization.id],
      );
      if (missingAssignment) {
        setError(`Choose a replacement owner for ${missingAssignment.name}.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const transferAssignments =
        mode === "TRANSFER"
          ? ownedOrganizations
              .filter((organization) => assignments[organization.id])
              .map((organization) => ({
                organizationId: organization.id,
                replacementUserId: assignments[organization.id]!,
              }))
          : [];

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          currentPassword,
          confirmation: confirmation.trim().toUpperCase(),
          transferAssignments,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Unable to delete account");
        return;
      }

      window.location.assign("/signin");
    } catch {
      setError("Unable to delete account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
        This action is irreversible. Deleting your account can delete owned organizations and
        remove your access permanently.
      </div>

      <Button
        type="button"
        variant="danger"
        className="h-10 px-4 text-sm"
        onClick={openDialog}
      >
        Delete Account
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close delete account dialog"
            onClick={closeDialog}
          />

          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                Danger Zone
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Delete account</h3>
              <p className="mt-1 text-sm text-slate-600">
                Choose whether to transfer ownership or fully delete owned organizations before
                removing your account.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
              <div className="grid gap-2 md:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-lg border px-3 py-3 text-sm ${
                    mode === "TRANSFER"
                      ? "border-green-500 bg-green-50"
                      : "border-slate-300 bg-white"
                  } ${!canUseTransfer ? "opacity-60" : ""}`}
                >
                  <input
                    type="radio"
                    name="delete-mode"
                    value="TRANSFER"
                    className="sr-only"
                    checked={mode === "TRANSFER"}
                    disabled={!canUseTransfer || loading}
                    onChange={() => setMode("TRANSFER")}
                  />
                  <span className="block font-semibold text-slate-900">
                    Assign owner rights, then delete my account
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    Promote another member to owner for each org you own.
                  </span>
                </label>

                <label
                  className={`cursor-pointer rounded-lg border px-3 py-3 text-sm ${
                    mode === "FULL_DELETE"
                      ? "border-rose-400 bg-rose-50"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="delete-mode"
                    value="FULL_DELETE"
                    className="sr-only"
                    checked={mode === "FULL_DELETE"}
                    disabled={loading}
                    onChange={() => setMode("FULL_DELETE")}
                  />
                  <span className="block font-semibold text-slate-900">
                    Fully delete everything I own
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    Deletes organizations you own, related teams/data, then your account.
                  </span>
                </label>
              </div>

              {!canUseTransfer ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Ownership transfer is unavailable because at least one owned organization has no
                  other members. Use full delete or add members first.
                </p>
              ) : null}

              {mode === "TRANSFER" && ownedOrganizations.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Replacement owners
                  </p>
                  <div className="space-y-2">
                    {ownedOrganizations.map((organization) => (
                      <label key={organization.id} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {organization.name}
                        <AppSelect
                          value={assignments[organization.id] ?? ""}
                          disabled={organization.candidates.length === 0 || loading}
                          onChange={(event) =>
                            setAssignments((current) => ({
                              ...current,
                              [organization.id]: event.target.value,
                            }))
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
                        >
                          <option value="">Select a member</option>
                          {organization.candidates.map((candidate) => (
                            <option key={candidate.userId} value={candidate.userId}>
                              {candidate.name} ({candidate.email}){" "}
                              {candidate.role === "OWNER" ? "· Owner" : ""}
                            </option>
                          ))}
                        </AppSelect>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current password
                <PasswordInput
                  id="delete-account-current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  inputClassName="mt-1"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Type {DELETE_ACCOUNT_CONFIRMATION_PHRASE}
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
                  required
                />
              </label>

              <div className="min-h-[20px]" aria-live="polite">
                {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 px-4 text-sm"
                  onClick={closeDialog}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="h-10 px-4 text-sm"
                  loading={loading}
                  loadingText="Deleting..."
                >
                  Permanently Delete Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
