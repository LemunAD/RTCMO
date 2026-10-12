"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  X, Search, Phone, Hash, Loader2, AlertCircle, CheckCircle2,
  CalendarDays, Clock, MapPin, Users, LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { COURTS, parseBookingDate } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ManagedBooking {
  booking_ref: string;
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  total_price: number;
  full_name: string;
  status: "pending" | "paid" | "cancelled";
  other_players?: string[] | null;
  cancellable: boolean;
  cancel_reason: string | null;
}

const STATUS_LABELS = { pending: "En attente", paid: "Payé", cancelled: "Annulé" } as const;
const STATUS_COLORS = { pending: "#F59E0B", paid: "#10B981", cancelled: "#EF4444" } as const;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Booking card ────────────────────────────────────────────────────────────

function BookingCard({
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
    } catch (e: any) {
      setErr(e.message || "Annulation impossible.");
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
          {STATUS_LABELS[booking.status]}
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

// ─── Modal: "Gérer ma réservation" (guest lookup) ────────────────────────────

export function ManageBookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<ManagedBooking | null>(null);

  useEffect(() => {
    if (!open) {
      setBooking(null);
      setError(null);
      setRef("");
      setPhone("");
    }
  }, [open]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBooking(null);
    try {
      const res = await fetch("/api/manage/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Réservation introuvable.");
      setBooking(data.booking);
    } catch (err: any) {
      setError(err.message || "Réservation introuvable.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    border: "none", outline: "none", width: "100%", background: "transparent",
    fontSize: "0.95rem", color: "var(--text-main)",
  } as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,25,18,0.55)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 16,
          }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label="Gérer ma réservation"
            initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{ width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", padding: 24, borderRadius: 20, background: "#fff" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontSize: "1.3rem", color: "var(--primary)", margin: 0 }}>Gérer ma réservation</h2>
              <button onClick={onClose} aria-label="Fermer" style={{ padding: 6, cursor: "pointer" }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
              Retrouvez votre réservation avec votre référence et le téléphone utilisé lors de la réservation.
            </p>

            {!booking && (
              <form onSubmit={search} style={{ display: "grid", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Référence
                  <div className="input-wrapper">
                    <Hash size={16} color="var(--primary)" />
                    <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="RTM-XXXXXX" required style={fieldStyle} />
                  </div>
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Téléphone
                  <div className="input-wrapper">
                    <Phone size={16} color="var(--primary)" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" required style={fieldStyle} />
                  </div>
                </label>
                {error && (
                  <div style={{ color: "#B91C1C", fontSize: "0.82rem", display: "flex", gap: 6 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                  </div>
                )}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <Loader2 size={16} className="spin-icon" /> : (<><Search size={16} /> Rechercher</>)}
                </button>
              </form>
            )}

            {booking && (
              <div style={{ display: "grid", gap: 12 }}>
                {booking.status === "cancelled" && (
                  <div style={{ display: "flex", gap: 8, color: "#047857", fontSize: "0.85rem", fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> Réservation annulée. Le créneau est de nouveau disponible.
                  </div>
                )}
                <BookingCard booking={booking} phone={phone} onChanged={setBooking} />
                <button onClick={() => setBooking(null)} style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>
                  ← Nouvelle recherche
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Drawer: "Espace Joueur" (logged-in player) ──────────────────────────────

export function AccountDrawer({
  open,
  onClose,
  userEmail,
  userName,
  onSignOut,
  onLoginRequest,
}: {
  open: boolean;
  onClose: () => void;
  userEmail: string | null;
  userName: string;
  onSignOut: () => void;
  onLoginRequest: () => void;
}) {
  const [bookings, setBookings] = useState<ManagedBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manage/mine", { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de charger vos réservations.");
      setBookings(data.bookings);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && userEmail) load();
  }, [open, userEmail, load]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const upcoming = bookings
    .filter((b) => b.status !== "cancelled" && b.booking_date >= todayStr)
    .sort((a, b) => (a.booking_date + a.time_slot).localeCompare(b.booking_date + b.time_slot));
  const history = bookings.filter((b) => b.status === "cancelled" || b.booking_date < todayStr);
  const list = tab === "upcoming" ? upcoming : history;

  const replace = (updated: ManagedBooking) =>
    setBookings((prev) => prev.map((b) => (b.booking_ref === updated.booking_ref ? updated : b)));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,25,18,0.45)", backdropFilter: "blur(3px)" }}
        >
          <motion.aside
            role="dialog" aria-modal="true" aria-label="Espace joueur"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 430,
              background: "#fff", boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", padding: 22,
              overflowY: "auto", display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", color: "var(--primary)", margin: 0 }}>Espace Joueur</h2>
                {userEmail && (
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                    {userName || userEmail}
                    {userName ? ` · ${userEmail}` : ""}
                  </p>
                )}
              </div>
              <button onClick={onClose} aria-label="Fermer" style={{ padding: 6, cursor: "pointer" }}><X size={20} /></button>
            </div>

            {!userEmail ? (
              <div style={{ textAlign: "center", padding: "32px 8px", display: "grid", gap: 14 }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
                  Connectez-vous pour retrouver toutes vos réservations et les annuler en un clic.
                </p>
                <button className="btn-primary" onClick={() => { onClose(); onLoginRequest(); }}>Se connecter</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6, background: "rgba(15,81,50,0.07)", padding: 4, borderRadius: 12 }}>
                  {([["upcoming", `À venir (${upcoming.length})`], ["history", `Historique (${history.length})`]] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      style={{
                        flex: 1, padding: "8px 10px", borderRadius: 9, fontSize: "0.84rem", fontWeight: 700, cursor: "pointer",
                        background: tab === key ? "#fff" : "transparent",
                        color: tab === key ? "var(--primary)" : "var(--text-muted)",
                        boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {loading && (
                  <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                    <Loader2 className="spin-icon" color="var(--primary)" />
                  </div>
                )}
                {error && (
                  <div style={{ color: "#B91C1C", fontSize: "0.85rem", display: "flex", gap: 6 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                  </div>
                )}
                {!loading && !error && list.length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", padding: "24px 0" }}>
                    {tab === "upcoming" ? "Aucune réservation à venir." : "Aucune réservation passée ou annulée."}
                  </p>
                )}

                <div style={{ display: "grid", gap: 12 }}>
                  {list.map((b) => (
                    <BookingCard key={b.booking_ref} booking={b} onChanged={replace} />
                  ))}
                </div>

                <button
                  onClick={() => { onSignOut(); onClose(); }}
                  style={{
                    marginTop: "auto", display: "flex", gap: 8, alignItems: "center", justifyContent: "center",
                    padding: "10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
                    fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", cursor: "pointer",
                  }}
                >
                  <LogOut size={15} /> Se déconnecter
                </button>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
