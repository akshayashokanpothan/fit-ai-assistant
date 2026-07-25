import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Reserved for future OAuth/PKCE providers (Google, Apple, etc.) via
 * `signInWithOAuth`, which redirect back here with a `?code=` param to
 * exchange for a session.
 *
 * NOT used for email/password confirmation in this architecture — that
 * flow is handled by src/app/auth/confirm/route.ts (token_hash +
 * verifyOtp), paired with a custom "Confirm signup" email template sent
 * via Resend SMTP. This route currently has no active caller; it's kept
 * ready so adding an OAuth provider later doesn't require new routing.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";

  // Only ever redirect to a same-origin relative path — never follow a
  // query-supplied absolute URL, to avoid an open-redirect vector.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Deliberately generic — never forward Supabase's raw error_description
  // (or any other verification internals) to the client.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
