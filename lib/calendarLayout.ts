export const HOUR_HEIGHT_PX = 80;
export const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
export const MIN_EVENT_HEIGHT_PX = 20;
export const GRID_START_HOUR = 4;
export const GRID_END_HOUR = 22;

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesFromGridStart(eventStartMinutes: number, gridStartMinutes: number): number {
  return eventStartMinutes - gridStartMinutes;
}

export function getDurationMinutes(startMinutes: number, endMinutes: number): number {
  if (endMinutes < startMinutes) {
    return 0;
  }
  return endMinutes - startMinutes;
}

export function getEventTopPx(eventStartMinutes: number, gridStartMinutes: number): number {
  const offset = minutesFromGridStart(eventStartMinutes, gridStartMinutes);
  return offset * PX_PER_MINUTE;
}

export function getEventHeightPx(durationMins: number): number {
  const height = durationMins * PX_PER_MINUTE;
  return Math.max(height, MIN_EVENT_HEIGHT_PX);
}

export function getGridHeightPx(startHour: number, endHour: number): number {
  const totalMinutes = (endHour - startHour) * 60;
  return totalMinutes * PX_PER_MINUTE;
}

export function getMinutesFromDatetime(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function pxToMinutes(px: number): number {
  return px / PX_PER_MINUTE;
}
