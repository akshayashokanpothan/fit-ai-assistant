import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Refreshes the Supabase auth session cookie on every matched request.
 * Called from the root `middleware.ts`. No auth UI exists yet, so in
 * practice there is no session to refresh today — this just keeps the
 * plumbing correct and ready for when login/signup is added.
 */
export const createClient = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Required by Supabase's documented SSR pattern: calling getUser() here is
  // what actually causes an expiring session cookie to be refreshed. Without
  // it, the cookie-forwarding plumbing above never fires. No auth UI exists
  // yet, so today this resolves to "no user" — it's here so refresh works
  // correctly the moment login is added, without revisiting this file.
  await supabase.auth.getUser();

  return supabaseResponse;
};
