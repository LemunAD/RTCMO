import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) { onLogin(); }
      else { setError(data.error || "Mot de passe incorrect."); }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-login-wrapper">
      <motion.form
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit} className="admin-login-card glass-panel"
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
          <div className="success-icon" style={{ background: "var(--primary)", margin: "0 auto var(--space-3)" }}>
            <Lock size={24} />
          </div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Administration RTCMO</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>Panneau de gestion des réservations</p>
        </div>

        <div className="input-wrapper" style={{ marginBottom: "var(--space-3)" }}>
          <Lock size={18} style={{ color: "var(--primary)" }} />
          <input type={showPwd ? "text" : "password"} value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Mot de passe administrateur"
            autoFocus required
            style={{ border: "none", outline: "none", width: "100%", background: "transparent", fontSize: "0.95rem", color: "var(--text-main)" }} />
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            style={{ color: "var(--text-muted)", padding: "4px", background: "none", border: "none", cursor: "pointer" }}>
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="error-toast" style={{ marginBottom: "var(--space-3)" }}>
              <AlertCircle size={16} /> <span style={{ flex: 1 }}>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button type="submit" className="btn-primary" disabled={loading || !password}
          style={{ width: "100%", justifyContent: "center" }}>
          {loading ? <Loader2 size={16} className="spin-icon" /> : "Se connecter"}
        </button>
      </motion.form>
    </div>
  );
}
