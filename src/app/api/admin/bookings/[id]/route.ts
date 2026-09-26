import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { BOOKING_STATUSES } from "@/lib/constants";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Invalid booking id" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.status || !(BOOKING_STATUSES as readonly string[]).includes(body.status)) {
    return Response.json(
      { error: `status must be one of: ${BOOKING_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: body.status })
    .eq("id", Number(id))
    .select(
      "id, court_id, booking_date, time_slot, player_count, other_players, status, total_price, full_name, phone, email, booking_ref, created_at"
    )
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ booking: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Invalid booking id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("bookings").delete().eq("id", Number(id));

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
