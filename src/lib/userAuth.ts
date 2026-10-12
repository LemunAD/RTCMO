import { supabase } from "@/lib/supabase";

/** Resolves the Supabase user from an "Authorization: Bearer <access_token>" header. */
export async function getUserFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user;
}
