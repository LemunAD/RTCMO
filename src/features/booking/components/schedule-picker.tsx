import { useMemo } from "react";
import { AlertCircle, Calendar as CalendarIcon, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, LayoutGrid, Loader2, MapPin } from "lucide-react";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { COURTS, MAX_BOOKING_DAYS, TIME_SLOTS } from "../constants";
import type { useBookingSchedule } from "../hooks/use-booking-schedule";

const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function SchedulePicker({ schedule, handleBack, handleNext }: {
  schedule: ReturnType<typeof useBookingSchedule>;
  handleBack: () => void;
  handleNext: () => void;
}) {
  const {
    viewMode, setViewMode, selectedCourt, setSelectedCourt, selectedDate, setSelectedDate,
    selectedTime, setSelectedTime, calendarMonth, setCalendarMonth, calendarWeek, setCalendarWeek,
    bookedSlots, weeklyBookedSlots, loadingSlots,
  } = schedule;

  const today = startOfDay(new Date());

  const maxDate = useMemo(() => {
    return addDays(today, MAX_BOOKING_DAYS);
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

  return (
    <>
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
          Veuillez d&apos;abord sélectionner un terrain pour voir les disponibilités.
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
    </>
  );
}
