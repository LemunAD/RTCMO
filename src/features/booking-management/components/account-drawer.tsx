import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { authHeaders } from "../auth-headers";
import type { ManagedBooking } from "../types";
import { BookingCard } from "./booking-card";

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger vos réservations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !userEmail) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
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
