import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/admin";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  return Response.json({ success: true });
}
