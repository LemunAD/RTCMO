import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "rtcmo_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET environment variable is not set");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Constant-time password check, hashed first so differing lengths don't short-circuit. */
export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const candidateHash = createHmac("sha256", "rtcmo-admin-pw").update(candidate).digest();
  const expectedHash = createHmac("sha256", "rtcmo-admin-pw").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function createSessionToken(): string {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(sign(payload), signature)) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
