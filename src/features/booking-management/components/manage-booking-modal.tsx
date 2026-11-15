import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Phone, Hash, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ManagedBooking } from "../types";
import { BookingCard } from "./booking-card";

export function ManageBookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<ManagedBooking | null>(null);

  const close = () => {
    onClose();
    setBooking(null);
    setError(null);
    setRef("");
    setPhone("");
  };

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
    } catch (err) {
      setError((err instanceof Error && err.message) || "Réservation introuvable.");
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
          onClick={close}
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
              <button onClick={close} aria-label="Fermer" style={{ padding: 6, cursor: "pointer" }}><X size={20} /></button>
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
