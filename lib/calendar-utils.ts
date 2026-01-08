import { startOfWeek, endOfWeek, addDays, format, startOfDay, endOfDay, addMinutes, differenceInMinutes, isSameDay, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { PX_PER_MINUTE, MIN_EVENT_HEIGHT_PX } from './calendarLayout';

const TIMEZONE = 'America/Toronto';

export type CalendarEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  mission_id?: string | null;
  battlefront_id?: string | null;
  user_id: string;
  color?: string | null;
};

export type TimeBlock = {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
};

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(toZonedTime(date, TIMEZONE), { weekStartsOn: 1 }); // Monday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getHourSlots(startHour = 6, endHour = 22): number[] {
  const slots = [];
  for (let h = startHour; h <= endHour; h++) {
    slots.push(h);
  }
  return slots;
}

export function calculateEventPosition(
  event: CalendarEvent,
  day: Date,
  startHour: number,
  hourHeight: number
): TimeBlock | null {
  const eventStart = toZonedTime(new Date(event.start_time), TIMEZONE);
  const eventEnd = toZonedTime(new Date(event.end_time), TIMEZONE);

  if (!isSameDay(eventStart, day)) {
    return null;
  }

  const gridStartMinutes = startHour * 60;
  const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
  const durationMinutes = differenceInMinutes(eventEnd, eventStart);

  const minutesFromGridStart = eventStartMinutes - gridStartMinutes;
  const top = minutesFromGridStart * PX_PER_MINUTE;
  const height = Math.max(durationMinutes * PX_PER_MINUTE, MIN_EVENT_HEIGHT_PX);

  return {
    event,
    top,
    height,
    left: 0,
    width: 100,
  };
}

export function positionEventsForDay(
  events: CalendarEvent[],
  day: Date,
  startHour: number,
  hourHeight: number
): TimeBlock[] {
  const blocks = events
    .map((event) => calculateEventPosition(event, day, startHour, hourHeight))
    .filter((b): b is TimeBlock => b !== null)
    .sort((a, b) => a.top - b.top);

  if (blocks.length === 0) return [];

  const overlappingGroups: TimeBlock[][] = [];

  blocks.forEach((block) => {
    const blockEnd = block.top + block.height;
    let addedToGroup = false;

    for (const group of overlappingGroups) {
      const overlapsWithGroup = group.some((existing) => {
        const existingEnd = existing.top + existing.height;
        return block.top < existingEnd && blockEnd > existing.top;
      });

      if (overlapsWithGroup) {
        group.push(block);
        addedToGroup = true;
        break;
      }
    }

    if (!addedToGroup) {
      overlappingGroups.push([block]);
    }
  });

  const positioned: TimeBlock[] = [];

  overlappingGroups.forEach((group) => {
    if (group.length === 1) {
      positioned.push({
        ...group[0],
        left: 0,
        width: 100,
      });
    } else {
      const sortedGroup = [...group].sort((a, b) => a.top - b.top);
      const columns: TimeBlock[][] = [];

      sortedGroup.forEach((block) => {
        const blockEnd = block.top + block.height;
        let placedInColumn = false;

        for (let i = 0; i < columns.length; i++) {
          const column = columns[i];
          const lastInColumn = column[column.length - 1];
          const lastEnd = lastInColumn.top + lastInColumn.height;

          if (block.top >= lastEnd) {
            column.push(block);
            placedInColumn = true;
            break;
          }
        }

        if (!placedInColumn) {
          columns.push([block]);
        }
      });

      const columnCount = columns.length;
      const columnWidth = 100 / columnCount;

      columns.forEach((column, colIndex) => {
        column.forEach((block) => {
          positioned.push({
            ...block,
            left: colIndex * columnWidth,
            width: columnWidth,
          });
        });
      });
    }
  });

  return positioned;
}

export function timeToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function minutesToTime(minutes: number): { hour: number; minute: number } {
  return {
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
  };
}

export function snapToGrid(minutes: number, gridMinutes = 15): number {
  return Math.round(minutes / gridMinutes) * gridMinutes;
}

export function createEvent(
  userId: string,
  title: string,
  startDate: Date,
  startMinutes: number,
  durationMinutes: number
): Partial<CalendarEvent> {
  const { hour, minute } = minutesToTime(startMinutes);

  // Convert startDate to Toronto timezone first
  const torontoDate = toZonedTime(startDate, TIMEZONE);

  // Create a new date in Toronto timezone
  const zonedStart = new Date(
    torontoDate.getFullYear(),
    torontoDate.getMonth(),
    torontoDate.getDate(),
    hour,
    minute,
    0,
    0
  );

  const zonedEnd = addMinutes(zonedStart, durationMinutes);

  // Convert from Toronto timezone to UTC for storage
  return {
    user_id: userId,
    title,
    start_time: fromZonedTime(zonedStart, TIMEZONE).toISOString(),
    end_time: fromZonedTime(zonedEnd, TIMEZONE).toISOString(),
  };
}

export function updateEventTimes(
  event: CalendarEvent,
  newDay: Date | null,
  newStartMinutes: number | null,
  newDurationMinutes: number | null
): Partial<CalendarEvent> {
  const currentStart = toZonedTime(new Date(event.start_time), TIMEZONE);
  const currentEnd = toZonedTime(new Date(event.end_time), TIMEZONE);

  let newStart = new Date(
    currentStart.getFullYear(),
    currentStart.getMonth(),
    currentStart.getDate(),
    currentStart.getHours(),
    currentStart.getMinutes(),
    0,
    0
  );

  if (newDay) {
    const torontoDay = toZonedTime(newDay, TIMEZONE);
    newStart = new Date(
      torontoDay.getFullYear(),
      torontoDay.getMonth(),
      torontoDay.getDate(),
      currentStart.getHours(),
      currentStart.getMinutes(),
      0,
      0
    );
  }

  if (newStartMinutes !== null) {
    const { hour, minute } = minutesToTime(newStartMinutes);
    newStart = new Date(
      newStart.getFullYear(),
      newStart.getMonth(),
      newStart.getDate(),
      hour,
      minute,
      0,
      0
    );
  }

  const currentDuration = differenceInMinutes(currentEnd, currentStart);
  const duration = newDurationMinutes !== null ? newDurationMinutes : currentDuration;
  const newEnd = addMinutes(newStart, duration);

  return {
    start_time: fromZonedTime(newStart, TIMEZONE).toISOString(),
    end_time: fromZonedTime(newEnd, TIMEZONE).toISOString(),
  };
}

export function formatTimeLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function formatEventTime(startTime: string, endTime: string): string {
  const start = toZonedTime(new Date(startTime), TIMEZONE);
  const end = toZonedTime(new Date(endTime), TIMEZONE);
  return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
}
