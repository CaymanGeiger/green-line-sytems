import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SignUpPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/signin"
          className="inline-flex items-center pb-2 text-xs font-semibold text-slate-600 hover:text-blue-700"
        >
          ← Return to sign in
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mt-1 text-sm text-slate-600">Provision secure access to the incident command center.</p>
      </div>
      <SignUpForm />
    </div>
  );
}
