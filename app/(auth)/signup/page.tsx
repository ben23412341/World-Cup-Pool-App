import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/schemas/auth";
import SignupForm from "./SignupForm";

export const metadata = { title: "Create account — World Cup Pool" };

export default function SignupPage() {
  async function signUp(
    _prevState: { error?: string; success?: boolean },
    formData: FormData
  ) {
    "use server";
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const result = signupSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }

    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const origin = `${protocol}://${host}`;

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });

    if (error) {
      return { error: error.message };
    }
    redirect("/my-entries");
  }

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
      <SignupForm action={signUp} />
    </div>
  );
}
