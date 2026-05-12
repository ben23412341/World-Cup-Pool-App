import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/schemas/auth";

export const metadata = { title: "Forgot password — World Cup Pool" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  async function sendResetLink(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string).trim();

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      redirect("/forgot-password?sent=1");
    }

    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const origin = `${protocol}://${host}`;

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${origin}/auth/callback?type=recovery`,
    });

    redirect("/forgot-password?sent=1");
  }

  const inputClass =
    "rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div>
      <div className="mb-8 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="mx-auto mb-3 text-primary"
          aria-hidden="true"
        >
          <path d="M18 2H6v2H4v5c0 2.97 2.16 5.44 5 5.91V17H7v2h2v1H7v2h10v-2h-2v-1h2v-2h-2v-1.09c2.84-.47 5-2.94 5-5.91V4h-2V2zM6 9V6h2v4.9A4.01 4.01 0 0 1 6 9zm12 0c0 1.48-.81 2.77-2 3.46V6h2v3z" />
        </svg>
        <h1 className="font-display text-2xl text-text">World Cup Pool</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-8">
        {sent ? (
          <div className="text-center">
            <p className="mb-2 text-base font-semibold text-text">
              Reset link sent
            </p>
            <p className="text-sm text-text-muted">
              If an account exists for that email, a reset link has been sent.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm text-primary transition-colors hover:text-primary-bright"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-base font-semibold text-text">
              Forgot password?
            </h2>
            <p className="mb-6 text-sm text-text-muted">
              Enter your email and we&apos;ll send a reset link.
            </p>

            <form action={sendResetLink} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium uppercase tracking-wide text-text-subtle"
                >
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

              <button
                type="submit"
                className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-bright focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                Send reset link
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link
                href="/login"
                className="text-text-muted transition-colors hover:text-text"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
