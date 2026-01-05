export const TIMEZONE = 'America/New_York';

export function getLocalDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

export function getLocalDateString(): string {
  const date = getLocalDate();
  return date.toISOString().split('T')[0];
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d.setDate(diff));
  return sunday.toISOString().split('T')[0];
}

export function getWeekEnd(date: Date = new Date()): string {
  const d = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  const saturday = new Date(d.setDate(diff));
  return saturday.toISOString().split('T')[0];
}

export function getCurrentTimeInTimezone(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}
