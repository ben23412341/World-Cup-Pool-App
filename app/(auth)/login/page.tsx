import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/schemas/auth";

export const metadata = { title: "Sign in — World Cup Pool" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      redirect(
        `/login?error=${encodeURIComponent(result.error.issues[0].message)}`
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
    redirect("/my-entries");
  }

  const inputClass =
    "rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const labelClass =
    "text-xs font-medium uppercase tracking-wide text-text-subtle";

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
        <h2 className="mb-6 text-base font-semibold text-text">Sign in</h2>

        {error && (
          <p className="mb-4 rounded-lg bg-loss/10 px-4 py-3 text-sm text-loss">
            {error}
          </p>
        )}

        <form action={signIn} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-bright focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          <Link
            href="/signup"
            className="text-text-muted transition-colors hover:text-text"
          >
            Create account
          </Link>
          <Link
            href="/forgot-password"
            className="text-text-muted transition-colors hover:text-text"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
