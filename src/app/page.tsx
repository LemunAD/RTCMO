"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  User,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Lock,
  CalendarDays,
  LayoutGrid
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfDay,
  isBefore,
  isAfter,
  isSameMonth,
  isSameDay,
  addMonths,
  getDaysInMonth,
  addWeeks
} from "date-fns";
import { fr } from "date-fns/locale";
import { COURTS, TIME_SLOTS } from "@/lib/constants";

// ─── Data ────────────────────────────────────────────────────────────────────

const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlayerInfo {
  fullName: string;
  phone: string;
  email: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "8px",
            borderRadius: "99px",
            width: current - 1 === i ? "24px" : "8px",
            backgroundColor: current - 1 >= i ? "var(--primary)" : "var(--border)",
            transition: "all 0.35s ease",
          }}
        />
      ))}
    </div>
  );
}

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "8px 14px",
        background: "rgba(15,81,50,0.07)",
        borderRadius: "var(--radius-md)",
        fontSize: "0.8rem",
        gap: "2px",
      }}
    >
      <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontWeight: "700", color: "var(--primary)" }}>{value}</span>
    </div>
  );
}

function InputField({
  icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: {
  icon: React.ReactNode;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-muted)" }}>
        {label} {required && <span style={{ color: "#e53e3e" }}>*</span>}
      </label>
      <div className="input-wrapper">
        <span style={{ color: "var(--primary)", flexShrink: 0 }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={{
            border: "none",
            outline: "none",
            width: "100%",
            background: "transparent",
            fontSize: "0.95rem",
            color: "var(--text-main)",
          }}
        />
      </div>
    </div>
  );
}

function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="error-toast"
    >
      <AlertCircle size={18} />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ color: "inherit", padding: "4px", fontSize: "1.1rem", lineHeight: 1 }}>×</button>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookingFlow() {
  const TOTAL_STEPS = 4;

  const [step, setStep]                 = useState(1);
  
  // Step 1 Auth state
  const [authMode, setAuthMode]         = useState<"member" | "guest" | null>(null);
  const [loginEmail, setLoginEmail]     = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn]   = useState(false);
  const [signUpPassword, setSignUpPassword] = useState("");
  const [isSigningUp, setIsSigningUp]   = useState(false);

  // Step 2 Court & Time state
  const [viewMode, setViewMode]         = useState<"classic" | "weekly">("classic");
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedDate, setSelectedDate]   = useState<Date>(() => startOfDay(new Date()));
  const [selectedTime, setSelectedTime]   = useState<string | null>(null);
  
  // Step 3 Players info
  const [playerCount, setPlayerCount]     = useState<2 | 4>(4);
  const [info, setInfo] = useState<PlayerInfo>({
    fullName: "", phone: "", email: "",
  });
  const [otherPlayers, setOtherPlayers]   = useState<string[]>(['', '', '']);
  
  // Submission
  const [isBooking, setIsBooking]         = useState(false);
  const [bookingRef, setBookingRef]       = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  // Availability state
  const [bookedSlots, setBookedSlots]     = useState<Set<string>>(new Set());
  const [weeklyBookedSlots, setWeeklyBookedSlots] = useState<Record<string, Set<string>>>({});
  const [loadingSlots, setLoadingSlots]   = useState(false);

  // Calendar navigation
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarWeek, setCalendarWeek]   = useState<Date>(() => startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 }));

  const today = startOfDay(new Date());

  const maxDate = useMemo(() => {
    const currentMonthEnd = endOfMonth(today);
    const daysInMonth = getDaysInMonth(today);
    const dayOfMonth = today.getDate();
    const isLastWeek = dayOfMonth > daysInMonth - 7;
    if (isLastWeek) {
      return endOfMonth(addMonths(today, 1));
    }
    return currentMonthEnd;
  }, [today]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarMonth]);

  const calendarWeekDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarWeek, end: endOfWeek(calendarWeek, { weekStartsOn: 1 }) });
  }, [calendarWeek]);

  const canGoPrevMonth = useMemo(() => {
    const prevMonth = addMonths(calendarMonth, -1);
    return !isBefore(endOfMonth(prevMonth), today);
  }, [calendarMonth, today]);

  const canGoNextMonth = useMemo(() => {
    return !isAfter(startOfMonth(addMonths(calendarMonth, 1)), maxDate);
  }, [calendarMonth, maxDate]);

  const canGoPrevWeek = useMemo(() => {
    const prevWeekEnd = endOfWeek(addWeeks(calendarWeek, -1), { weekStartsOn: 1 });
    return !isBefore(prevWeekEnd, today);
  }, [calendarWeek, today]);

  const canGoNextWeek = useMemo(() => {
    return !isAfter(startOfWeek(addWeeks(calendarWeek, 1), { weekStartsOn: 1 }), maxDate);
  }, [calendarWeek, maxDate]);

  // Pricing based on selected date
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const totalPrice = isWeekend ? 240 : 200;
  const selectedCourtData = COURTS.find((c) => c.id === selectedCourt);

  const infoComplete = info.fullName.trim() && info.phone.trim() && info.email.trim();

  const handleNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS + 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      
      const meta = data.user?.user_metadata || {};
      setInfo({
        fullName: meta.full_name || meta.name || "",
        phone: meta.phone || "",
        email: data.user?.email || loginEmail,
      });
      handleNext();
    } catch (err: any) {
      setError(err.message || "Identifiants incorrects.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoComplete || !signUpPassword) return;
    setIsSigningUp(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: info.email.trim(),
        password: signUpPassword,
        options: {
          data: {
            full_name: info.fullName.trim(),
            phone: info.phone.trim(),
          },
        },
      });
      if (error) throw error;
      
      handleNext();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription.");
    } finally {
      setIsSigningUp(false);
    }
  };

  const fetchDailyAvailability = useCallback(async (courtId: number, date: Date) => {
    setLoadingSlots(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/availability?court_id=${courtId}&date=${dateStr}`);
      const data = await res.json();
      if (res.ok) {
        setBookedSlots(new Set(data.bookedSlots));
      }
    } catch {
      setBookedSlots(new Set());
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const fetchWeeklyAvailability = useCallback(async (courtId: number, weekStartDt: Date) => {
    setLoadingSlots(true);
    try {
      const startStr = format(weekStartDt, "yyyy-MM-dd");
      const endStr = format(endOfWeek(weekStartDt, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const res = await fetch(`/api/availability?court_id=${courtId}&start_date=${startStr}&end_date=${endStr}`);
      const data = await res.json();
      if (res.ok) {
        const slotsObj: Record<string, Set<string>> = {};
        for (const [date, slots] of Object.entries(data.bookedSlotsByDate as Record<string, string[]>)) {
          slotsObj[date] = new Set(slots);
        }
        setWeeklyBookedSlots(slotsObj);
      }
    } catch {
      setWeeklyBookedSlots({});
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2 && selectedCourt) {
      if (viewMode === "classic") {
        fetchDailyAvailability(selectedCourt, selectedDate);
      } else {
        fetchWeeklyAvailability(selectedCourt, calendarWeek);
      }
    }
  }, [step, selectedCourt, selectedDate, calendarWeek, viewMode, fetchDailyAvailability, fetchWeeklyAvailability]);

  useEffect(() => {
    const needed = playerCount - 1;
    setOtherPlayers(prev => {
      if (prev.length === needed) return prev;
      if (prev.length > needed) return prev.slice(0, needed);
      return [...prev, ...Array(needed - prev.length).fill('')];
    });
  }, [playerCount]);

  const handleConfirm = async () => {
    if (!selectedCourt || !selectedTime) return;
    setIsBooking(true);
    setError(null);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: selectedCourt,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          time_slot: selectedTime,
          player_count: playerCount,
          total_price: totalPrice,
          full_name: info.fullName.trim(),
          phone: info.phone.trim(),
          email: info.email.trim(),
          other_players: otherPlayers.map(n => n.trim()),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "SLOT_TAKEN") {
          setError("Ce créneau vient d'être réservé par quelqu'un d'autre.");
          setStep(2); 
          if (selectedCourt) {
            viewMode === 'classic' 
              ? fetchDailyAvailability(selectedCourt, selectedDate)
              : fetchWeeklyAvailability(selectedCourt, calendarWeek);
          }
        } else {
          setError(data.error || "Un problème est survenu. Veuillez réessayer.");
        }
        return;
      }

      setBookingRef(data.bookingRef);
      setStep(TOTAL_STEPS + 1);
    } catch {
      setError("Erreur réseau. Veuillez vérifier votre connexion et réessayer.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedCourt(null);
    setSelectedTime(null);
    setBookingRef(null);
    setError(null);
    setAuthMode(null);
    setLoginPassword("");
    setOtherPlayers(['', '', '']);
  };

  const slideProps = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -40 },
    transition: { duration: 0.28, ease: "easeInOut" as const },
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <header className="booking-header">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Image src="/logo_nobg.png" alt="RTCMO Logo" width={40} height={40} style={{ objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--primary)", lineHeight: 1.2 }}>RTCMO</div>
              <div className="header-subtitle" style={{ fontSize: "0.7rem", opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>Réservation de Padel</div>
            </div>
          </div>
          {step <= TOTAL_STEPS && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <StepDots total={TOTAL_STEPS} current={step} />
              <span className="header-subtitle" style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                Étape {step}/{TOTAL_STEPS}
              </span>
            </div>
          )}
        </div>
      </header>

      <AnimatePresence>
        {error && (
          <div className="container" style={{ maxWidth: "800px", position: "relative", zIndex: 50, marginTop: "var(--space-3)" }}>
            <ErrorToast message={error} onDismiss={() => setError(null)} />
          </div>
        )}
      </AnimatePresence>

      <main style={{ padding: "var(--space-4) 0 var(--space-6)" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <div className="glass-panel booking-card" style={{ minHeight: "600px" }}>
            <AnimatePresence mode="wait">

              {/* ━━━ STEP 1: Authentication ━━━ */}
              {step === 1 && (
                <motion.div key="step1" {...slideProps}>
                  <h1 className="step-title" style={{ justifyContent: "center", marginBottom: "var(--space-6)" }}>
                    Bienvenue au Padel RTCMO
                  </h1>
                  
                  {!authMode ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "400px", margin: "0 auto" }}>
                      <button className="auth-choice-btn" onClick={() => setAuthMode("member")}>
                        <Lock size={24} style={{ color: "var(--primary)" }} />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Membre du Club</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>J'ai déjà un compte</div>
                        </div>
                      </button>
                      <button className="auth-choice-btn" onClick={() => setAuthMode("guest")}>
                        <User size={24} style={{ color: "var(--primary)" }} />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Nouveau Joueur</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Je réserve pour la première fois</div>
                        </div>
                      </button>
                    </div>
                  ) : authMode === "member" ? (
                    <form onSubmit={handleLogin} style={{ maxWidth: "400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                      <p className="section-label" style={{ textAlign: "center" }}>Connexion Membre</p>
                      <InputField
                        icon={<Mail size={18} />} label="Email" type="email"
                        placeholder="votre@email.com" required
                        value={loginEmail} onChange={setLoginEmail}
                      />
                      <InputField
                        icon={<Lock size={18} />} label="Mot de passe" type="password"
                        placeholder="••••••••" required
                        value={loginPassword} onChange={setLoginPassword}
                      />
                      <div className="step-actions" style={{ marginTop: "var(--space-2)" }}>
                        <button type="button" onClick={() => setAuthMode(null)} className="btn-back">
                          <ChevronLeft size={16} /> Retour
                        </button>
                        <button type="submit" disabled={isLoggingIn} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                          {isLoggingIn ? <Loader2 size={16} className="spin-icon" /> : "Se Connecter"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleSignUp} style={{ maxWidth: "400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      <p className="section-label" style={{ textAlign: "center" }}>Créer un Compte</p>
                      <InputField icon={<User size={18} />} label="Nom Complet" placeholder="ex. Ahmed Benali" required value={info.fullName} onChange={v => setInfo({...info, fullName: v})} />
                      <InputField icon={<Phone size={18} />} label="Téléphone" type="tel" placeholder="ex. +212 6 00 00 00 00" required value={info.phone} onChange={v => setInfo({...info, phone: v})} />
                      <InputField icon={<Mail size={18} />} label="Adresse E-mail" type="email" placeholder="ex. ahmed@example.com" required value={info.email} onChange={v => setInfo({...info, email: v})} />
                      <InputField icon={<Lock size={18} />} label="Mot de passe" type="password" placeholder="••••••••" required value={signUpPassword} onChange={setSignUpPassword} />
                      <div className="step-actions" style={{ marginTop: "var(--space-2)" }}>
                        <button type="button" onClick={() => setAuthMode(null)} className="btn-back">
                          <ChevronLeft size={16} /> Retour
                        </button>
                        <button type="submit" disabled={!infoComplete || !signUpPassword || isSigningUp} className="btn-primary" style={{ flex: 1, justifyContent: "center", opacity: (!infoComplete || !signUpPassword || isSigningUp) ? 0.5 : 1 }}>
                          {isSigningUp ? <Loader2 size={16} className="spin-icon" /> : "S'inscrire et Continuer"}
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}

              {/* ━━━ STEP 2: Court & Date/Time ━━━ */}
              {step === 2 && (
                <motion.div key="step2" {...slideProps}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                    <h1 className="step-title" style={{ margin: 0 }}>
                      <CalendarIcon size={28} style={{ color: "var(--primary)" }} />
                      Créneau & Terrain
                    </h1>
                    <div className="view-toggle">
                      <button className={`view-toggle-btn ${viewMode === 'classic' ? 'active' : ''}`} onClick={() => { setViewMode("classic"); setSelectedTime(null); }}>
                        <LayoutGrid size={16} /> Classique
                      </button>
                      <button className={`view-toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`} onClick={() => { setViewMode("weekly"); setSelectedTime(null); }}>
                        <CalendarDays size={16} /> Semaine
                      </button>
                    </div>
                  </div>

                  <p className="section-label">Sélectionner le Terrain</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
                    {COURTS.map((court) => {
                      const active = selectedCourt === court.id;
                      return (
                        <button key={court.id} onClick={() => { setSelectedCourt(court.id); setSelectedTime(null); }} className={`court-card ${active ? "active" : ""}`}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "1rem" }}>{court.name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                              <MapPin size={12} /> {court.tag}
                            </div>
                          </div>
                          <div className={`radio-dot ${active ? "active" : ""}`} />
                        </button>
                      );
                    })}
                  </div>

                  {!selectedCourt ? (
                    <div className="empty-state-hint" style={{ textAlign: "center", padding: "var(--space-4)", color: "var(--text-muted)", background: "rgba(0,0,0,0.03)", borderRadius: "var(--radius-md)" }}>
                      Veuillez d'abord sélectionner un terrain pour voir les disponibilités.
                    </div>
                  ) : viewMode === "classic" ? (
                    <div className="classic-view-grid">
                      <div className="calendar-container">
                        <div className="calendar-month-header">
                          <button className="calendar-nav-btn" onClick={() => setCalendarMonth(m => addMonths(m, -1))} disabled={!canGoPrevMonth}><ChevronLeft size={18} /></button>
                          <span className="calendar-month-title">{format(calendarMonth, "MMMM yyyy", { locale: fr })}</span>
                          <button className="calendar-nav-btn" onClick={() => setCalendarMonth(m => addMonths(m, 1))} disabled={!canGoNextMonth}><ChevronRight size={18} /></button>
                        </div>
                        <div className="calendar-header-row">
                          {WEEKDAYS_FR.map(day => <div key={day} className="calendar-weekday">{day}</div>)}
                        </div>
                        <div className="calendar-grid">
                          {calendarDays.map((date, i) => {
                            const isPast = isBefore(date, today);
                            const isTooFar = isAfter(date, maxDate);
                            const isOutsideMonth = !isSameMonth(date, calendarMonth);
                            const isDisabled = isPast || isTooFar || isOutsideMonth;
                            const active = !isDisabled && isSameDay(selectedDate, date);
                            const isTodayDate = isSameDay(date, today);
                            return (
                              <button
                                key={i}
                                onClick={() => { if(!isDisabled){ setSelectedDate(date); setSelectedTime(null); } }}
                                disabled={isDisabled}
                                className={`calendar-cell ${active ? "active" : ""} ${isDisabled ? "disabled" : ""} ${isTodayDate ? "today" : ""} ${isOutsideMonth ? "outside" : ""}`}
                              >
                                <span className="cal-day-num">{format(date, "d")}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="time-slots-container" style={{ marginTop: "var(--space-4)" }}>
                        <p className="section-label">Créneaux ({format(selectedDate, "dd MMM", { locale: fr })})
                          {loadingSlots && <Loader2 size={14} className="spin-icon" style={{ marginLeft: "8px", display: "inline-block" }} />}
                        </p>
                        <div className="time-grid">
                          {TIME_SLOTS.map((time) => {
                            const taken = bookedSlots.has(time);
                            const active = selectedTime === time;
                            return (
                              <button
                                key={time}
                                onClick={() => { if (!taken) setSelectedTime(time); }}
                                disabled={taken || loadingSlots}
                                className={`time-chip ${active ? "active" : ""} ${taken ? "taken" : ""}`}
                              >
                                <Clock size={14} /> <span>{time}</span>
                                {taken && <span className="taken-label">Réservé</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="weekly-view-container" style={{ marginTop: "var(--space-4)" }}>
                      <div className="calendar-month-header" style={{ marginBottom: "var(--space-3)" }}>
                        <button className="calendar-nav-btn" onClick={() => setCalendarWeek(w => addWeeks(w, -1))} disabled={!canGoPrevWeek}><ChevronLeft size={18} /></button>
                        <span className="calendar-month-title">Semaine du {format(calendarWeek, "d MMMM", { locale: fr })}</span>
                        <button className="calendar-nav-btn" onClick={() => setCalendarWeek(w => addWeeks(w, 1))} disabled={!canGoNextWeek}><ChevronRight size={18} /></button>
                      </div>
                      
                      {loadingSlots && <div style={{ textAlign: "center", padding: "10px" }}><Loader2 size={24} className="spin-icon" style={{ color: "var(--primary)" }} /></div>}
                      
                      <div className={`weekly-grid ${loadingSlots ? 'loading' : ''}`}>
                        <div className="weekly-header-row">
                          <div className="weekly-time-col"></div>
                          {calendarWeekDays.map(date => (
                            <div key={date.toISOString()} className={`weekly-day-header ${isSameDay(date, today) ? 'today' : ''}`}>
                              <span className="wd-short">{format(date, "EEE", { locale: fr })}</span>
                              <span className="wd-num">{format(date, "dd/MM")}</span>
                            </div>
                          ))}
                        </div>
                        {TIME_SLOTS.map(time => (
                          <div key={time} className="weekly-row">
                            <div className="weekly-time-col">{time}</div>
                            {calendarWeekDays.map(date => {
                              const dateStr = format(date, "yyyy-MM-dd");
                              const isPast = isBefore(date, today) || (isSameDay(date, today) && time < format(new Date(), "HH:mm"));
                              const isTooFar = isAfter(date, maxDate);
                              const isDisabled = isPast || isTooFar;
                              const taken = weeklyBookedSlots[dateStr]?.has(time);
                              const active = isSameDay(selectedDate, date) && selectedTime === time;
                              
                              return (
                                <button
                                  key={dateStr}
                                  onClick={() => {
                                    if(!isDisabled && !taken) {
                                      setSelectedDate(date);
                                      setSelectedTime(time);
                                    }
                                  }}
                                  disabled={isDisabled || taken}
                                  className={`weekly-cell ${isDisabled ? 'disabled' : ''} ${taken ? 'taken' : ''} ${active ? 'active' : ''}`}
                                >
                                  {taken ? <span className="taken-x">Réservé</span> : active ? <CheckCircle2 size={16} /> : "Libre"}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="step-actions">
                    <button onClick={handleBack} className="btn-back"><ChevronLeft size={16} /> Retour</button>
                    <button
                      onClick={handleNext}
                      disabled={!selectedTime}
                      className="btn-primary"
                      style={{ opacity: selectedTime ? 1 : 0.45, pointerEvents: selectedTime ? "auto" : "none", display: "flex", gap: "6px" }}
                    >
                      Détails Match <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ STEP 3: Match Details ━━━ */}
              {step === 3 && (
                <motion.div key="step3" {...slideProps}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                    <SummaryBadge label="Terrain" value={selectedCourtData?.name ?? ""} />
                    <SummaryBadge label="Date"  value={format(selectedDate, "d MMM yyyy", { locale: fr })} />
                    <SummaryBadge label="Horaire"  value={selectedTime ?? ""} />
                  </div>

                  <h2 className="step-title" style={{ fontSize: "1.5rem" }}>
                    <Users size={24} style={{ color: "var(--primary)" }} />
                    Détails du Match
                  </h2>
                  
                  <p className="section-label">Format du match</p>
                  <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                    {([2, 4] as const).map((n) => {
                      const active = playerCount === n;
                      return (
                        <button key={n} onClick={() => setPlayerCount(n)} className={`player-card ${active ? "active" : ""}`}>
                          <Users size={28} style={{ color: active ? "var(--primary)" : "var(--text-muted)" }} />
                          <span style={{ fontWeight: 800, fontSize: "1.5rem", color: active ? "var(--primary)" : "var(--text-main)" }}>{n} Joueurs</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{n === 2 ? "Simple (1 vs 1)" : "Double (2 vs 2)"}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="pricing-banner" style={{ background: "rgba(139,28,34,0.06)", padding: "12px", borderRadius: "8px", color: "var(--primary)", fontWeight: "600", marginBottom: "var(--space-5)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={18} />
                    Tarif {isWeekend ? "Week-end" : "Semaine"} : <strong>{totalPrice} MAD</strong> total (Terrain)
                  </div>

                  <p className="section-label">Noms des Autres Joueurs (Optionnel)</p>
                  <div style={{ display: "grid", gap: "var(--space-3)" }}>
                    {otherPlayers.map((name, i) => (
                      <InputField
                        key={i} icon={<User size={18} />} label={`Joueur ${i + 2}`}
                        placeholder={`Nom du joueur ${i + 2}`} value={name}
                        onChange={(v) => { const updated = [...otherPlayers]; updated[i] = v; setOtherPlayers(updated); }}
                      />
                    ))}
                  </div>

                  <div className="step-actions">
                    <button onClick={handleBack} className="btn-back"><ChevronLeft size={16} /> Retour</button>
                    <button
                      onClick={handleNext}
                      className="btn-primary"
                    >
                      Vérifier & Confirmer <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ STEP 4: Review + Confirm ━━━ */}
              {step === 4 && (
                <motion.div key="step4" {...slideProps}>
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
                        ["Terrain",   selectedCourtData?.name ?? ""],
                        ["Date",    format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })],
                        ["Horaire",    `${selectedTime} (session de 1h30)`],
                        ["Joueurs", `${playerCount} personnes`],
                        ["Réservé par",    info.fullName],
                        ...otherPlayers.filter(n => n.trim()).map((name, i) => [`Joueur ${i + 2}`, name]),
                        ["Téléphone",   info.phone],
                        ["E-mail",   info.email],
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
                    Le paiement s'effectue à l'accueil du club. Vous recevrez une confirmation de votre réservation sur WhatsApp.
                  </p>

                  <div className="step-actions">
                    <button onClick={handleBack} disabled={isBooking} className="btn-back">
                      <ChevronLeft size={16} /> Retour
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="btn-primary"
                      disabled={isBooking}
                      style={{ minWidth: "180px" }}
                    >
                      {isBooking ? <span style={{ display: "flex", gap: "8px" }}><Loader2 size={16} className="spin-icon" /> En cours…</span> : "Confirmer la Réservation"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ SUCCESS ━━━ */}
              {step === 5 && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "var(--space-6) var(--space-3)" }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="success-icon">
                    <CheckCircle2 size={56} />
                  </motion.div>
                  <h2 style={{ fontSize: "2.25rem", color: "var(--primary)", marginBottom: "var(--space-2)" }}>Réservation Confirmée !</h2>
                  <p style={{ color: "var(--text-muted)", maxWidth: "380px", margin: "0 auto var(--space-2)", lineHeight: 1.7 }}>
                    <strong>{info.fullName}</strong>, votre réservation est enregistrée.
                  </p>
                  {bookingRef && <div className="booking-ref-badge">Réf : <strong>{bookingRef}</strong></div>}
                  
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", margin: "var(--space-4) 0" }}>
                    <SummaryBadge label="Date" value={format(selectedDate, "d MMM yyyy", { locale: fr })} />
                    <SummaryBadge label="Horaire" value={selectedTime ?? ""} />
                    <SummaryBadge label="Total" value={`${totalPrice} MAD`} />
                  </div>

                  <button onClick={handleReset} className="btn-primary">Réserver un Autre Terrain</button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="booking-footer">
        <div className="container" style={{ textAlign: "center" }}>
          <p>&copy; {new Date().getFullYear()} Royal Tennis Club de Mohammédia. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
