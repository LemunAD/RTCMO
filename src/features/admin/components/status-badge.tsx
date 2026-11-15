import { useState } from "react";
import { Loader2 } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "../booking-status";
import type { Booking, BookingStatus, PaymentResolution } from "../types";

const PAYMENT_LABELS: Record<PaymentResolution, string> = {
  captured: "Capture vérifiée",
  refunded: "Remboursement vérifié",
  voided: "Autorisation annulée dans le portail",
};

export function StatusBadge({ booking, onStatusChange }: {
  booking: Booking;
  onStatusChange: (id: number, s: BookingStatus, resolution?: PaymentResolution) => void;
}) {
  const { id, payment_order_id: order, payment_transaction_id: transaction, payment_resolution: resolution } = booking;
  const status = booking.status ?? "pending";
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleChange = async (newStatus: BookingStatus, paymentResolution?: PaymentResolution) => {
    if (newStatus === status) { setOpen(false); return; }
    if (paymentResolution && !window.confirm(
      `Avez-vous vérifié dans Merchant Center : ${PAYMENT_LABELS[paymentResolution]} ?\nCommande : ${order}\nTransaction : ${transaction}\nMontant : ${booking.total_price} MAD`
    )) return;

    const body = paymentResolution ? {
      payment_order_id: order,
      payment_transaction_id: transaction,
      payment_resolution: paymentResolution,
    } : { status: newStatus };
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onStatusChange(id, newStatus, paymentResolution);
      else {
        const data = await res.json().catch(() => ({}));
        alert(`Impossible de changer le statut (${res.status}) : ${data.error ?? "erreur inconnue"}`);
      }
    } catch {
      alert("Impossible de changer le statut : erreur réseau.");
    } finally { setUpdating(false); setOpen(false); }
  };

  const canChange = !order || (status !== "cancelled" && (status === "pending" || transaction));
  const paymentActions: PaymentResolution[] = status === "pending"
    ? ["captured", "voided", "refunded"]
    : ["refunded"];
  const label = resolution && status === "cancelled" ? PAYMENT_LABELS[resolution]
    : status === "pending" && transaction ? "Autorisé · à rapprocher"
    : STATUS_LABELS[status];
  const bg = STATUS_COLORS[status] + "18";
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={updating || !canChange}
        className="admin-status-badge"
        style={{ background: bg, color: STATUS_COLORS[status], borderColor: STATUS_COLORS[status] + "40" }}
      >
        {updating ? <Loader2 size={12} className="spin-icon" /> : label}
      </button>
      {open && (
        <div className="admin-status-dropdown">
          {order && transaction ? paymentActions.map(action => (
            <button key={action} onClick={() => handleChange(action === "captured" ? "paid" : "cancelled", action)}
              className="admin-status-option">
              {PAYMENT_LABELS[action]}
            </button>
          )) : (order ? ["cancelled"] as const : ["pending", "paid", "cancelled"] as const).map(s => (
            <button key={s} onClick={() => handleChange(s)} className="admin-status-option"
              style={{ color: STATUS_COLORS[s], fontWeight: s === status ? 700 : 400 }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
      {order && (
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", overflowWrap: "anywhere" }}>
          <div>Commande Chaabi : {order}</div>
          {transaction && <div>Transaction : {transaction}</div>}
        </div>
      )}
    </div>
  );
}
