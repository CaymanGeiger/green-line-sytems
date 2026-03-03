import Link from "next/link";
import { redirect } from "next/navigation";

import { TeamInviteSignUpForm } from "@/components/auth/team-invite-signup-form";
import { findActiveOrganizationInviteByRawToken } from "@/lib/auth/organization-invite";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";

type SearchParams = {
  token?: string | string[] | undefined;
};

export default async function TeamInvitePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const tokenParam = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = tokenParam?.trim() ?? "";

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Organization invitation</h1>
        <p className="text-sm text-slate-600">This invitation link is invalid.</p>
        <Link href="/signin" className="text-sm font-semibold text-green-700 hover:text-green-800">
          Return to sign in
        </Link>
      </div>
    );
  }

  const invite = await findActiveOrganizationInviteByRawToken(token);
  if (!invite) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Organization invitation</h1>
        <p className="text-sm text-slate-600">This invitation has expired or has already been used.</p>
        <Link href="/signin" className="text-sm font-semibold text-green-700 hover:text-green-800">
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Accept organization invitation</h1>
        <p className="mt-1 text-sm text-slate-600">
          You were invited to <span className="font-semibold text-slate-800">{invite.organization.name}</span> as{" "}
          <span className="font-semibold text-slate-800">{invite.role}</span>.
        </p>
        <p className="mt-1 text-xs text-slate-500">Invite expires: {formatDateTime(invite.expiresAt)}</p>
      </div>
      <TeamInviteSignUpForm token={token} email={invite.email} />
    </div>
  );
}
