import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  checkAdminPassword,
  createSessionToken,
} from "@/lib/adminAuth";
import { clientIp, rateLimited } from "@/lib/bookingPolicy";

export async function POST(request: Request) {
  if (rateLimited(`admin-login:${clientIp(request)}`, 5, 15 * 60 * 1000)) {
    return Response.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 }
    );
  }

  let body: { password?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.password || !checkAdminPassword(body.password)) {
    return Response.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return Response.json({ success: true });
}
