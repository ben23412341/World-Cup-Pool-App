import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-display text-lg text-text">World Cup Pool</span>
          <div className="flex items-center gap-2">
            <Link
              href="/pools/create"
              className="rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
            >
              Create pool
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
