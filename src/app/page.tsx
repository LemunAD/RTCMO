"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
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
  ArrowRight,
  AlertCircle,
  Loader2,
  Lock,
  CalendarDays,
  LayoutGrid,
  Menu,
  X
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
  addWeeks,
  addDays
} from "date-fns";
import { fr } from "date-fns/locale";
import { COURTS, TIME_SLOTS } from "@/lib/constants";
import { ManageBookingModal, AccountDrawer } from "./ManagePanels";

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
  const [authMode, setAuthMode]         = useState<"member" | "guest" | "forgot" | "confirm_email" | null>(null);
  const [resetSent, setResetSent]       = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [loginEmail, setLoginEmail]     = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn]   = useState(false);
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [isSigningUp, setIsSigningUp]   = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [isResendingConfirm, setIsResendingConfirm] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [verifiedSuccessToast, setVerifiedSuccessToast] = useState(false);

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
  
  // Submission
  const [isBooking, setIsBooking]         = useState(false);
  const [bookingRef, setBookingRef]       = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  // Self-service panels
  const [manageOpen, setManageOpen]       = useState(false);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [sessionUser, setSessionUser]     = useState<{ email: string; name: string } | null>(null);

  // Availability state
  const [bookedSlots, setBookedSlots]     = useState<Set<string>>(new Set());
  const [weeklyBookedSlots, setWeeklyBookedSlots] = useState<Record<string, Set<string>>>({});
  const [loadingSlots, setLoadingSlots]   = useState(false);

  // Calendar navigation
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarWeek, setCalendarWeek]   = useState<Date>(() => startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 }));

  const today = startOfDay(new Date());

  // Available booking window: exactly 2 weeks (14 days) from today
  const maxDate = useMemo(() => {
    return addDays(today, 14);
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
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;

      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setRegisteredEmail(loginEmail.trim());
        setAuthMode("confirm_email");
        setError("Votre adresse e-mail n'a pas encore été confirmée. Veuillez vérifier votre boîte de réception.");
        return;
      }
      
      const meta = data.user?.user_metadata || {};
      setInfo({
        fullName: meta.full_name || meta.name || "",
        phone: meta.phone || "",
        email: data.user?.email || loginEmail.trim(),
      });
      handleNext();
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("email not confirmed") || (err as any).code === "email_not_confirmed") {
        setRegisteredEmail(loginEmail.trim());
        setAuthMode("confirm_email");
        setError("Votre adresse e-mail n'a pas encore été confirmée. Veuillez vérifier votre boîte de réception.");
      } else {
        setError(msg || "Identifiants incorrects.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    setIsSendingReset(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Impossible d'envoyer l'e-mail de réinitialisation.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoComplete || !signUpPassword || !signUpConfirmPassword) return;
    if (signUpPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSigningUp(true);
    setError(null);
    try {
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.auth.signUp({
        email: info.email.trim(),
        password: signUpPassword,
        options: {
          emailRedirectTo: `${siteUrl}/?verified=true`,
          data: {
            full_name: info.fullName.trim(),
            phone: info.phone.trim(),
          },
        },
      });
      if (error) {
        if (error.message?.toLowerCase().includes("already registered") || (error as any).code === "user_already_exists") {
          throw new Error("Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.");
        }
        throw error;
      }

      // Enforce email confirmation before accessing the booking form
      if (!data.session || !data.user?.email_confirmed_at) {
        setRegisteredEmail(info.email.trim());
        setSignUpPassword("");
        setSignUpConfirmPassword("");
        setResendSuccess(false);
        setAuthMode("confirm_email");
      } else {
        handleNext();
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription.");
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = registeredEmail || info.email.trim();
    if (!targetEmail) return;
    setIsResendingConfirm(true);
    setError(null);
    setResendSuccess(false);
    try {
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: `${siteUrl}/?verified=true`,
        },
      });
      if (error) throw error;
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || "Impossible de renvoyer l'e-mail de confirmation. Veuillez patienter avant de réessayer.");
    } finally {
      setIsResendingConfirm(false);
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

  // Track the logged-in player so the header can show the Espace Joueur entry.
  useEffect(() => {
    const apply = (user: { email?: string; email_confirmed_at?: string; user_metadata?: Record<string, any> } | null | undefined) => {
      if (user?.email) {
        const meta = user.user_metadata || {};
        setSessionUser({ email: user.email, name: meta.full_name || meta.name || "" });
        if (user.email_confirmed_at) {
          setInfo((prev) => ({
            fullName: prev.fullName || meta.full_name || meta.name || "",
            phone: prev.phone || meta.phone || "",
            email: user.email || prev.email,
          }));
        }
      } else {
        setSessionUser(null);
      }
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user as any));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      apply(session?.user as any);
      if (event === "SIGNED_IN" && session?.user?.email_confirmed_at && step === 1) {
        const meta = session.user.user_metadata || {};
        setInfo({
          fullName: meta.full_name || meta.name || "",
          phone: meta.phone || "",
          email: session.user.email || "",
        });
        setVerifiedSuccessToast(true);
        setStep(2);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [step]);

  useEffect(() => {
    if (step === 2 && selectedCourt) {
      if (viewMode === "classic") {
        fetchDailyAvailability(selectedCourt, selectedDate);
      } else {
        fetchWeeklyAvailability(selectedCourt, calendarWeek);
      }
    }
  }, [step, selectedCourt, selectedDate, calendarWeek, viewMode, fetchDailyAvailability, fetchWeeklyAvailability]);

  // If Supabase falls back to the Site URL, forward recovery links to the reset page,
  // or handle email verification redirects.
  useEffect(() => {
    const { hash, search } = window.location;
    if (hash.includes("type=recovery") || search.includes("type=recovery")) {
      window.location.replace(`/reset-password${search}${hash}`);
      return;
    }

    const isVerifiedLink =
      search.includes("verified=true") ||
      hash.includes("type=signup") ||
      hash.includes("type=email_confirmation");

    if (isVerifiedLink) {
      setVerifiedSuccessToast(true);
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        if (u) {
          const meta = u.user_metadata || {};
          setInfo({
            fullName: meta.full_name || meta.name || "",
            phone: meta.phone || "",
            email: u.email || "",
          });
          setSessionUser({ email: u.email || "", name: meta.full_name || meta.name || "" });
          setStep(2);
          window.history.replaceState(null, "", window.location.pathname);
        }
      });
    }
  }, []);

  const handleConfirm = async () => {
    if (!selectedCourt || !selectedTime) return;
    setIsBooking(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (session?.user && !session.user.email_confirmed_at) {
        setError("Veuillez d'abord confirmer votre adresse e-mail pour finaliser la réservation.");
        setStep(1);
        setAuthMode("confirm_email");
        setIsBooking(false);
        return;
      }

      const token = session?.access_token;
      const res = await fetch("/api/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          court_id: selectedCourt,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          time_slot: selectedTime,
          player_count: playerCount,
          total_price: totalPrice,
          full_name: info.fullName.trim(),
          phone: info.phone.trim(),
          email: info.email.trim(),
          other_players: [],
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
        } else if (data.code === "WEEKLY_LIMIT_REACHED") {
          setError(data.error || "Limite atteinte : vous ne pouvez réserver que 2 créneaux par semaine au maximum.");
          setStep(2);
        } else if (data.code === "BEYOND_BOOKING_WINDOW") {
          setError(data.error || "Les réservations ne sont ouvertes que pour les 2 prochaines semaines.");
          setStep(2);
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
    setSignUpPassword("");
    setSignUpConfirmPassword("");
    setResendSuccess(false);
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
        <div className="container booking-page-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Image src="/logo_nobg.png" alt="RTCMO Logo" width={40} height={40} style={{ objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--primary)", lineHeight: 1.2 }}>RTCMO</div>
              <div className="header-subtitle" style={{ fontSize: "0.7rem", opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>Réservation de Padel</div>
            </div>
          </div>
          <div className="header-actions-wrap">
            {step <= TOTAL_STEPS && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <StepDots total={TOTAL_STEPS} current={step} />
                <span className="header-subtitle" style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                  Étape {step}/{TOTAL_STEPS}
                </span>
              </div>
            )}
            <button
              id="header-menu-btn"
              className="header-menu-toggle"
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className={`header-actions ${menuOpen ? "open" : ""}`}>
              <button
                id="manage-booking-btn"
                className="header-btn-secondary"
                onClick={() => { setMenuOpen(false); setManageOpen(true); }}
              >
                Gérer ma réservation
              </button>
              <button
                id="account-drawer-btn"
                className="header-btn-primary"
                onClick={() => { setMenuOpen(false); setDrawerOpen(true); }}
                aria-label="Espace joueur"
              >
                <User size={14} /> {sessionUser ? (sessionUser.name.split(" ")[0] || "Mon espace") : "Espace Joueur"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {verifiedSuccessToast && (
          <div className="container" style={{ maxWidth: "820px", position: "relative", zIndex: 50, marginTop: "var(--space-3)" }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                color: "#065F46",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "0.9rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <CheckCircle2 size={18} style={{ color: "#059669", flexShrink: 0 }} />
              <span style={{ flex: 1, fontWeight: 500 }}>
                Votre adresse e-mail a été confirmée avec succès ! Vous pouvez maintenant choisir votre terrain et réserver votre créneau.
              </span>
              <button
                onClick={() => setVerifiedSuccessToast(false)}
                style={{ color: "#065F46", padding: "4px", fontSize: "1.2rem", lineHeight: 1, cursor: "pointer", background: "none", border: "none" }}
              >
                ×
              </button>
            </motion.div>
          </div>
        )}
        {error && (
          <div className="container" style={{ maxWidth: "820px", position: "relative", zIndex: 50, marginTop: "var(--space-3)" }}>
            <ErrorToast message={error} onDismiss={() => setError(null)} />
          </div>
        )}
      </AnimatePresence>

      <main className="booking-main" style={{ padding: "var(--space-4) 0 var(--space-6)" }}>
        <div className="container booking-page-container">
          <div className="booking-columns-layout">
            {/* Left Aesthetic Flanking Image Panel */}
            <aside className="aesthetic-side-panel left" aria-hidden="true">
              <div className="aesthetic-image-card">
                <Image
                  src="/pexels-afterdark-32524250.jpg"
                  alt="RTCMO Padel Smash & Action"
                  fill
                  sizes="(max-width: 1200px) 0vw, 300px"
                  style={{ objectFit: "cover" }}
                  priority
                />
                <div className="aesthetic-overlay">
                  <div className="aesthetic-card-badge">
                    <span className="aesthetic-badge-dot" />
                    <span>RTCMO Padel</span>
                  </div>
                  <div className="aesthetic-card-caption">
                    <h4>Esprit & Intensité</h4>
                    <p>3 terrains panoramiques éclairés</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Central Booking Card */}
            <div className="booking-card-wrapper">
              <div className="glass-panel booking-card" style={{ minHeight: "600px" }}>
                <AnimatePresence mode="wait">

              {/* ━━━ STEP 1: Authentication ━━━ */}
              {step === 1 && (
                <motion.div key="step1" {...slideProps} className="step1-layout">
                  <div className="brand-header">
                    <div className="brand-logo-ring">
                      <Image src="/logo_nobg.png" alt="RTCMO" width={56} height={56} style={{ objectFit: "contain" }} />
                    </div>
                    <h1 className="brand-title">Bienvenue au Padel RTCMO</h1>
                    <div className="brand-divider" />
                    {!authMode && (
                      <p className="brand-tagline">Réservez votre terrain en quelques clics</p>
                    )}
                  </div>

                  {!authMode ? (
                    sessionUser ? (
                      <div style={{ maxWidth: "400px", margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                        <div style={{ background: "rgba(15,81,50,0.07)", padding: "18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                          <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "var(--text-muted)" }}>Compte vérifié et connecté :</p>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem", color: "var(--primary)" }}>{sessionUser.name || sessionUser.email}</p>
                          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>{sessionUser.email}</p>
                        </div>
                        <button onClick={handleNext} className="btn-primary" style={{ justifyContent: "center" }}>
                          Continuer ma réservation <ArrowRight size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { supabase.auth.signOut(); setSessionUser(null); }}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline", padding: "4px" }}
                        >
                          Se connecter avec un autre compte
                        </button>
                      </div>
                    ) : (
                      <div className="auth-choice-list">
                        <button className="auth-choice-btn" onClick={() => { setError(null); setAuthMode("member"); }}>
                          <span className="auth-choice-icon"><Lock size={22} /></span>
                          <span className="auth-choice-text">
                            <span className="auth-choice-title">Membre du Club</span>
                            <span className="auth-choice-desc">J'ai déjà un compte</span>
                          </span>
                          <ArrowRight size={18} className="auth-choice-arrow" />
                        </button>
                        <button className="auth-choice-btn" onClick={() => { setError(null); setAuthMode("guest"); }}>
                          <span className="auth-choice-icon"><User size={22} /></span>
                          <span className="auth-choice-text">
                            <span className="auth-choice-title">Nouveau Joueur</span>
                            <span className="auth-choice-desc">Je réserve pour la première fois</span>
                          </span>
                          <ArrowRight size={18} className="auth-choice-arrow" />
                        </button>
                      </div>
                    )
                  ) : authMode === "confirm_email" ? (
                    <div style={{ maxWidth: "440px", margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                      <div style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        background: "rgba(15,81,50,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto",
                        color: "var(--primary)",
                      }}>
                        <Mail size={32} />
                      </div>

                      <div>
                        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--primary)", margin: "0 0 8px" }}>
                          Confirmez votre adresse e-mail
                        </h2>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.6, margin: 0 }}>
                          Un e-mail d'activation vient d'être envoyé à :<br />
                          <strong style={{ color: "var(--text-main)", fontSize: "1rem" }}>{registeredEmail || info.email}</strong>
                        </p>
                      </div>

                      <div style={{ background: "rgba(15,81,50,0.06)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "14px", textAlign: "left", fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.6 }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "6px", fontWeight: 700, color: "var(--primary)" }}>
                          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                          <span>Confirmation requise avant réservation</span>
                        </div>
                        Veuillez cliquer sur le lien reçu dans votre messagerie pour valider votre compte. Dès validation, vous pourrez vous connecter et accéder au calendrier de réservation.
                      </div>

                      {resendSuccess && (
                        <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px", textAlign: "left" }}>
                          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                          <span>Un nouvel e-mail de confirmation a été envoyé ! Pensez à vérifier vos courriers indésirables (spams).</span>
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "var(--space-2)" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail(registeredEmail || info.email);
                            setAuthMode("member");
                            setError(null);
                          }}
                          className="btn-primary"
                          style={{ justifyContent: "center" }}
                        >
                          J'ai confirmé mon e-mail / Me connecter <ArrowRight size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={handleResendConfirmation}
                          disabled={isResendingConfirm}
                          className="btn-back"
                          style={{ justifyContent: "center" }}
                        >
                          {isResendingConfirm ? <Loader2 size={16} className="spin-icon" /> : "Renvoyer l'e-mail de confirmation"}
                        </button>

                        <button
                          type="button"
                          onClick={() => { setAuthMode(null); setError(null); }}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline", padding: "6px" }}
                        >
                          Retour à l'accueil
                        </button>
                      </div>
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
                      <button type="button" onClick={() => { setError(null); setResetSent(false); setAuthMode("forgot"); }}
                        style={{ alignSelf: "flex-end", background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: "0.85rem", fontWeight: 600, textDecoration: "underline", padding: 0 }}>
                        Mot de passe oublié ?
                      </button>
                      <div className="step-actions" style={{ marginTop: "var(--space-2)" }}>
                        <button type="button" onClick={() => { setAuthMode(null); setError(null); }} className="btn-back">
                          <ChevronLeft size={16} /> Retour
                        </button>
                        <button type="submit" disabled={isLoggingIn} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                          {isLoggingIn ? <Loader2 size={16} className="spin-icon" /> : "Se Connecter"}
                        </button>
                      </div>
                    </form>
                  ) : authMode === "forgot" ? (
                    <form onSubmit={handleForgotPassword} style={{ maxWidth: "400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                      <p className="section-label" style={{ textAlign: "center" }}>Mot de passe oublié</p>
                      {resetSent ? (
                        <p style={{ textAlign: "center", color: "var(--text-muted)", lineHeight: 1.6 }}>
                          Si un compte existe pour <strong>{loginEmail}</strong>, un e-mail contenant un lien de réinitialisation vient d'être envoyé. Pensez à vérifier vos courriers indésirables.
                        </p>
                      ) : (
                        <>
                          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                            Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation.
                          </p>
                          <InputField
                            icon={<Mail size={18} />} label="Email" type="email"
                            placeholder="votre@email.com" required
                            value={loginEmail} onChange={setLoginEmail}
                          />
                        </>
                      )}
                      <div className="step-actions" style={{ marginTop: "var(--space-2)" }}>
                        <button type="button" onClick={() => { setAuthMode("member"); setError(null); }} className="btn-back">
                          <ChevronLeft size={16} /> Retour
                        </button>
                        {!resetSent && (
                          <button type="submit" disabled={isSendingReset || !loginEmail.trim()} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                            {isSendingReset ? <Loader2 size={16} className="spin-icon" /> : "Envoyer le lien"}
                          </button>
                        )}
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleSignUp} style={{ maxWidth: "400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      <p className="section-label" style={{ textAlign: "center" }}>Créer un Compte</p>
                      <InputField icon={<User size={18} />} label="Nom Complet" placeholder="ex. Ahmed Benali" required value={info.fullName} onChange={v => setInfo({...info, fullName: v})} />
                      <InputField icon={<Phone size={18} />} label="Téléphone" type="tel" placeholder="ex. +212 6 00 00 00 00" required value={info.phone} onChange={v => setInfo({...info, phone: v})} />
                      <InputField icon={<Mail size={18} />} label="Adresse E-mail" type="email" placeholder="ex. ahmed@example.com" required value={info.email} onChange={v => setInfo({...info, email: v})} />
                      <InputField icon={<Lock size={18} />} label="Mot de passe" type="password" placeholder="6 caractères minimum" required value={signUpPassword} onChange={setSignUpPassword} />
                      <InputField icon={<Lock size={18} />} label="Confirmer le mot de passe" type="password" placeholder="Retapez votre mot de passe" required value={signUpConfirmPassword} onChange={setSignUpConfirmPassword} />
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                        Un e-mail d'activation vous sera envoyé. La confirmation de votre e-mail est obligatoire avant de pouvoir réserver.
                      </p>
                      <div className="step-actions" style={{ marginTop: "var(--space-2)" }}>
                        <button type="button" onClick={() => { setAuthMode(null); setError(null); }} className="btn-back">
                          <ChevronLeft size={16} /> Retour
                        </button>
                        <button
                          type="submit"
                          disabled={!infoComplete || !signUpPassword || !signUpConfirmPassword || isSigningUp}
                          className="btn-primary"
                          style={{ flex: 1, justifyContent: "center", opacity: (!infoComplete || !signUpPassword || !signUpConfirmPassword || isSigningUp) ? 0.5 : 1 }}
                        >
                          {isSigningUp ? <Loader2 size={16} className="spin-icon" /> : "S'inscrire"}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="contact-footer">
                    <span className="contact-label">Une question ? Contactez-nous</span>
                    <div className="contact-links">
                      <a href="mailto:rtcmo2026@gmail.com" className="contact-link">
                        <Mail size={15} /> rtcmo2026@gmail.com
                      </a>
                      <a href="tel:+212668705231" className="contact-link">
                        <Phone size={15} /> +212 6 68 70 52 31
                      </a>
                    </div>
                  </div>
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

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "var(--primary)", background: "rgba(15,81,50,0.07)", padding: "10px 14px", borderRadius: "var(--radius-md)", marginBottom: "var(--space-4)", fontWeight: 500 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>Réservations ouvertes sur <strong>2 semaines</strong> · Limite de <strong>2 réservations par semaine</strong> par joueur.</span>
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
                  
                  <div className="pricing-banner" style={{ background: "rgba(139,28,34,0.06)", padding: "12px", borderRadius: "8px", color: "var(--primary)", fontWeight: "600", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={18} />
                    Tarif {isWeekend ? "Week-end" : "Semaine"} : <strong>{totalPrice} MAD</strong> total (Terrain)
                  </div>

                  <div style={{ background: "rgba(15,81,50,0.06)", padding: "10px 14px", borderRadius: "8px", color: "var(--primary)", fontSize: "0.82rem", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                    <span>Limite : <strong>2 réservations par semaine</strong> · Annulation en ligne jusqu&apos;à <strong>24h avant</strong>.</span>
                  </div>

                  <p className="section-label">Joueur Responsable de la Réservation</p>
                  <div style={{ marginBottom: "var(--space-4)" }}>
                    <InputField
                      icon={<User size={18} />}
                      label="Nom et Prénom du joueur"
                      placeholder="ex. Ahmed Benali"
                      required
                      value={info.fullName}
                      onChange={(v) => setInfo({ ...info, fullName: v })}
                    />
                  </div>

                  <div className="step-actions">
                    <button onClick={handleBack} className="btn-back"><ChevronLeft size={16} /> Retour</button>
                    <button
                      onClick={handleNext}
                      disabled={!info.fullName.trim()}
                      className="btn-primary"
                      style={{ opacity: info.fullName.trim() ? 1 : 0.45, pointerEvents: info.fullName.trim() ? "auto" : "none" }}
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
                        ["Format", `${playerCount} personnes (${playerCount === 2 ? "Simple" : "Double"})`],
                        ["Réservé par",    info.fullName],
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
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "calc(-1 * var(--space-4))", marginBottom: "var(--space-5)" }}>
                    Annulation en ligne possible jusqu&apos;à 24h avant le créneau. En confirmant, vous acceptez les <Link href="/cgu" target="_blank" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "underline" }}>Conditions Générales d&apos;Utilisation</Link>.
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

            {/* Right Aesthetic Flanking Image Panel */}
            <aside className="aesthetic-side-panel right" aria-hidden="true">
              <div className="aesthetic-image-card">
                <Image
                  src="/pexels-rodrigo-ortega-2044210904-30864597.jpg"
                  alt="Raquette et terrain de padel RTCMO"
                  fill
                  sizes="(max-width: 1200px) 0vw, 300px"
                  style={{ objectFit: "cover" }}
                  priority
                />
                <div className="aesthetic-overlay">
                  <div className="aesthetic-card-badge">
                    <span className="aesthetic-badge-dot" />
                    <span>Club Mohammédia</span>
                  </div>
                  <div className="aesthetic-card-caption">
                    <h4>Convivialité & Jeu</h4>
                    <p>Créneaux de 90 min 7j/7</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <footer className="booking-footer">
        <div className="container booking-page-container" style={{ textAlign: "center" }}>
          <p>&copy; {new Date().getFullYear()} Royal Tennis Club de Mohammédia. Tous droits réservés.</p>
          <p style={{ marginTop: "6px" }}>
            <Link href="/cgu" style={{ textDecoration: "underline" }}>Conditions Générales d'Utilisation</Link>
          </p>
        </div>
      </footer>

      <ManageBookingModal open={manageOpen} onClose={() => setManageOpen(false)} />
      <AccountDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userEmail={sessionUser?.email ?? null}
        userName={sessionUser?.name ?? ""}
        onSignOut={() => { supabase.auth.signOut(); }}
        onLoginRequest={() => { setStep(1); setAuthMode("member"); }}
      />
    </div>
  );
}
