import { startOfWeek, endOfWeek, format, addDays, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const TIMEZONE = 'America/Toronto';

export function getTorontoDate(date?: Date): Date {
  return toZonedTime(date || new Date(), TIMEZONE);
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const torontoDate = getTorontoDate(date);
  const weekStart = startOfWeek(torontoDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(torontoDate, { weekStartsOn: 1 });

  return {
    start: startOfDay(weekStart),
    end: endOfDay(weekEnd),
  };
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatWeekRange(start: Date, end: Date): string {
  const startStr = format(start, 'MMM d');
  const endStr = format(end, 'MMM d, yyyy');
  return `${startStr} - ${endStr}`;
}

export function getCurrentWeekStart(): Date {
  const now = getTorontoDate();
  return startOfWeek(now, { weekStartsOn: 1 });
}

export function parseDuration(input: string): number | null {
  const cleaned = input.trim().toLowerCase();

  const hourMinMatch = cleaned.match(/^(\d+)h\s*(\d+)m?$/);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1]);
    const mins = parseInt(hourMinMatch[2]);
    return hours * 60 + mins;
  }

  const hourMatch = cleaned.match(/^(\d+)h$/);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 60;
  }

  const minMatch = cleaned.match(/^(\d+)m?$/);
  if (minMatch) {
    return parseInt(minMatch[1]);
  }

  return null;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h${mins}m`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = getTorontoDate(d);
  return format(zonedDate, 'h:mm a');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = getTorontoDate(d);
  return format(zonedDate, 'MMM d, yyyy');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = getTorontoDate(d);
  return format(zonedDate, 'MMM d, yyyy h:mm a');
}
