import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CHAABI_CURRENCY = "504";
export const CHAABI_SESSION_SECONDS = 600;
export const CHAABI_HOLD_MS = 15 * 60_000;
export const CHAABI_ORDER_PATTERN = /^[a-f0-9]{32}$/;

export function chaabiPaymentsEnabled() {
  return process.env.CHAABI_PAYMENTS_ENABLED === "true";
}

export function chaabiConfigured() {
  return chaabiPaymentsEnabled() || Boolean(process.env.CHAABI_CLIENT_ID);
}

export function getChaabiConfig() {
  const clientId = process.env.CHAABI_CLIENT_ID;
  const storeKey = process.env.CHAABI_STORE_KEY;
  const gatewayUrl = URL.parse(process.env.CHAABI_GATEWAY_URL ?? "");
  const siteUrl = URL.parse(process.env.CHAABI_SITE_URL ?? "");
  if (
    !clientId || !storeKey || !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !gatewayUrl || gatewayUrl.protocol !== "https:" || gatewayUrl.username || gatewayUrl.password ||
    !siteUrl || siteUrl.protocol !== "https:" || siteUrl.username || siteUrl.password
  ) return null;

  return { clientId, storeKey, gatewayUrl: gatewayUrl.href, siteOrigin: siteUrl.origin };
}

type ChaabiConfig = NonNullable<ReturnType<typeof getChaabiConfig>>;

function escapeValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|");
}

export function signChaabiFields(fields: ReadonlyMap<string, string>, storeKey: string) {
  // The package's JSP reference sorts case-insensitively using ordinal order.
  const signedValues = [...fields.entries()]
    .map(([key, value]) => [key.toUpperCase(), value] as const)
    .filter(([key]) => key !== "HASH" && key !== "ENCODING")
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([, value]) => escapeValue(value));

  return createHash("sha512")
    .update([...signedValues, escapeValue(storeKey)].join("|"), "utf8")
    .digest("base64");
}

export function parseChaabiCallback(body: string, storeKey: string) {
  const fields = new Map<string, string>();
  for (const [name, value] of new URLSearchParams(body)) {
    const key = name.toLowerCase();
    if (!/^[a-z0-9_.-]+$/.test(key) || fields.has(key)) return null;
    fields.set(key, value.replace(/[\t\n\r]+/g, ""));
  }

  const signature = fields.get("hash");
  const expected = signChaabiFields(fields, storeKey);
  if (!signature || signature.length !== expected.length) return null;
  const received = Buffer.from(signature, "utf8");
  const calculated = Buffer.from(expected, "utf8");
  if (received.length !== calculated.length || !timingSafeEqual(received, calculated)) return null;
  return fields;
}

export function chaabiAmountInCents(amount: string) {
  const match = /^([0-9]{1,9})(?:[.,]([0-9]{1,2}))?$/.exec(amount);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function createChaabiCheckout(config: ChaabiConfig, booking: {
  total_price: number;
  full_name: string;
  email: string;
}) {
  const order = randomBytes(16).toString("hex");
  const result = new URL("/payment/result", config.siteOrigin);
  result.searchParams.set("order", order);
  const returnUrl = new URL("/api/payments/chaabi/return", config.siteOrigin);
  returnUrl.searchParams.set("order", order);

  const normalize = (value: string, max: number) =>
    value.replace(/[\t\n\r]+/g, " ").trim().slice(0, max);
  const fields = new Map(Object.entries({
    clientid: config.clientId,
    storetype: "3d_pay_hosting",
    trantype: "PreAuth",
    amount: booking.total_price.toFixed(2),
    currency: CHAABI_CURRENCY,
    oid: order,
    okUrl: returnUrl.href,
    failUrl: returnUrl.href,
    shopurl: result.href,
    CallbackResponse: "true",
    CallbackURL: new URL("/api/payments/chaabi/callback", config.siteOrigin).href,
    lang: "fr",
    email: normalize(booking.email, 64),
    BillToName: normalize(booking.full_name, 255),
    rnd: randomBytes(10).toString("hex"),
    hashAlgorithm: "ver3",
    encoding: "utf-8",
    AutoRedirect: "true",
    sessiontimeout: String(CHAABI_SESSION_SECONDS),
  }));
  // CMI normalizes the character immediately following "document" on its side.
  const normalizedForHash = new Map([...fields].map(([key, value]) =>
    [key, value.replace(/document./gi, (match) => match.slice(0, -1) + ".")]));
  fields.set("hash", signChaabiFields(normalizedForHash, config.storeKey));

  return { order, action: config.gatewayUrl, fields: Object.fromEntries(fields) };
}
