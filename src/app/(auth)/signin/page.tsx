import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/signin-form";
import { getCurrentUser } from "@/lib/auth/session";

type SearchParams = {
  reset?: string | string[] | undefined;
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) {
    redirect("/");
  }

  const resetParam = Array.isArray(params.reset) ? params.reset[0] : params.reset;
  const notice = resetParam === "success" ? "Password reset complete. Sign in with your new password." : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">Access your command center workspace.</p>
      </div>
      <SignInForm notice={notice} />
    </div>
  );
}
