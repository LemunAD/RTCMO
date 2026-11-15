import { useState, useEffect, useCallback } from "react";
import { Activity, AlertCircle, CalendarDays, Clock, DollarSign, Loader2, TrendingUp, MapPin, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { COURTS } from "@/features/booking/constants";
import type { Stats } from "../types";

const COURT_NAMES: Record<number, string> = Object.fromEntries(COURTS.map(c => [c.id, c.name]));

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

export function DashboardView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchStats(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchStats]);

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
