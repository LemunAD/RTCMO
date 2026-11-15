"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, LayoutDashboard, Loader2, LogOut } from "lucide-react";
import Image from "next/image";
import { BookingsView } from "./bookings-view";
import { DashboardView } from "./dashboard-view";
import { LoginScreen } from "./login-screen";

export default function AdminApp() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "bookings">("dashboard");

  // Check auth on mount by trying a protected endpoint
  useEffect(() => {
    fetch("/api/admin/stats").then(res => {
      setAuthenticated(res.ok);
    }).catch(() => {
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
