import { supabase } from "@/lib/supabase";
import {
  COURT_IDS,
  TIME_SLOTS,
  MAX_PLAYER_NAME_LENGTH,
  isPastBookingDate,
  isSunday,
} from "@/lib/constants";

interface BookingPayload {
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  total_price: number;
  full_name: string;
  phone: string;
  email: string;
  other_players?: unknown;
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

  if (!COURT_IDS.includes(body.court_id as (typeof COURT_IDS)[number])) {
    return Response.json({ error: "Invalid court_id" }, { status: 400 });
  }

  if (!(TIME_SLOTS as readonly string[]).includes(body.time_slot)) {
    return Response.json({ error: "Invalid time_slot" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.booking_date)) {
    return Response.json({ error: "Invalid booking_date format" }, { status: 400 });
  }

  if (isPastBookingDate(body.booking_date)) {
    return Response.json(
      { error: "La date sélectionnée est déjà passée." },
      { status: 400 }
    );
  }

  if (isSunday(body.booking_date)) {
    return Response.json(
      { error: "Le club est fermé le dimanche.", code: "CLOSED_SUNDAY" },
      { status: 400 }
    );
  }

  let otherPlayers: string[] = [];
  if (body.other_players !== undefined) {
    if (
      !Array.isArray(body.other_players) ||
      !body.other_players.every((n) => typeof n === "string")
    ) {
      return Response.json({ error: "other_players must be an array of strings" }, { status: 400 });
    }
    otherPlayers = (body.other_players as string[])
      .map((n) => n.trim().slice(0, MAX_PLAYER_NAME_LENGTH))
      .filter(Boolean);
    if (otherPlayers.length > body.player_count - 1) {
      return Response.json(
        { error: "other_players cannot exceed player_count - 1 entries" },
        { status: 400 }
      );
    }
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
      other_players: otherPlayers,
      status: "pending",
    })
    .select("id, booking_ref")
    .single();

  if (error) {
    // UNIQUE constraint violation → slot already taken
    if (error.code === "23505") {
      return Response.json(
        {
          error:
            "Ce créneau vient d'être réservé par quelqu'un d'autre. Veuillez en choisir un autre.",
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
