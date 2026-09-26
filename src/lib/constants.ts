import { parse, startOfDay } from "date-fns";

export const COURTS = [
  { id: 1, name: "Terrain de Padel 1", tag: "Vue Panoramique", type: "Intérieur" },
  { id: 2, name: "Terrain de Padel 2", tag: "Court Central", type: "Intérieur" },
  { id: 3, name: "Terrain de Padel 3", tag: "Côté Jardin", type: "Extérieur" },
] as const;

export const COURT_IDS = COURTS.map((c) => c.id);

// Slots run from 08:00 to 21:30 in 90-minute increments, so the last game
// (21:30 - 23:00) still finishes within the club's 08:00-23:00 opening hours.
export const TIME_SLOTS = [
  "08:00", "09:30", "11:00", "12:30", "14:00",
  "15:30", "17:00", "18:30", "20:00", "21:30",
] as const;

export const SLOT_DURATION_MINUTES = 90;

export const DATE_FORMAT = "yyyy-MM-dd";

/** Parses a "yyyy-MM-dd" string as a local calendar date (no UTC/timezone shift). */
export function parseBookingDate(dateStr: string): Date {
  return parse(dateStr, DATE_FORMAT, new Date());
}

export function isSunday(dateStr: string): boolean {
  return parseBookingDate(dateStr).getDay() === 0;
}

export function isPastBookingDate(dateStr: string): boolean {
  return parseBookingDate(dateStr) < startOfDay(new Date());
}
