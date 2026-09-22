"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
import { format, addDays } from "date-fns";

// ─── Data ────────────────────────────────────────────────────────────────────

const COURTS = [
  { id: 1, name: "Padel Court 1", tag: "Panoramic View", type: "Indoor" },
  { id: 2, name: "Padel Court 2", tag: "Central Court",  type: "Indoor" },
  { id: 3, name: "Padel Court 3", tag: "Garden Side",    type: "Outdoor" },
];

const TIME_SLOTS = [
  "09:00", "10:30", "12:00", "13:30",
  "15:00", "16:30", "18:00", "19:30", "21:00",
];

const PRICE_PER_PERSON = 60; // MAD

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

  const upcomingDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i)),
    []
  );

  const totalPrice = playerCount * PRICE_PER_PERSON;
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
          setError(data.error);
          setStep(2); // Go back to time selection
          if (selectedCourt) fetchAvailability(selectedCourt, selectedDate);
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        return;
      }

      setBookingRef(data.bookingRef);
      setStep(TOTAL_STEPS + 1);
    } catch {
      setError("Network error. Please check your connection and try again.");
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
            <div className="logo-mark">P</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "white", lineHeight: 1.2 }}>RTCMO</div>
              <div style={{ fontSize: "0.7rem", opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>Padel Booking</div>
            </div>
          </div>
          {step <= TOTAL_STEPS && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <StepDots total={TOTAL_STEPS} current={step} />
              <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                {step}/{TOTAL_STEPS}
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
                    Choose Court &amp; Date
                  </h1>

                  {/* Date row */}
                  <p className="section-label">Select Date</p>
                  <div className="date-scroll">
                    {upcomingDays.map((date, i) => {
                      const active = selectedDate.toDateString() === date.toDateString();
                      const isToday = i === 0;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(date)}
                          className={`date-chip ${active ? "active" : ""}`}
                        >
                          <span className="date-chip-day">
                            {isToday ? "Today" : format(date, "EEE")}
                          </span>
                          <span className="date-chip-num">{format(date, "d")}</span>
                          <span className="date-chip-month">{format(date, "MMM")}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Court cards */}
                  <p className="section-label" style={{ marginTop: "var(--space-4)" }}>Select Court</p>
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
                      Choose Time <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ STEP 2: Time + Players ━━━ */}
              {step === 2 && (
                <motion.div key="step2" {...slideProps}>
                  {/* Summary row */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                    <SummaryBadge label="Court" value={selectedCourtData?.name ?? ""} />
                    <SummaryBadge label="Date" value={format(selectedDate, "d MMM yyyy")} />
                  </div>

                  <h2 className="step-title" style={{ fontSize: "1.5rem" }}>
                    <Clock size={24} style={{ color: "var(--primary)" }} />
                    Time &amp; Players
                  </h2>

                  {/* Player count */}
                  <p className="section-label">
                    Number of Players · <span style={{ color: "var(--primary)" }}>60 MAD / person</span>
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
                            {n === 2 ? "Singles / Pairs" : "Full Team (4)"}
                          </span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: active ? "var(--primary)" : "var(--text-muted)" }}>
                            {n * PRICE_PER_PERSON} MAD total
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Time slots */}
                  <p className="section-label">
                    Available Slots (90 min)
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
                          <Clock size={14} /> {time}
                          {taken && <span className="taken-label">Taken</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="step-actions">
                    <button onClick={handleBack} className="btn-back">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!selectedTime}
                      className="btn-primary"
                      style={{ opacity: selectedTime ? 1 : 0.45, pointerEvents: selectedTime ? "auto" : "none", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      Your Details <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ STEP 3: Player Info ━━━ */}
              {step === 3 && (
                <motion.div key="step3" {...slideProps}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                    <SummaryBadge label="Court" value={selectedCourtData?.name ?? ""} />
                    <SummaryBadge label="Date"  value={format(selectedDate, "d MMM yyyy")} />
                    <SummaryBadge label="Time"  value={selectedTime ?? ""} />
                    <SummaryBadge label="Players" value={`${playerCount} · ${totalPrice} MAD`} />
                  </div>

                  <h2 className="step-title" style={{ fontSize: "1.5rem" }}>
                    <User size={24} style={{ color: "var(--primary)" }} />
                    Your Details
                  </h2>
                  <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)", fontSize: "0.9rem" }}>
                    Fill in your information to complete the reservation.
                  </p>

                  <div style={{ display: "grid", gap: "var(--space-3)" }}>
                    <InputField
                      icon={<User size={18} />}
                      label="Full Name"
                      placeholder="e.g. Ahmed Benali"
                      value={info.fullName}
                      onChange={(v) => setInfo({ ...info, fullName: v })}
                      required
                    />
                    <InputField
                      icon={<Phone size={18} />}
                      label="Mobile Phone"
                      type="tel"
                      placeholder="e.g. +212 6 00 00 00 00"
                      value={info.phone}
                      onChange={(v) => setInfo({ ...info, phone: v })}
                      required
                    />
                    <InputField
                      icon={<Mail size={18} />}
                      label="Email Address"
                      type="email"
                      placeholder="e.g. ahmed@example.com"
                      value={info.email}
                      onChange={(v) => setInfo({ ...info, email: v })}
                      required
                    />
                  </div>

                  <div className="step-actions">
                    <button onClick={handleBack} className="btn-back">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!infoComplete}
                      className="btn-primary"
                      style={{ opacity: infoComplete ? 1 : 0.45, pointerEvents: infoComplete ? "auto" : "none", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      Review &amp; Confirm <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ STEP 4: Review + Confirm ━━━ */}
              {step === 4 && (
                <motion.div key="step4" {...slideProps}>
                  <h2 className="step-title" style={{ fontSize: "1.5rem" }}>
                    <CheckCircle2 size={24} style={{ color: "var(--primary)" }} />
                    Review Booking
                  </h2>

                  {/* Booking summary card */}
                  <div className="review-card">
                    <div className="review-card-header">
                      <span style={{ fontWeight: 700 }}>RTCMO — Court Reservation</span>
                      <span style={{ fontSize: "0.85rem", opacity: 0.85 }}>Padel</span>
                    </div>

                    <div style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
                      {[
                        ["Court",   selectedCourtData?.name ?? ""],
                        ["Date",    format(selectedDate, "EEEE, d MMMM yyyy")],
                        ["Time",    `${selectedTime} (90 min session)`],
                        ["Players", `${playerCount} people · 60 MAD × ${playerCount}`],
                        ["Name",    info.fullName],
                        ["Phone",   info.phone],
                        ["Email",   info.email],
                      ].map(([label, value]) => (
                        <div key={label} className="review-row">
                          <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", flexShrink: 0 }}>{label}</span>
                          <span style={{ fontWeight: 600, textAlign: "right", fontSize: "0.9rem" }}>{value}</span>
                        </div>
                      ))}

                      {/* Total */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-1)" }}>
                        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Total Due</span>
                        <span style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--primary)" }}>
                          {totalPrice} MAD
                        </span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
                    Payment is collected at the club reception. A confirmation will be sent to {info.email}.
                  </p>

                  <div className="step-actions">
                    <button onClick={handleBack} disabled={isBooking} className="btn-back">
                      <ChevronLeft size={16} /> Back
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
                          Processing…
                        </span>
                      ) : (
                        "Confirm Booking"
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
                    Booking Confirmed!
                  </h2>
                  <p style={{ color: "var(--text-muted)", maxWidth: "380px", margin: "0 auto var(--space-2)", lineHeight: 1.7 }}>
                    <strong>{info.fullName}</strong>, your reservation is set.
                  </p>

                  {bookingRef && (
                    <div className="booking-ref-badge">
                      Ref: <strong>{bookingRef}</strong>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", margin: "var(--space-4) 0" }}>
                    <SummaryBadge label="Court"   value={selectedCourtData?.name ?? ""} />
                    <SummaryBadge label="Date"    value={format(selectedDate, "d MMM yyyy")} />
                    <SummaryBadge label="Time"    value={selectedTime ?? ""} />
                    <SummaryBadge label="Total"   value={`${totalPrice} MAD`} />
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "var(--space-6)" }}>
                    A confirmation has been sent to <strong>{info.email}</strong>. Payment at reception.
                  </p>

                  <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={handleReset}
                      className="btn-primary"
                    >
                      Book Another Court
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
          <p>&copy; {new Date().getFullYear()} Royal Tennis Club de Mohammédia. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
