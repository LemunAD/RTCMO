import type { Metadata } from "next";
import Link from "next/link";
import { CHAABI_ORDER_PATTERN } from "@/features/payments/chaabi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Suivi du paiement — RTCMO",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function readCheckout(orderId: string) {
  const { data, error } = await supabaseAdmin.from("bookings")
    .select("booking_ref, status, payment_expires_at, payment_transaction_id, payment_resolution")
    .eq("payment_order_id", orderId)
    .maybeSingle();
  return { data, error, expired: data ? Date.parse(data.payment_expires_at) <= Date.now() : false };
}

export default async function PaymentResult({ searchParams }: PageProps<"/payment/result">) {
  const { order } = await searchParams;
  const orderId = typeof order === "string" && CHAABI_ORDER_PATTERN.test(order) ? order : null;

  let title = "Réservation introuvable";
  let message = "Retrouvez vos réservations dans votre Espace Joueur.";
  let reference: string | undefined;
  let canRefresh = false;

  if (orderId) {
    const { data, error, expired } = await readCheckout(orderId);

    if (error) {
      title = "Vérification indisponible";
      message = "Actualisez cette page dans un instant. Évitez de relancer le paiement pendant la vérification.";
      canRefresh = true;
    } else if (data?.status === "paid" && data.payment_resolution === "captured") {
      title = "Réservation confirmée";
      message = "Votre paiement a été confirmé. Conservez votre référence de réservation.";
      reference = data.booking_ref;
    } else if (data?.status === "cancelled" || (expired && !data?.payment_transaction_id)) {
      title = "Réservation expirée ou annulée";
      message = "Le créneau n’est plus retenu. Si votre banque affiche une opération, contactez le club avant de payer à nouveau.";
    } else if (data?.payment_transaction_id) {
      title = "Paiement autorisé";
      message = "Votre créneau est retenu pendant que le club vérifie l’encaissement. Ne relancez pas le paiement.";
      reference = data.booking_ref;
      canRefresh = true;
    } else if (data) {
      title = "Paiement en attente";
      message = "La banque n’a pas encore confirmé l’autorisation. Actualisez cette page dans un instant.";
      canRefresh = true;
    }
  }

  return (
    <main style={{ width: "min(100% - 2rem, 38rem)", margin: "4rem auto", padding: "2rem" }} className="glass-panel">
      <h1>{title}</h1>
      <p>{message}</p>
      {reference && <p className="booking-ref-badge">Réf. <strong>{reference}</strong></p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1.5rem" }}>
        {canRefresh && <a className="btn-primary" href={`/payment/result?order=${orderId}`}>Actualiser</a>}
        <Link className="btn-back" href="/">Retour aux réservations</Link>
      </div>
    </main>
  );
}
