import { useState } from "react";
import { AlertCircle, CalendarDays, Clock, Loader2, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { COURTS, parseBookingDate } from "@/features/booking/constants";
import { authHeaders } from "../auth-headers";
import type { ManagedBooking } from "../types";

const STATUS_LABELS = { pending: "En attente", paid: "Payé", cancelled: "Annulé" } as const;
const STATUS_COLORS = { pending: "#F59E0B", paid: "#10B981", cancelled: "#EF4444" } as const;

export function BookingCard({
  booking,
  phone,
  onChanged,
}: {
  booking: ManagedBooking;
  phone?: string;
  onChanged: (b: ManagedBooking) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const court = COURTS.find((c) => c.id === booking.court_id);
  const color = STATUS_COLORS[booking.status];

  const cancel = async () => {
    setCancelling(true);
    setErr(null);
    try {
      const res = await fetch("/api/manage/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ ref: booking.booking_ref, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Annulation impossible.");
      onChanged(data.booking);
    } catch (e) {
      setErr((e instanceof Error && e.message) || "Annulation impossible.");
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        background: "rgba(255,255,255,0.7)",
        opacity: booking.status === "cancelled" ? 0.65 : 1,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: "0.9rem", letterSpacing: "0.03em" }}>{booking.booking_ref}</strong>
        <span
          style={{
            fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
            color, background: color + "1A", border: `1px solid ${color}40`,
          }}
        >
          {booking.payment_authorized ? "Paiement autorisé" : STATUS_LABELS[booking.status]}
        </span>
      </div>

      <div style={{ display: "grid", gap: 6, fontSize: "0.88rem", color: "var(--text-main)" }}>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <CalendarDays size={15} color="var(--primary)" />
          {format(parseBookingDate(booking.booking_date), "EEEE d MMMM yyyy", { locale: fr })}
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Clock size={15} color="var(--primary)" /> {booking.time_slot} · 90 min
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <MapPin size={15} color="var(--primary)" /> {court?.name ?? `Terrain ${booking.court_id}`}
          {court ? ` — ${court.tag}` : ""}
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Users size={15} color="var(--primary)" /> {booking.player_count} joueurs · {booking.total_price} MAD
        </span>
      </div>

      {err && (
        <div style={{ color: "#B91C1C", fontSize: "0.8rem", display: "flex", gap: 6, alignItems: "flex-start" }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {err}
        </div>
      )}

      {booking.status !== "cancelled" && booking.cancellable && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          style={{
            alignSelf: "flex-start", fontSize: "0.82rem", fontWeight: 600, color: "#B91C1C",
            padding: "7px 14px", borderRadius: "var(--radius-md)", border: "1px solid #FCA5A5",
            background: "#FEF2F2", cursor: "pointer",
          }}
        >
          Annuler cette réservation
        </button>
      )}

      {confirming && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Confirmer l&apos;annulation ?</span>
          <button
            onClick={cancel}
            disabled={cancelling}
            style={{
              fontSize: "0.82rem", fontWeight: 700, color: "#fff", background: "#DC2626",
              padding: "7px 14px", borderRadius: "var(--radius-md)", cursor: "pointer",
            }}
          >
            {cancelling ? <Loader2 size={14} className="spin-icon" /> : "Oui, annuler"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={cancelling}
            style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "7px 10px", cursor: "pointer" }}
          >
            Non
          </button>
        </div>
      )}

      {booking.status !== "cancelled" && !booking.cancellable && booking.cancel_reason && (
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
          {booking.cancel_reason}
        </p>
      )}
    </div>
  );
}
