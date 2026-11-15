import { clientIp, rateLimited } from "@/lib/http/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  type BookingRow,
  publicBookingColumns,
  phonesMatch,
  toPublicBooking,
} from "@/features/booking-management/policy";

// Guest lookup: booking reference + phone number used at booking time.
export async function POST(request: Request) {
  if (rateLimited(`lookup:${clientIp(request)}`)) {
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
  const phone = (body.phone || "").trim();
  if (!ref || !phone) {
    return Response.json({ error: "Référence et téléphone requis." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(publicBookingColumns())
    .eq("booking_ref", ref)
    .maybeSingle()
    .overrideTypes<BookingRow, { merge: false }>();

  // Same message for "not found" and "wrong phone" so refs can't be enumerated.
  if (error || !data || !phonesMatch(data.phone, phone)) {
    return Response.json(
      { error: "Aucune réservation ne correspond à ces informations." },
      { status: 404 }
    );
  }

  return Response.json({ booking: toPublicBooking(data) });
}
