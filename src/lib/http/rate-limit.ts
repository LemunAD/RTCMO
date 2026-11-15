// Very small in-memory throttle to slow down ref/phone guessing. Per-instance only;
// good enough as a first line of defence on a single-club site.
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimited(key: string, max = 10, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
