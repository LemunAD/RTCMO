"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Loader2,
  AlertCircle,
  CalendarDays,
  TrendingUp,
  Wallet,
  ListChecks,
} from "lucide-react";
import { COURTS, BOOKING_STATUSES, DATE_FORMAT, type BookingStatus } from "@/lib/constants";

interface Booking {
  id: number;
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  other_players: string[];
  status: BookingStatus;
  total_price: number;
  full_name: string;
  phone: string;
  email: string;
  booking_ref: string;
  created_at: string;
}

interface Stats {
  month: string;
  totalBookings: number;
  paidCount: number;
  pendingCount: number;
  cancelledCount: number;
  revenue: number;
  byCourt: { court_id: number; court_name: string; count: number }[];
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "En attente",
  paid: "Payée",
  cancelled: "Annulée",
};

function courtName(courtId: number): string {
  return COURTS.find((c) => c.id === courtId)?.name ?? `Terrain ${courtId}`;
}

function formatDate(dateStr: string): string {
  return format(new Date(`${dateStr}T00:00:00`), "d MMM yyyy", { locale: fr });
}

function BookingsTable({
  bookings,
  onStatusChange,
  updatingId,
}: {
  bookings: Booking[];
  onStatusChange: (id: number, status: BookingStatus) => void;
  updatingId: number | null;
}) {
  if (bookings.length === 0) {
    return <div className="admin-empty">Aucune réservation trouvée pour ces filtres.</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Date</th>
            <th>Horaire</th>
            <th>Terrain</th>
            <th>Client</th>
            <th>Autres joueurs</th>
            <th>Contact</th>
            <th>Prix</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.booking_ref}</td>
              <td>{formatDate(b.booking_date)}</td>
              <td>{b.time_slot}</td>
              <td>{courtName(b.court_id)}</td>
              <td>{b.full_name} <span style={{ color: "var(--text-muted)" }}>({b.player_count})</span></td>
              <td>
                {b.other_players.length > 0 ? (
                  <div className="player-badges">
                    {b.other_players.map((name, i) => (
                      <span key={i} className="player-badge">{name}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </td>
              <td>
                <div style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem" }}>
                  <span>{b.phone}</span>
                  <span style={{ color: "var(--text-muted)" }}>{b.email}</span>
                </div>
              </td>
              <td>{b.total_price} MAD</td>
              <td>
                <select
                  value={b.status}
                  disabled={updatingId === b.id}
                  onChange={(e) => onStatusChange(b.id, e.target.value as BookingStatus)}
                  className={`status-select ${b.status}`}
                >
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [dateFilter, setDateFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [statsMonth, setStatsMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      if (courtFilter) params.set("court_id", courtFilter);
      if (statusFilter) params.set("status", statusFilter);
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
  }, [dateFilter, courtFilter, statusFilter, search]);

  const fetchStats = useCallback(async (month: string) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch(`/api/admin/stats?month=${month}`);
      if (res.status === 401) return;
      const data = await res.json();
      if (!res.ok) {
        setStatsError(data.error || "Impossible de charger les statistiques.");
      } else {
        setStats(data);
      }
    } catch {
      setStatsError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats(statsMonth);
  }, [authenticated, statsMonth, fetchStats]);

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
    setStats(null);
  };

  const handleStatusChange = async (id: number, status: BookingStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
        fetchStats(statsMonth);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const todayStr = format(new Date(), DATE_FORMAT);

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.booking_date >= todayStr)
        .sort((a, b) =>
          a.booking_date === b.booking_date
            ? a.time_slot.localeCompare(b.time_slot)
            : a.booking_date.localeCompare(b.booking_date)
        ),
    [bookings, todayStr]
  );

  const pastBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.booking_date < todayStr)
        .sort((a, b) => b.booking_date.localeCompare(a.booking_date)),
    [bookings, todayStr]
  );

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

  const maxCourtCount = Math.max(1, ...(stats?.byCourt.map((c) => c.count) ?? [1]));

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
        {/* ── Stats dashboard ── */}
        <div className="glass-panel" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <h2 style={{ fontSize: "1.1rem" }}>Vue d&apos;ensemble</h2>
            <input
              type="month"
              value={statsMonth}
              onChange={(e) => setStatsMonth(e.target.value)}
              className="input-wrapper"
              style={{ border: "1.5px solid var(--border)", fontSize: "0.85rem" }}
            />
          </div>

          {statsError && (
            <div className="error-toast" style={{ marginBottom: "var(--space-3)" }}>
              <AlertCircle size={16} />
              <span style={{ flex: 1 }}>{statsError}</span>
            </div>
          )}

          {statsLoading && !stats ? (
            <Loader2 size={20} className="spin-icon" style={{ color: "var(--primary)" }} />
          ) : stats ? (
            <>
              <div className="stat-cards">
                <div className="stat-card">
                  <span className="stat-label"><ListChecks size={13} /> Réservations</span>
                  <span className="stat-value">{stats.totalBookings}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {stats.paidCount} payée{stats.paidCount !== 1 ? "s" : ""} · {stats.pendingCount} en attente
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label"><Wallet size={13} /> Revenu</span>
                  <span className="stat-value">{stats.revenue} MAD</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Réservations payées uniquement</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label"><TrendingUp size={13} /> Annulées</span>
                  <span className="stat-value">{stats.cancelledCount}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ce mois-ci</span>
                </div>
              </div>

              <p className="section-label" style={{ marginTop: "var(--space-4)" }}>Réservations par terrain</p>
              <div className="court-breakdown">
                {stats.byCourt.map((c) => (
                  <div key={c.court_id} className="court-breakdown-row">
                    <span style={{ minWidth: "160px" }}>{c.court_name}</span>
                    <div className="court-breakdown-bar">
                      <div
                        className="court-breakdown-fill"
                        style={{ width: `${(c.count / maxCourtCount) * 100}%` }}
                      />
                    </div>
                    <span style={{ fontWeight: 700, minWidth: "24px", textAlign: "right" }}>{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* ── Filters + lists ── */}
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

            <div className="input-wrapper">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.9rem", width: "100%" }}
              >
                <option value="">Tous les statuts</option>
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
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

          <h3 className="section-heading">
            Réservations à venir ({upcomingBookings.length})
          </h3>
          <BookingsTable bookings={upcomingBookings} onStatusChange={handleStatusChange} updatingId={updatingId} />

          <h3 className="section-heading">
            Réservations passées ({pastBookings.length})
          </h3>
          <BookingsTable bookings={pastBookings} onStatusChange={handleStatusChange} updatingId={updatingId} />
        </div>
      </main>
    </div>
  );
}
