"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

type SignupState = { error?: string; success?: boolean };

const inputClass =
  "rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const labelClass =
  "text-xs font-medium uppercase tracking-wide text-text-subtle";

export default function SignupForm({
  action,
}: {
  action: (state: SignupState, formData: FormData) => Promise<SignupState>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordTooShort = password.length > 0 && password.length < 8;
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  if (state.success) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="mb-2 text-lg font-semibold text-text">
          Check your email to confirm your account
        </p>
        <p className="text-sm text-text-muted">
          We sent a confirmation link to your inbox. Click it to activate your
          account.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-primary transition-colors hover:text-primary-bright"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-8">
      <h2 className="mb-6 text-base font-semibold text-text">
        Create account
      </h2>

      {state.error && (
        <p className="mb-4 rounded-lg bg-loss/10 px-4 py-3 text-sm text-loss">
          {state.error}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {passwordTooShort && (
            <p className="text-xs text-loss">
              Must be at least 8 characters
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
          {passwordMismatch && (
            <p className="text-xs text-loss">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || passwordMismatch || passwordTooShort}
          className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-bright focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary transition-colors hover:text-primary-bright"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
