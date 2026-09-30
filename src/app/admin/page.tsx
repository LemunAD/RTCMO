"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CalendarDays, Search, LogOut, Lock, Eye, EyeOff,
  TrendingUp, Users, DollarSign, MapPin, Clock, ChevronLeft, ChevronRight,
  Trash2, Pencil, X, Check, Loader2, AlertCircle, RefreshCw, Activity,
  ArrowUpRight, Hash,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { COURTS } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

type BookingStatus = "pending" | "paid" | "cancelled";

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
  status: BookingStatus;
  created_at: string;
  other_players?: string[];
}

interface Stats {
  overview: {
    todayBookings: number; todayRevenue: number;
    weekBookings: number;  weekRevenue: number;
    monthBookings: number; monthRevenue: number;
    totalBookings: number; totalRevenue: number;
    upcomingBookings: number;
  };
  courtUtilization: Record<number, number>;
  todaySchedule: Booking[];
  recentActivity: Booking[];
}

interface BookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COURT_NAMES: Record<number, string> = Object.fromEntries(COURTS.map(c => [c.id, c.name]));
const COURT_LABELS: Record<number, string> = Object.fromEntries(COURTS.map(c => [c.id, `${c.name} — ${c.tag}`]));
const COURT_TYPES: Record<number, string> = Object.fromEntries(COURTS.map(c => [c.id, c.type]));

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "En attente", paid: "Payé", cancelled: "Annulé",
};
const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "#F59E0B", paid: "#10B981", cancelled: "#EF4444",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status, bookingId, onStatusChange }: {
  status: BookingStatus; bookingId: number;
  onStatusChange: (id: number, s: BookingStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleChange = async (newStatus: BookingStatus) => {
    if (newStatus === status) { setOpen(false); return; }
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) onStatusChange(bookingId, newStatus);
    } finally { setUpdating(false); setOpen(false); }
  };

  const bg = STATUS_COLORS[status] + "18";
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={updating}
        className="admin-status-badge"
        style={{ background: bg, color: STATUS_COLORS[status], borderColor: STATUS_COLORS[status] + "40" }}
      >
        {updating ? <Loader2 size={12} className="spin-icon" /> : STATUS_LABELS[status]}
      </button>
      {open && (
        <div className="admin-status-dropdown">
          {(["pending", "paid", "cancelled"] as BookingStatus[]).map(s => (
            <button key={s} onClick={() => handleChange(s)} className="admin-status-option"
              style={{ color: STATUS_COLORS[s], fontWeight: s === status ? 700 : 400 }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon" style={{ background: color + "15", color }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Dashboard View ──────────────────────────────────────────────────────────

function DashboardView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6)" }}>
      <Loader2 size={28} className="spin-icon" style={{ color: "var(--primary)" }} />
    </div>
  );

  if (!stats) return (
    <div className="admin-empty-state">
      <AlertCircle size={24} /> Impossible de charger les statistiques.
      <button onClick={fetchStats} className="btn-accent" style={{ marginTop: "12px" }}>Réessayer</button>
    </div>
  );

  const o = stats.overview;
  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {/* Stat cards */}
      <div className="admin-stats-grid">
        <StatCard icon={<CalendarDays size={20} />} label="Aujourd'hui" value={o.todayBookings}
          sub={`${o.todayRevenue} MAD`} color="#0F5132" />
        <StatCard icon={<TrendingUp size={20} />} label="Cette Semaine" value={o.weekBookings}
          sub={`${o.weekRevenue} MAD`} color="#2563EB" />
        <StatCard icon={<Activity size={20} />} label="Ce Mois" value={o.monthBookings}
          sub={`${o.monthRevenue} MAD`} color="#7C3AED" />
        <StatCard icon={<DollarSign size={20} />} label="Revenu Total" value={`${o.totalRevenue} MAD`}
          sub={`${o.totalBookings} réservations`} color="#DC2626" />
      </div>

      <div className="admin-dashboard-grid">
        {/* Today's schedule */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <Clock size={16} /> Programme du Jour
            <span className="admin-panel-count">{stats.todaySchedule.length}</span>
          </div>
          <div className="admin-panel-body">
            {stats.todaySchedule.length === 0 ? (
              <div className="admin-empty-state">Aucune réservation aujourd&apos;hui</div>
            ) : stats.todaySchedule.map(b => (
              <div key={b.id} className="admin-schedule-item">
                <span className="admin-badge-time">{b.time_slot}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{b.full_name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {COURT_NAMES[b.court_id]} · {b.player_count} joueurs
                  </div>
                </div>
                <span className="admin-badge-price">{b.total_price} MAD</span>
              </div>
            ))}
          </div>
        </div>

        {/* Court utilization */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <MapPin size={16} /> Utilisation des Terrains
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "auto" }}>aujourd&apos;hui</span>
          </div>
          <div className="admin-panel-body">
            {COURTS.map(c => {
              const count = stats.courtUtilization[c.id] || 0;
              const pct = Math.round((count / 10) * 100);
              return (
                <div key={c.id} className="admin-util-row">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>{count}/10 créneaux</span>
                  </div>
                  <div className="admin-util-bar">
                    <div className="admin-util-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="admin-panel-card">
        <div className="admin-panel-header">
          <ArrowUpRight size={16} /> Activité Récente
        </div>
        <div className="admin-panel-body">
          {stats.recentActivity.length === 0 ? (
            <div className="admin-empty-state">Aucune activité récente</div>
          ) : stats.recentActivity.map(b => (
            <div key={b.id} className="admin-schedule-item">
              <span className="admin-badge-ref">{b.booking_ref}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{b.full_name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {COURT_NAMES[b.court_id]} · {format(new Date(`${b.booking_date}T00:00:00`), "d MMM", { locale: fr })} à {b.time_slot}
                </div>
              </div>
              <span className="admin-badge-price">{b.total_price} MAD</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bookings View ───────────────────────────────────────────────────────────

function BookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Booking>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (dateFilter) p.set("date", dateFilter);
      if (courtFilter) p.set("court_id", courtFilter);
      if (statusFilter) p.set("status", statusFilter);
      if (searchTerm.trim()) p.set("search", searchTerm.trim());
      p.set("page", String(page));
      p.set("pageSize", "15");
      const res = await fetch(`/api/admin/bookings?${p}`);
      if (res.ok) {
        const data: BookingsResponse = await res.json();
        setBookings(data.bookings);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally { setLoading(false); }
  }, [dateFilter, courtFilter, statusFilter, searchTerm, page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleStatusChange = (id: number, newStatus: BookingStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== id));
        setTotal(prev => prev - 1);
      }
    } finally { setConfirmDeleteId(null); }
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, ...editData } : b));
      }
    } finally { setEditingId(null); setEditData({}); }
  };

  const startEdit = (b: Booking) => {
    setEditingId(b.id);
    setEditData({ full_name: b.full_name, phone: b.phone, email: b.email, player_count: b.player_count });
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <CalendarDays size={16} style={{ color: "var(--primary)" }} />
          <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }}
            className="admin-filter-input" />
        </div>
        <div className="admin-filter-group">
          <MapPin size={16} style={{ color: "var(--primary)" }} />
          <select value={courtFilter} onChange={e => { setCourtFilter(e.target.value); setPage(1); }}
            className="admin-filter-input">
            <option value="">Tous les terrains</option>
            {COURTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="admin-filter-group">
          <Activity size={16} style={{ color: "var(--primary)" }} />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="admin-filter-input">
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="paid">Payé</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
        <div className="admin-filter-group" style={{ flex: 1, minWidth: "180px" }}>
          <Search size={16} style={{ color: "var(--primary)" }} />
          <input type="text" value={searchTerm} placeholder="Rechercher par nom, tél, email, réf..."
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="admin-filter-input" style={{ width: "100%" }} />
        </div>
        <button onClick={() => { setDateFilter(""); setCourtFilter(""); setStatusFilter(""); setSearchTerm(""); setPage(1); }}
          className="btn-back" style={{ padding: "8px 12px", fontSize: "0.8rem" }}>
          <X size={14} /> Réinitialiser
        </button>
      </div>

      {/* Results count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {total} réservation{total !== 1 ? "s" : ""} trouvée{total !== 1 ? "s" : ""}
        </span>
        <button onClick={fetchBookings} className="btn-accent" style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}>
          {loading ? <Loader2 size={14} className="spin-icon" /> : <RefreshCw size={14} />} Actualiser
        </button>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th><Hash size={12} /> Réf</th>
              <th><CalendarDays size={12} /> Date</th>
              <th><Clock size={12} /> Horaire</th>
              <th><MapPin size={12} /> Terrain</th>
              <th><Users size={12} /> Joueurs</th>
              <th>Client</th>
              <th>Contact</th>
              <th><DollarSign size={12} /> Prix</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id}>
                <td><span className="admin-badge-ref">{b.booking_ref}</span></td>
                <td>{format(new Date(`${b.booking_date}T00:00:00`), "d MMM yyyy", { locale: fr })}</td>
                <td><span className="admin-badge-time">{b.time_slot}</span></td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{COURT_NAMES[b.court_id]}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{COURT_TYPES[b.court_id]}</span>
                  </div>
                </td>
                <td>
                  {editingId === b.id ? (
                    <select value={editData.player_count ?? b.player_count}
                      onChange={e => setEditData({ ...editData, player_count: Number(e.target.value) })}
                      className="admin-inline-input" style={{ width: "60px" }}>
                      <option value={2}>2</option>
                      <option value={4}>4</option>
                    </select>
                  ) : b.player_count}
                </td>
                <td>
                  {editingId === b.id ? (
                    <input type="text" value={editData.full_name ?? b.full_name}
                      onChange={e => setEditData({ ...editData, full_name: e.target.value })}
                      className="admin-inline-input" />
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{b.full_name}</div>
                      {b.other_players && b.other_players.length > 0 && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          +{b.other_players.length}: {b.other_players.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  {editingId === b.id ? (
                    <div style={{ display: "grid", gap: "4px" }}>
                      <input type="text" value={editData.phone ?? b.phone}
                        onChange={e => setEditData({ ...editData, phone: e.target.value })}
                        className="admin-inline-input" placeholder="Téléphone" />
                      <input type="text" value={editData.email ?? b.email}
                        onChange={e => setEditData({ ...editData, email: e.target.value })}
                        className="admin-inline-input" placeholder="Email" />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem" }}>
                      <span>{b.phone}</span>
                      <span style={{ color: "var(--text-muted)" }}>{b.email}</span>
                    </div>
                  )}
                </td>
                <td><span className="admin-badge-price">{b.total_price} MAD</span></td>
                <td>
                  <StatusBadge status={b.status ?? "pending"} bookingId={b.id} onStatusChange={handleStatusChange} />
                </td>
                <td>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {editingId === b.id ? (
                      <>
                        <button onClick={() => handleSaveEdit(b.id)} className="admin-action-btn save" title="Sauvegarder">
                          <Check size={14} />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditData({}); }} className="admin-action-btn cancel" title="Annuler">
                          <X size={14} />
                        </button>
                      </>
                    ) : confirmDeleteId === b.id ? (
                      <>
                        <button onClick={() => handleDelete(b.id)} className="admin-action-btn delete" title="Confirmer">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="admin-action-btn cancel" title="Annuler">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(b)} className="admin-action-btn edit" title="Modifier">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDeleteId(b.id)} className="admin-action-btn delete" title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && bookings.length === 0 && (
          <div className="admin-empty-state">Aucune réservation trouvée pour ces filtres.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="admin-page-btn"><ChevronLeft size={16} /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .map((p, i, arr) => (
              <span key={p}>
                {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: "var(--text-muted)" }}>…</span>}
                <button onClick={() => setPage(p)}
                  className={`admin-page-btn ${page === p ? "active" : ""}`}>{p}</button>
              </span>
            ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="admin-page-btn"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

// ─── Login Screen ────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
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

// ─── Main Admin Page ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "bookings">("dashboard");

  // Check auth on mount by trying a protected endpoint
  useEffect(() => {
    fetch("/api/admin/stats").then(res => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthenticated(res.ok);
    }).catch(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthenticated(false);
    });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
  };

  if (authenticated === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
        <Loader2 size={28} className="spin-icon" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  const tabs = [
    { id: "dashboard" as const, label: "Tableau de bord", icon: <LayoutDashboard size={18} /> },
    { id: "bookings" as const, label: "Réservations", icon: <CalendarDays size={18} /> },
  ];

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Image src="/logo_nobg.png" alt="RTCMO" width={36} height={36} style={{ objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--primary)", lineHeight: 1.2 }}>RTCMO</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Admin Panel</div>
          </div>
        </div>
        <nav className="admin-nav">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`admin-nav-item ${activeTab === t.id ? "active" : ""}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: "var(--space-3)" }}>
          <button onClick={handleLogout} className="admin-nav-item" style={{ color: "#DC2626", width: "100%" }}>
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        {/* Mobile topbar */}
        <header className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Image src="/logo_nobg.png" alt="RTCMO" width={28} height={28} style={{ objectFit: "contain" }} />
            <span style={{ fontWeight: 800, color: "var(--primary)" }}>RTCMO</span>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`admin-topbar-tab ${activeTab === t.id ? "active" : ""}`}>
                {t.icon}
              </button>
            ))}
            <button onClick={handleLogout} className="admin-topbar-tab" style={{ color: "#DC2626" }}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="admin-content">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "var(--space-4)", color: "var(--text-main)" }}>
            {activeTab === "dashboard" ? "Tableau de Bord" : "Gestion des Réservations"}
          </h1>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}>
              {activeTab === "dashboard" ? <DashboardView /> : <BookingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
