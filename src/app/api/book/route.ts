import { supabase } from "@/lib/supabase";

interface BookingPayload {
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  total_price: number;
  full_name: string;
  phone: string;
  email: string;
}

function generateRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "RTM-";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

export async function POST(request: Request) {
  let body: BookingPayload;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Basic validation
  const required: (keyof BookingPayload)[] = [
    "court_id",
    "booking_date",
    "time_slot",
    "player_count",
    "total_price",
    "full_name",
    "phone",
    "email",
  ];
  for (const field of required) {
    if (!body[field] && body[field] !== 0) {
      return Response.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }

  if (![2, 4].includes(body.player_count)) {
    return Response.json(
      { error: "player_count must be 2 or 4" },
      { status: 400 }
    );
  }

  const bookingRef = generateRef();

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      court_id: body.court_id,
      booking_date: body.booking_date,
      time_slot: body.time_slot,
      player_count: body.player_count,
      total_price: body.total_price,
      full_name: body.full_name,
      phone: body.phone,
      email: body.email,
      address: "",
      booking_ref: bookingRef,
    })
    .select("id, booking_ref")
    .single();

  if (error) {
    // UNIQUE constraint violation → slot already taken
    if (error.code === "23505") {
      return Response.json(
        {
          error:
            "This time slot has just been booked by someone else. Please choose a different slot.",
          code: "SLOT_TAKEN",
        },
        { status: 409 }
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    bookingRef: data.booking_ref,
    bookingId: data.id,
  });
}
