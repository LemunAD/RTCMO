import { useState, useEffect, useCallback } from "react";
import { Activity, DollarSign, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Hash, Loader2, MapPin, Pencil, RefreshCw, Search, Trash2, Users, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { COURTS } from "@/features/booking/constants";
import type { Booking, BookingsResponse, BookingStatus, PaymentResolution } from "../types";
import { StatusBadge } from "./status-badge";

const COURT_NAMES: Record<number, string> = Object.fromEntries(COURTS.map(c => [c.id, c.name]));
const COURT_TYPES: Record<number, string> = Object.fromEntries(COURTS.map(c => [c.id, c.type]));

export function BookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentConfigured, setPaymentConfigured] = useState(false);
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
        setPaymentConfigured(data.paymentConfigured);
      }
    } finally { setLoading(false); }
  }, [dateFilter, courtFilter, statusFilter, searchTerm, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchBookings(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchBookings]);

  const handleStatusChange = (id: number, newStatus: BookingStatus, resolution?: PaymentResolution) => {
    setBookings(prev => prev.map(b => b.id === id
      ? { ...b, status: newStatus, payment_resolution: resolution ?? b.payment_resolution }
      : b));
    if (resolution && statusFilter === "payment_review") void fetchBookings();
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== id));
        setTotal(prev => prev - 1);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Impossible de supprimer cette réservation.");
      }
    } catch {
      alert("Impossible de supprimer cette réservation : erreur réseau.");
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
            {paymentConfigured && <option value="payment_review">Paiements à rapprocher</option>}
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
                  <StatusBadge booking={b} onStatusChange={handleStatusChange} />
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
