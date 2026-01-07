export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase();

  // Pure number (assume minutes)
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Format: 1h, 2h, 3h
  const hoursMatch = trimmed.match(/^(\d+)h$/);
  if (hoursMatch) {
    return parseInt(hoursMatch[1], 10) * 60;
  }

  // Format: 30m, 45m, 90m
  const minutesMatch = trimmed.match(/^(\d+)m$/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10);
  }

  // Format: 1h30m, 2h15m, 1h30
  const combinedMatch = trimmed.match(/^(\d+)h\s?(\d+)m?$/);
  if (combinedMatch) {
    const hours = parseInt(combinedMatch[1], 10);
    const minutes = parseInt(combinedMatch[2], 10);
    return hours * 60 + minutes;
  }

  // Format: 1:30, 2:15 (hours:minutes)
  const colonMatch = trimmed.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    return hours * 60 + minutes;
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

  return `${hours}h ${mins}m`;
}

export function validateDuration(minutes: number | null, min = 5, max = 720): { valid: boolean; error?: string } {
  if (minutes === null) {
    return { valid: false, error: 'Invalid duration format' };
  }

  if (minutes < min) {
    return { valid: false, error: `Duration must be at least ${min} minutes` };
  }

  if (minutes > max) {
    return { valid: false, error: `Duration cannot exceed ${max} minutes (${max / 60}h)` };
  }

  return { valid: true };
}
