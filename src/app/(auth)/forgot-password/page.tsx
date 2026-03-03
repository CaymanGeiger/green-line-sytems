import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
        <p className="mt-1 text-sm text-slate-600">Request a one-time code and securely reset account credentials.</p>
      </div>
      <ForgotPasswordForm />
      <Link href="/signin" className="text-sm text-green-700 hover:text-green-800">
        Back to sign in
      </Link>
    </div>
  );
}
