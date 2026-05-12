import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination =
        type === "recovery"
          ? `${origin}/reset-password`
          : `${origin}/my-entries`;
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("The link has expired or is invalid. Please try again.")}`);
}
