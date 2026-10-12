import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/userAuth";
import {
  PUBLIC_BOOKING_COLUMNS,
  clientIp,
  evaluateCancellation,
  phonesMatch,
  rateLimited,
  toPublicBooking,
} from "@/lib/bookingPolicy";

// Player-initiated cancellation. Authorised either by a valid login (booking e-mail
// matches the account) or by the guest proof (booking ref + phone).
export async function POST(request: Request) {
  if (rateLimited(`cancel:${clientIp(request)}`, 20)) {
    return Response.json(
      { error: "Trop de tentatives. Veuillez réessayer dans quelques minutes." },
      { status: 429 }
    );
  }

  let body: { ref?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ref = (body.ref || "").trim().toUpperCase();
  if (!ref) {
    return Response.json({ error: "Référence requise." }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select(`id, ${PUBLIC_BOOKING_COLUMNS}`)
    .eq("booking_ref", ref)
    .maybeSingle();

  const notFound = Response.json(
    { error: "Aucune réservation ne correspond à ces informations." },
    { status: 404 }
  );
  if (error || !booking) return notFound;

  const user = await getUserFromRequest(request);
  const ownerByAccount =
    !!user && (booking.email || "").toLowerCase() === user.email!.toLowerCase();
  const ownerByPhone = !!body.phone && phonesMatch(booking.phone, body.phone);
  if (!ownerByAccount && !ownerByPhone) return notFound;

  const { cancellable, reason } = evaluateCancellation(booking);
  if (!cancellable) {
    return Response.json({ error: reason }, { status: 403 });
  }

  // Guard on status so a concurrent admin change to "paid" is never overwritten.
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id)
    .eq("status", "pending")
    .select(PUBLIC_BOOKING_COLUMNS)
    .maybeSingle();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return Response.json(
      { error: "Le statut de la réservation a changé. Merci de contacter le club." },
      { status: 409 }
    );
  }

  return Response.json({ success: true, booking: toPublicBooking(updated) });
}
