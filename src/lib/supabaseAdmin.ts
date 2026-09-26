import { createClient } from "@supabase/supabase-js";

// Server-only client: uses the service role key so admin routes can read/delete
// bookings regardless of row-level security policies written for the public
// anon key. Only import this from Route Handlers under src/app/api/admin/**,
// never from a "use client" component — the service role key must not reach
// the browser bundle.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.warn(
    "SUPABASE_SERVICE_ROLE_KEY is not set — admin routes will fall back to the anon key and may be blocked by row-level security."
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);
