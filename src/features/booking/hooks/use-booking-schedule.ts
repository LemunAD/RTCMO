import { useCallback, useEffect, useState } from "react";
import { endOfWeek, format, startOfDay, startOfWeek } from "date-fns";

export function useBookingSchedule(active: boolean) {
  // Step 2 Court & Time state
  const [viewMode, setViewMode]         = useState<"classic" | "weekly">("classic");
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedDate, setSelectedDate]   = useState<Date>(() => startOfDay(new Date()));
  const [selectedTime, setSelectedTime]   = useState<string | null>(null);

  // Availability state
  const [bookedSlots, setBookedSlots]     = useState<Set<string>>(new Set());
  const [weeklyBookedSlots, setWeeklyBookedSlots] = useState<Record<string, Set<string>>>({});
  const [loadingSlots, setLoadingSlots]   = useState(false);

  // Calendar navigation
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarWeek, setCalendarWeek]   = useState<Date>(() => startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 }));

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

  const refreshAvailability = useCallback(async () => {
    if (!selectedCourt) return;
    if (viewMode === "classic") {
      await fetchDailyAvailability(selectedCourt, selectedDate);
    } else {
      await fetchWeeklyAvailability(selectedCourt, calendarWeek);
    }
  }, [calendarWeek, fetchDailyAvailability, fetchWeeklyAvailability, selectedCourt, selectedDate, viewMode]);

  useEffect(() => {
    if (!active || !selectedCourt) return;
    const timer = window.setTimeout(() => void refreshAvailability(), 0);
    return () => window.clearTimeout(timer);
  }, [active, refreshAvailability, selectedCourt]);

  return {
    viewMode, setViewMode,
    selectedCourt, setSelectedCourt,
    selectedDate, setSelectedDate,
    selectedTime, setSelectedTime,
    calendarMonth, setCalendarMonth,
    calendarWeek, setCalendarWeek,
    bookedSlots, weeklyBookedSlots, loadingSlots, refreshAvailability,
  };
}
