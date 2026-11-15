import {
  CHAABI_CURRENCY,
  CHAABI_ORDER_PATTERN,
  chaabiAmountInCents,
  getChaabiConfig,
  parseChaabiCallback,
} from "@/lib/chaabiPayment";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function reply(message: "FAILURE" | "APPROVED" | "ACTION=POSTAUTH") {
  return new Response(message, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function POST(request: Request) {
  const config = getChaabiConfig();
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();
  if (!config || contentType !== "application/x-www-form-urlencoded") return reply("FAILURE");

  try {
    const body = await request.text();
    if (body.length > 64_000) return reply("FAILURE");
    const fields = parseChaabiCallback(body, config.storeKey);
    const orderId = fields?.get("oid");
    const amount = chaabiAmountInCents(fields?.get("amount") ?? "");

    if (
      !fields || !orderId || !CHAABI_ORDER_PATTERN.test(orderId) || amount === null ||
      fields.get("clientid") !== config.clientId || fields.get("currency") !== CHAABI_CURRENCY
    ) return reply("FAILURE");

    if (fields.get("procreturncode") !== "00") {
      // A decline may be followed by an approved attempt for the same order.
      const { data, error } = await supabaseAdmin
        .from("bookings")
        .select("total_price")
        .eq("payment_order_id", orderId)
        .maybeSingle();
      if (error || !data || chaabiAmountInCents(String(data.total_price)) !== amount) {
        return reply("FAILURE");
      }
      return reply("APPROVED");
    }

    const transactionId = fields.get("transid");
    if (fields.get("response") !== "Approved" || !transactionId || transactionId.length > 64) {
      return reply("FAILURE");
    }

    const { data, error } = await supabaseAdmin.rpc("record_chaabi_authorization", {
      order_id: orderId,
      amount_cents: amount,
      transaction_id: transactionId,
    });
    if (error) {
      console.error("Chaabi authorization write failed", error.code);
      return reply("FAILURE");
    }
    return reply(data === "ACTION=POSTAUTH" || data === "APPROVED" ? data : "FAILURE");
  } catch {
    return reply("FAILURE");
  }
}
