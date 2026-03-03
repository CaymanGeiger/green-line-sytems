import Link from "next/link";

import { TeamInviteVerifyExisting } from "@/components/auth/team-invite-verify-existing";

type SearchParams = {
  token?: string | string[] | undefined;
};

export default async function TeamInviteVerifyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tokenParam = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = tokenParam?.trim() ?? "";

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Verify workspace access</h1>
        <p className="text-sm text-slate-600">This verification link is invalid.</p>
        <Link href="/signin?invite=invalid" className="text-sm font-semibold text-green-700 hover:text-green-800">
          Return to sign in
        </Link>
      </div>
    );
  }

  return <TeamInviteVerifyExisting token={token} />;
}

