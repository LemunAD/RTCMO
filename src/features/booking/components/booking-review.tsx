import Link from "next/link";
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function BookingReview({
  courtName, date, time, playerCount, player, totalPrice, onlinePayment, isBooking, onBack, onConfirm,
}: {
  courtName: string;
  date: Date;
  time: string | null;
  playerCount: number;
  player: { fullName: string; phone: string; email: string };
  totalPrice: number;
  onlinePayment: boolean;
  isBooking: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <h2 className="step-title" style={{ fontSize: "1.5rem" }}>
        <CheckCircle2 size={24} style={{ color: "var(--primary)" }} />
        Récapitulatif
      </h2>

      <div className="review-card">
        <div className="review-card-header">
          <span style={{ fontWeight: 700 }}>RTCMO — Réservation de Terrain</span>
          <span style={{ fontSize: "0.85rem", opacity: 0.85 }}>Padel</span>
        </div>

        <div style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
          {[
            ["Terrain",   courtName],
            ["Date",    format(date, "EEEE d MMMM yyyy", { locale: fr })],
            ["Horaire",    `${time} (session de 1h30)`],
            ["Format", `${playerCount} personnes (${playerCount === 2 ? "Simple" : "Double"})`],
            ["Réservé par",    player.fullName],
            ["Téléphone",   player.phone],
            ["E-mail",   player.email],
          ].map(([label, value]) => (
            <div key={label} className="review-row">
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: 600, textAlign: "right", fontSize: "0.9rem" }}>{value}</span>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-1)" }}>
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Total à Payer</span>
            <span style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--primary)" }}>
              {totalPrice} MAD
            </span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
        {onlinePayment
          ? "Vous allez être redirigé vers la page de paiement sécurisée de Chaabi Payment. Le créneau est retenu pendant 15 minutes."
          : "Le paiement s’effectue à l’accueil du club."}
      </p>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "calc(-1 * var(--space-4))", marginBottom: "var(--space-5)" }}>
        {onlinePayment
          ? "Pour annuler une réservation payée, contactez le club. "
          : "La réservation non payée peut être annulée en ligne avant le début du créneau. "}
        En confirmant, vous acceptez les <Link href="/cgu" target="_blank" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "underline" }}>Conditions Générales d&apos;Utilisation</Link>.
      </p>

      <div className="step-actions">
        <button onClick={onBack} disabled={isBooking} className="btn-back">
          <ChevronLeft size={16} /> Retour
        </button>
        <button
          onClick={onConfirm}
          className="btn-primary"
          disabled={isBooking}
          style={{ minWidth: "180px" }}
        >
          {isBooking
            ? <span style={{ display: "flex", gap: "8px" }}><Loader2 size={16} className="spin-icon" /> En cours…</span>
            : onlinePayment ? "Payer en ligne" : "Confirmer la Réservation"}
        </button>
      </div>
    </>
  );
}
