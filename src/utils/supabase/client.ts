import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client for use in Client Components. Uses only the public
 * URL + publishable key — never a service-role or other server-only secret.
 *
 * Not yet wired into any component — the app still reads/writes through the
 * demo store (`src/lib/demo/store.tsx`). This is infrastructure only.
 */
export const createClient = () => createBrowserClient(supabaseUrl!, supabaseKey!);
