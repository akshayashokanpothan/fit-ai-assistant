import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/**
 * Handles `token_hash` + `type` style email OTP confirmations (signup,
 * magic link, recovery, email change) via `verifyOtp` — the ACTIVE
 * production flow for Pace AI, paired with:
 *   - Resend as custom SMTP (Supabase Dashboard → Auth → SMTP Settings)
 *   - the verified sending domain paceai.akshayashokanpothan.com
 *   - a customized "Confirm signup" email template that links to
 *     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/`
 *     instead of the default `{{ .ConfirmationURL }}`
 *
 * `signUp()` in src/lib/auth/auth-context.tsx sets `emailRedirectTo` to
 * this route. This same route is also the intended landing target for
 * future password-reset and magic-link flows (same `token_hash`/`type`
 * mechanism, different `type` values) — no route changes needed for those,
 * just pointing their respective email templates here too.
 *
 * `/auth/callback` (code + exchangeCodeForSession) is kept separately and
 * reserved for future OAuth/PKCE providers (Google, Apple, etc.) — it is
 * not used for email/password confirmation in this architecture.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/";

  // Only ever redirect to a same-origin relative path — never follow a
  // query-supplied absolute URL, to avoid an open-redirect vector.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (tokenHash && type) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Deliberately generic — never forward Supabase's raw error_description
  // (or any other verification internals) to the client.
  return NextResponse.redirect(`${origin}/login?error=email_verification_failed`);
}
