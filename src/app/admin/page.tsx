"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  Loader2,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { COURTS } from "@/lib/constants";

interface Booking {
  id: number;
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  total_price: number;
  full_name: string;
  phone: string;
  email: string;
  booking_ref: string;
  created_at: string;
}

function courtName(courtId: number): string {
  return COURTS.find((c) => c.id === courtId)?.name ?? `Terrain ${courtId}`;
}

export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [search, setSearch] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      if (courtFilter) params.set("court_id", courtFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/bookings?${params.toString()}`);

      if (res.status === 401) {
        setAuthenticated(false);
        setAuthChecked(true);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de charger les réservations.");
      } else {
        setBookings(data.bookings);
      }
      setAuthenticated(true);
      setAuthChecked(true);
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      setAuthChecked(true);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, courtFilter, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Connexion impossible.");
        return;
      }
      setPassword("");
      setAuthenticated(true);
      fetchBookings();
    } catch {
      setLoginError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setBookings([]);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} className="spin-icon" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", padding: "var(--space-3)" }}>
        <form onSubmit={handleLogin} className="glass-panel login-card">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-3)" }}>
            <div className="success-icon" style={{ background: "var(--primary)" }}>
              <Lock size={24} />
            </div>
          </div>
          <h1 style={{ fontSize: "1.3rem", textAlign: "center", marginBottom: "var(--space-4)" }}>
            Administration RTCMO
          </h1>
          <div className="input-wrapper" style={{ marginBottom: "var(--space-3)" }}>
            <Lock size={18} style={{ color: "var(--primary)" }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe administrateur"
              autoFocus
              required
              style={{ border: "none", outline: "none", width: "100%", background: "transparent", fontSize: "0.95rem" }}
            />
          </div>
          {loginError && (
            <div className="error-toast" style={{ marginBottom: "var(--space-3)" }}>
              <AlertCircle size={16} />
              <span style={{ flex: 1 }}>{loginError}</span>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loggingIn} style={{ width: "100%" }}>
            {loggingIn ? <Loader2 size={16} className="spin-icon" /> : "Se connecter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <header className="booking-header">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--primary)" }}>
            RTCMO — Réservations
          </div>
          <button onClick={handleLogout} className="btn-back" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </header>

      <main className="container" style={{ padding: "var(--space-5) var(--space-3)" }}>
        <div className="glass-panel" style={{ padding: "var(--space-4)" }}>
          <div className="admin-toolbar">
            <div className="input-wrapper">
              <CalendarDays size={16} style={{ color: "var(--primary)" }} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.9rem" }}
              />
            </div>

            <div className="input-wrapper">
              <select
                value={courtFilter}
                onChange={(e) => setCourtFilter(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.9rem", width: "100%" }}
              >
                <option value="">Tous les terrains</option>
                {COURTS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="input-wrapper" style={{ flex: 1, minWidth: "180px" }}>
              <Search size={16} style={{ color: "var(--primary)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, téléphone, e-mail ou référence"
                style={{ border: "none", outline: "none", width: "100%", background: "transparent", fontSize: "0.9rem" }}
              />
            </div>

            <button onClick={fetchBookings} className="btn-accent" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {loading ? <Loader2 size={16} className="spin-icon" /> : <RefreshCw size={16} />}
              Filtrer
            </button>
          </div>

          {error && (
            <div className="error-toast" style={{ marginTop: "var(--space-3)" }}>
              <AlertCircle size={16} />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}

          <p style={{ margin: "var(--space-3) 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {bookings.length} réservation{bookings.length !== 1 ? "s" : ""}
          </p>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Horaire</th>
                  <th>Terrain</th>
                  <th>Joueurs</th>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Prix</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.booking_ref}</td>
                    <td>{format(new Date(`${b.booking_date}T00:00:00`), "d MMM yyyy", { locale: fr })}</td>
                    <td>{b.time_slot}</td>
                    <td>{courtName(b.court_id)}</td>
                    <td>{b.player_count}</td>
                    <td>{b.full_name}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem" }}>
                        <span>{b.phone}</span>
                        <span style={{ color: "var(--text-muted)" }}>{b.email}</span>
                      </div>
                    </td>
                    <td>{b.total_price} MAD</td>
                    <td>
                      {confirmDeleteId === b.id ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleDelete(b.id)}
                            disabled={deletingId === b.id}
                            className="btn-primary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          >
                            {deletingId === b.id ? <Loader2 size={12} className="spin-icon" /> : "Confirmer"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="btn-back"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(b.id)}
                          className="btn-back"
                          title="Annuler cette réservation"
                          style={{ color: "#B91C1C" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && bookings.length === 0 && (
              <div className="admin-empty">Aucune réservation trouvée pour ces filtres.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
