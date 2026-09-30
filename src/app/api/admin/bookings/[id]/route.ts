import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminAuthenticated } from "@/lib/adminAuth";

type Ctx = { params: Promise<{ id: string }> };

async function resolveId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return null;
  return Number(id);
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await resolveId(ctx);
  if (!id) {
    return Response.json({ error: "Invalid booking id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
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
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await resolveId(ctx);
  if (!id) {
    return Response.json({ error: "Invalid booking id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("bookings").delete().eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
