import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/userAuth";
import { PUBLIC_BOOKING_COLUMNS, toPublicBooking } from "@/lib/bookingPolicy";

// Bookings of the logged-in player (matched on account e-mail).
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(PUBLIC_BOOKING_COLUMNS)
    .ilike("email", user.email!)
    .order("booking_date", { ascending: false })
    .order("time_slot", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ bookings: (data ?? []).map(toPublicBooking) });
}
