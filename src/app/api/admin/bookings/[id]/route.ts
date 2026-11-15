import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/auth/admin";
import { CHAABI_ORDER_PATTERN } from "@/features/payments/chaabi";

type Ctx = { params: Promise<{ id: string }> };

async function resolveId(ctx: Ctx): Promise<number | string | null> {
  const { id } = await ctx.params;
  if (/^\d+$/.test(id)) return Number(id);
  // UUID (or other safe token) primary keys
  if (/^[0-9a-fA-F-]{8,64}$/.test(id)) return id;
  return null;
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await resolveId(ctx);
  if (id === null) {
    return Response.json({ error: "Invalid booking id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid booking update" }, { status: 400 });
  }

  if ("payment_resolution" in body) {
    const { payment_order_id: order, payment_transaction_id: transaction, payment_resolution: resolution } = body;
    if (
      typeof order !== "string" || !CHAABI_ORDER_PATTERN.test(order) ||
      typeof transaction !== "string" || !transaction || transaction.length > 64 ||
      (resolution !== "captured" && resolution !== "refunded" && resolution !== "voided")
    ) {
      return Response.json({ error: "Rapprochement de paiement invalide." }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.rpc("reconcile_chaabi_payment", {
      booking_id: String(id),
      order_id: order,
      transaction_id: transaction,
      resolution,
    });
    if (error) {
      console.error("Chaabi reconciliation failed", error.code);
      return Response.json({ error: "Impossible d’enregistrer le rapprochement du paiement." }, { status: 500 });
    }
    if (data !== true) {
      return Response.json({ error: "Le paiement a changé. Actualisez la liste et vérifiez le portail marchand." }, { status: 409 });
    }
    return Response.json({ success: true });
  }

  // Only allow updating specific fields
  const allowed = ["status", "full_name", "phone", "email", "player_count"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Validate status if provided
  if (updates.status && !["pending", "paid", "cancelled"].includes(updates.status as string)) {
    return Response.json({ error: "Invalid status value" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("bookings")
    .update(updates)
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: error.code === "PT409" ? 409 : 500 });
  }

  return Response.json({ success: true });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await resolveId(ctx);
  if (id === null) {
    return Response.json({ error: "Invalid booking id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("bookings").delete().eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: error.code === "PT409" ? 409 : 500 });
  }

  return Response.json({ success: true });
}
