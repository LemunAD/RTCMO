"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
} from "date-fns";
import { fr } from "date-fns/locale";

// ─── Data ────────────────────────────────────────────────────────────────────

const COURTS = [
  { id: 1, name: "Terrain de Padel 1", tag: "Vue Panoramique", type: "Intérieur" },
  { id: 2, name: "Terrain de Padel 2", tag: "Court Central",  type: "Intérieur" },
  { id: 3, name: "Terrain de Padel 3", tag: "Côté Jardin",    type: "Extérieur" },
];

const TIME_SLOTS = [
  "08:00", "09:30", "11:00", "12:30", "14:00",
  "15:30", "17:00", "18:30", "20:00", "21:30",
];



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
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedDate, setSelectedDate]   = useState<Date>(new Date());
  const [selectedTime, setSelectedTime]   = useState<string | null>(null);
  const [playerCount, setPlayerCount]     = useState<2 | 4>(4);
  const [info, setInfo] = useState<PlayerInfo>({
    fullName: "", phone: "", email: "",
  });
  const [isBooking, setIsBooking]         = useState(false);
  const [bookingRef, setBookingRef]       = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  // Availability state
  const [bookedSlots, setBookedSlots]     = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots]   = useState(false);

  // Calendar navigation
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const today = startOfDay(new Date());

  // Booking window: rest of current month always available.
  // If we're in the last 7 days of the month, the entire next month opens up.
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

  // Build calendar grid for the currently viewed month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarMonth]);

  // Check if we can navigate to previous/next month
  const canGoPrevMonth = useMemo(() => {
    const prevMonth = addMonths(calendarMonth, -1);
    const prevMonthEnd = endOfMonth(prevMonth);
    return !isBefore(prevMonthEnd, today);
  }, [calendarMonth, today]);

  const canGoNextMonth = useMemo(() => {
    const nextMonth = addMonths(calendarMonth, 1);
    const nextMonthStart = startOfMonth(nextMonth);
    return !isAfter(nextMonthStart, maxDate);
  }, [calendarMonth, maxDate]);

  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const pricePerPerson = isWeekend ? 60 : 50;
  const totalPrice = playerCount * pricePerPerson;
  const selectedCourtData = COURTS.find((c) => c.id === selectedCourt);

  const infoComplete =
    info.fullName.trim() && info.phone.trim() && info.email.trim();

  const handleNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS + 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  // Fetch availability when court or date changes
  const fetchAvailability = useCallback(async (courtId: number, date: Date) => {
    setLoadingSlots(true);
    setSelectedTime(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/availability?court_id=${courtId}&date=${dateStr}`);
      const data = await res.json();
      if (res.ok) {
        setBookedSlots(new Set(data.bookedSlots));
      }
    } catch {
      // Silently fail — slots will appear as all available
      setBookedSlots(new Set());
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Refetch when entering step 2 or when court/date change while on step 2
  useEffect(() => {
    if (step === 2 && selectedCourt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAvailability(selectedCourt, selectedDate);
    }
  }, [step, selectedCourt, selectedDate, fetchAvailability]);

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "SLOT_TAKEN") {
          setError("Ce créneau vient d'être réservé par quelqu'un d'autre. Veuillez en choisir un autre.");
          setStep(2); // Go back to time selection
          if (selectedCourt) fetchAvailability(selectedCourt, selectedDate);
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
    setInfo({ fullName: "", phone: "", email: "" });
  };

  const slideProps = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -40 },
    transition: { duration: 0.28, ease: "easeInOut" as const },
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      {/* ── Compact header ── */}
      <header className="booking-header">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Image 
              src="/logo_nobg.png" 
              alt="RTCMO Logo" 
              width={40} 
              height={40} 
              style={{ objectFit: "contain" }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--primary)", lineHeight: 1.2 }}>RTCMO</div>
              <div style={{ fontSize: "0.7rem", opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>Réservation de Padel</div>
            </div>
          </div>
          {step <= TOTAL_STEPS && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <StepDots total={TOTAL_STEPS} current={step} />
              <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                Étape {step}/{TOTAL_STEPS}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Error toast ── */}
      <AnimatePresence>
        {error && (
          <div className="container" style={{ maxWidth: "720px", position: "relative", zIndex: 50 }}>
            <ErrorToast message={error} onDismiss={() => setError(null)} />
          </div>
        )}
      </AnimatePresence>

      {/* ── Main card ── */}
      <main style={{ padding: "var(--space-4) 0 var(--space-6)" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <div
            className="glass-panel booking-card"
          >
            <AnimatePresence mode="wait">

              {/* ━━━ STEP 1: Court + Date ━━━ */}
              {step === 1 && (
                <motion.div key="step1" {...slideProps}>
                  <h1 className="step-title">
                    <CalendarIcon size={28} style={{ color: "var(--primary)" }} />
                    Choisir Terrain &amp; Date
                  </h1>

                  {/* Date section */}
                  <p className="section-label">Sélectionner la Date</p>
                  <div className="calendar-container">
                    {/* Month navigation header */}
                    <div className="calendar-month-header">
                      <button
                        className="calendar-nav-btn"
                        onClick={() => setCalendarMonth(m => addMonths(m, -1))}
                        disabled={!canGoPrevMonth}
                        aria-label="Mois précédent"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="calendar-month-title">
                        {format(calendarMonth, "MMMM yyyy", { locale: fr })}
                      </span>
                      <button
                        className="calendar-nav-btn"
                        onClick={() => setCalendarMonth(m => addMonths(m, 1))}
                        disabled={!canGoNextMonth}
                        aria-label="Mois suivant"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="calendar-header-row">
                      {WEEKDAYS_FR.map(day => (
                        <div key={day} className="calendar-weekday">{day}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
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
                            onClick={() => !isDisabled && setSelectedDate(date)}
                            disabled={isDisabled}
                            className={`calendar-cell ${active ? "active" : ""} ${isDisabled ? "disabled" : ""} ${isTodayDate ? "today" : ""} ${isOutsideMonth ? "outside" : ""}`}
                          >
                            <span className="cal-day-num">{format(date, "d")}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Court cards */}
                  <p className="section-label" style={{ marginTop: "var(--space-4)" }}>Sélectionner le Terrain</p>
                  <div style={{ display: "grid", gap: "var(--space-2)" }}>
                    {COURTS.map((court) => {
                      const active = selectedCourt === court.id;
                      return (
                        <button
                          key={court.id}
                          onClick={() => setSelectedCourt(court.id)}
                          className={`court-card ${active ? "active" : ""}`}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "1rem" }}>{court.name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                              <MapPin size={12} /> {court.tag} · {court.type}
                            </div>
                          </div>
                          <div className={`radio-dot ${active ? "active" : ""}`} />
                        </button>
                      );
                    })}
                  </div>

                  <div className="step-actions">
                    <div />
                    <button
                      onClick={handleNext}
                      disabled={!selectedCourt}
                      className="btn-primary"
                      style={{ opacity: selectedCourt ? 1 : 0.45, pointerEvents: selectedCourt ? "auto" : "none", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      Choisir l&apos;Horaire <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ STEP 2: Time + Players ━━━ */}
              {step === 2 && (
                <motion.div key="step2" {...slideProps}>
                  {/* Summary row */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                    <SummaryBadge label="Terrain" value={selectedCourtData?.name ?? ""} />
                    <SummaryBadge label="Date" value={format(selectedDate, "d MMM yyyy", { locale: fr })} />
                  </div>

                  <h2 className="step-title" style={{ fontSize: "1.5rem" }}>
                    <Clock size={24} style={{ color: "var(--primary)" }} />
                    Horaire &amp; Joueurs
                  </h2>

                  {/* Player count */}
                  <p className="section-label">
                    Nombre de Joueurs · <span style={{ color: "var(--primary)" }}>{pricePerPerson} MAD / personne</span>
                  </p>
                  <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
                    {([2, 4] as const).map((n) => {
                      const active = playerCount === n;
                      return (
                        <button
                          key={n}
                          onClick={() => setPlayerCount(n)}
                          className={`player-card ${active ? "active" : ""}`}
                        >
                          <Users size={28} style={{ color: active ? "var(--primary)" : "var(--text-muted)" }} />
                          <span style={{ fontWeight: 800, fontSize: "1.5rem", color: active ? "var(--primary)" : "var(--text-main)" }}>
                            {n}
                          </span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {n === 2 ? "Simple / Paire" : "Équipe (4)"}
                          </span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: active ? "var(--primary)" : "var(--text-muted)" }}>
                            {n * pricePerPerson} MAD total
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Time slots */}
                  <p className="section-label">
                    Créneaux Disponibles (1h30)
                    {loadingSlots && <Loader2 size={14} className="spin-icon" style={{ marginLeft: "8px", display: "inline-block" }} />}
                  </p>
                  <div className="time-grid">
                    {TIME_SLOTS.map((time) => {
                      const taken = bookedSlots.has(time);
                      const active = selectedTime === time;
                      // Compute end time for display
                      const [h, m] = time.split(":").map(Number);
                      const endMinutes = h * 60 + m + 90;
                      const endH = Math.floor(endMinutes / 60).toString().padStart(2, "0");
                      const endM = (endMinutes % 60).toString().padStart(2, "0");
                      return (
                        <button
                          key={time}
                          onClick={() => { if (!taken) setSelectedTime(time); }}
                          disabled={taken || loadingSlots}
                          className={`time-chip ${active ? "active" : ""} ${taken ? "taken" : ""}`}
                        >
                          <Clock size={14} />
                          <span className="time-chip-range">{time} – {endH}:{endM}</span>
                          {taken && <span className="taken-label">Réservé</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="step-actions">
                    <button onClick={handleBack} className="btn-back">
                      <ChevronLeft size={16} /> Retour
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!selectedTime}
                      className="btn-primary"
                      style={{ opacity: selectedTime ? 1 : 0.45, pointerEvents: selectedTime ? "auto" : "none", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      Vos Informations <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ STEP 3: Player Info ━━━ */}
              {step === 3 && (
                <motion.div key="step3" {...slideProps}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                    <SummaryBadge label="Terrain" value={selectedCourtData?.name ?? ""} />
                    <SummaryBadge label="Date"  value={format(selectedDate, "d MMM yyyy", { locale: fr })} />
                    <SummaryBadge label="Horaire"  value={selectedTime ?? ""} />
                    <SummaryBadge label="Joueurs" value={`${playerCount} · ${totalPrice} MAD`} />
                  </div>

                  <h2 className="step-title" style={{ fontSize: "1.5rem" }}>
                    <User size={24} style={{ color: "var(--primary)" }} />
                    Vos Informations
                  </h2>
                  <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)", fontSize: "0.9rem" }}>
                    Remplissez vos informations pour finaliser la réservation.
                  </p>

                  <div style={{ display: "grid", gap: "var(--space-3)" }}>
                    <InputField
                      icon={<User size={18} />}
                      label="Nom Complet"
                      placeholder="ex. Ahmed Benali"
                      value={info.fullName}
                      onChange={(v) => setInfo({ ...info, fullName: v })}
                      required
                    />
                    <InputField
                      icon={<Phone size={18} />}
                      label="Téléphone"
                      type="tel"
                      placeholder="ex. +212 6 00 00 00 00"
                      value={info.phone}
                      onChange={(v) => setInfo({ ...info, phone: v })}
                      required
                    />
                    <InputField
                      icon={<Mail size={18} />}
                      label="Adresse E-mail"
                      type="email"
                      placeholder="ex. ahmed@example.com"
                      value={info.email}
                      onChange={(v) => setInfo({ ...info, email: v })}
                      required
                    />
                  </div>

                  <div className="step-actions">
                    <button onClick={handleBack} className="btn-back">
                      <ChevronLeft size={16} /> Retour
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!infoComplete}
                      className="btn-primary"
                      style={{ opacity: infoComplete ? 1 : 0.45, pointerEvents: infoComplete ? "auto" : "none", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      Vérifier &amp; Confirmer <ChevronRight size={16} />
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

                  {/* Booking summary card */}
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
                        ["Joueurs", `${playerCount} personnes · ${pricePerPerson} MAD × ${playerCount}`],
                        ["Nom",    info.fullName],
                        ["Téléphone",   info.phone],
                        ["E-mail",   info.email],
                      ].map(([label, value]) => (
                        <div key={label} className="review-row">
                          <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", flexShrink: 0 }}>{label}</span>
                          <span style={{ fontWeight: 600, textAlign: "right", fontSize: "0.9rem" }}>{value}</span>
                        </div>
                      ))}

                      {/* Total */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-1)" }}>
                        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Total à Payer</span>
                        <span style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--primary)" }}>
                          {totalPrice} MAD
                        </span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
                    Le paiement s&apos;effectue à l&apos;accueil du club. Une confirmation sera envoyée à {info.email}.
                  </p>

                  <div className="step-actions">
                    <button onClick={handleBack} disabled={isBooking} className="btn-back">
                      <ChevronLeft size={16} /> Retour
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="btn-primary"
                      disabled={isBooking}
                      style={{ minWidth: "180px", position: "relative", overflow: "hidden" }}
                    >
                      {isBooking ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Loader2 size={16} className="spin-icon" />
                          En cours…
                        </span>
                      ) : (
                        "Confirmer la Réservation"
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ SUCCESS ━━━ */}
              {step === 5 && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, type: "spring", bounce: 0.4 }}
                  style={{ textAlign: "center", padding: "var(--space-6) var(--space-3)" }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15, type: "spring", bounce: 0.5 }}
                    className="success-icon"
                  >
                    <CheckCircle2 size={56} />
                  </motion.div>

                  <h2 style={{ fontSize: "2.25rem", color: "var(--primary)", marginBottom: "var(--space-2)" }}>
                    Réservation Confirmée !
                  </h2>
                  <p style={{ color: "var(--text-muted)", maxWidth: "380px", margin: "0 auto var(--space-2)", lineHeight: 1.7 }}>
                    <strong>{info.fullName}</strong>, votre réservation est enregistrée.
                  </p>

                  {bookingRef && (
                    <div className="booking-ref-badge">
                      Réf : <strong>{bookingRef}</strong>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", margin: "var(--space-4) 0" }}>
                    <SummaryBadge label="Terrain"   value={selectedCourtData?.name ?? ""} />
                    <SummaryBadge label="Date"    value={format(selectedDate, "d MMM yyyy", { locale: fr })} />
                    <SummaryBadge label="Horaire"    value={selectedTime ?? ""} />
                    <SummaryBadge label="Total"   value={`${totalPrice} MAD`} />
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "var(--space-6)" }}>
                    Une confirmation a été envoyée à <strong>{info.email}</strong>. Paiement à l&apos;accueil.
                  </p>

                  <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={handleReset}
                      className="btn-primary"
                    >
                      Réserver un Autre Terrain
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="booking-footer">
        <div className="container" style={{ textAlign: "center" }}>
          <p>&copy; {new Date().getFullYear()} Royal Tennis Club de Mohammédia. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
