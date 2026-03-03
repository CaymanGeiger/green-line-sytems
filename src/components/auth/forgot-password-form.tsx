"use client";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { useForgotPasswordFlow } from "@/hooks/use-forgot-password-flow";

export function ForgotPasswordForm() {
  const {
    stage,
    email,
    setEmail,
    codeDigits,
    code,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    devCode,
    notice,
    error,
    resetError,
    loading,
    handleRequest,
    handleResendCode,
    handleVerify,
    handleReset,
    setCodeDigit,
    onCodeKeyDown,
    onCodePaste,
    setCodeInputRef,
    codeLength,
  } = useForgotPasswordFlow();

  return (
    <div className="space-y-4">
      {stage === "request" ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Account email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="min-h-[20px]" aria-live="polite">
            {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
          </div>
          <Button type="submit" block loading={loading} loadingText="Sending...">
            Request reset code
          </Button>
        </form>
      ) : null}

      {stage === "verify" ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <p className="mb-1 block text-sm font-medium text-slate-700">Verification code</p>
            <div className="flex items-center justify-between gap-2">
              {codeDigits.map((digit, index) => (
                <input
                  key={`code-${index}`}
                  ref={(element) => setCodeInputRef(index, element)}
                  type="text"
                  value={digit}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  onChange={(event) => setCodeDigit(index, event.target.value)}
                  onKeyDown={(event) => onCodeKeyDown(index, event)}
                  onPaste={onCodePaste}
                  aria-label={`Digit ${index + 1}`}
                  className="h-12 w-11 rounded-lg border border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
              ))}
            </div>
          </div>
          {devCode ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Dev code: <span className="font-semibold">{devCode}</span>
            </p>
          ) : null}
          <div className="min-h-[20px]" aria-live="polite">
            {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
            {!error && notice ? <p className="text-xs font-semibold text-green-700">{notice}</p> : null}
          </div>
          <div className="space-y-2">
            <Button type="submit" block disabled={code.length !== codeLength} loading={loading} loadingText="Verifying...">
              Verify code
            </Button>
            <Button type="button" variant="secondary" block loading={loading} loadingText="Sending..." onClick={handleResendCode}>
              Resend code
            </Button>
          </div>
        </form>
      ) : null}

      {stage === "reset" ? (
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">
              New password
            </label>
            <PasswordInput id="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
          <div className="min-h-[20px]" aria-live="polite">
            {Array.isArray(resetError) ? (
              <ul className="list-disc space-y-1 pl-4 text-xs font-semibold text-rose-600">
                {resetError.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : resetError ? (
              <p className="text-xs font-semibold text-rose-600">{resetError}</p>
            ) : null}
          </div>
          <Button type="submit" block loading={loading} loadingText="Resetting...">
            Reset password
          </Button>
        </form>
      ) : null}
    </div>
  );
}
