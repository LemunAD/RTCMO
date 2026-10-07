"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Supabase parses the recovery token from the URL and emits PASSWORD_RECOVERY.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Impossible de mettre à jour le mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    border: "none", outline: "none", width: "100%", background: "transparent",
    fontSize: "0.95rem", color: "var(--text-main)",
  } as const;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-3)" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="glass-panel" style={{ width: "100%", maxWidth: "420px", padding: "var(--space-5)" }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
          <Image src="/logo_nobg.png" alt="RTCMO" width={56} height={56} style={{ objectFit: "contain", margin: "0 auto" }} />
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: "var(--space-2)" }}>Nouveau mot de passe</h1>
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <CheckCircle2 size={48} style={{ color: "var(--primary)", margin: "0 auto var(--space-2)" }} />
            <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
              Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.
            </p>
            <Link href="/" className="btn-primary" style={{ display: "inline-flex", justifyContent: "center", textDecoration: "none" }}>
              Retour à la réservation
            </Link>
          </div>
        ) : !checked ? (
          <div style={{ textAlign: "center" }}>
            <Loader2 size={28} className="spin-icon" style={{ color: "var(--primary)" }} />
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
              Ce lien est invalide ou a expiré. Veuillez refaire une demande de réinitialisation.
            </p>
            <Link href="/" className="btn-primary" style={{ display: "inline-flex", justifyContent: "center", textDecoration: "none" }}>
              Retour à l'accueil
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className="input-wrapper">
              <Lock size={18} style={{ color: "var(--primary)" }} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe" required autoFocus style={inputStyle} />
            </div>
            <div className="input-wrapper">
              <Lock size={18} style={{ color: "var(--primary)" }} />
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmer le mot de passe" required style={inputStyle} />
            </div>
            {error && (
              <div className="error-toast">
                <AlertCircle size={16} /> <span style={{ flex: 1 }}>{error}</span>
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={loading || !password || !confirm}
              style={{ width: "100%", justifyContent: "center" }}>
              {loading ? <Loader2 size={16} className="spin-icon" /> : "Mettre à jour le mot de passe"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
