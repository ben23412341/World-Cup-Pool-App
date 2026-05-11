import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My entries — World Cup Pool" };

export default async function MyEntriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="font-display text-3xl text-text">My entries</h1>
      <p className="mt-2 text-sm text-text-muted">{user?.email}</p>
    </div>
  );
}
