import { parse, format, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, addMinutes, setHours, setMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Toronto';

export interface ParsedCommand {
  action: string;
  entity: string;
  params: Record<string, any>;
  raw: string;
}

export function parseCommand(message: string): ParsedCommand {
  const lower = message.toLowerCase().trim();

  // CREATE MISSION (with optional calendar scheduling)
  if (lower.startsWith('create mission') || lower.startsWith('new mission') || lower.startsWith('build mission')) {
    const rest = message.substring(lower.indexOf('mission') + 7).trim();

    const scheduleKeywords = ['tomorrow', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hasSchedule = scheduleKeywords.some(kw => lower.includes(kw));

    if (hasSchedule) {
      const scheduleParams = parseScheduleCommand(message);
      return {
        action: 'create_with_calendar',
        entity: 'mission',
        params: {
          title: scheduleParams.title || 'New Mission',
          ...scheduleParams
        },
        raw: message
      };
    }

    return {
      action: 'create',
      entity: 'mission',
      params: { title: rest || 'New Mission' },
      raw: message
    };
  }

  // CREATE BATTLEFRONT
  if (lower.startsWith('create battlefront') || lower.startsWith('new battlefront')) {
    const rest = message.substring(lower.indexOf('battlefront') + 11).trim();
    return {
      action: 'create',
      entity: 'battlefront',
      params: { name: rest || 'New Battlefront' },
      raw: message
    };
  }

  // LIST MISSIONS
  if (lower.includes('list missions') || lower.includes('show missions') || lower === 'missions') {
    return {
      action: 'list',
      entity: 'mission',
      params: {},
      raw: message
    };
  }

  // LIST BATTLEFRONTS
  if (lower.includes('list battlefronts') || lower.includes('show battlefronts') || lower === 'battlefronts') {
    return {
      action: 'list',
      entity: 'battlefront',
      params: {},
      raw: message
    };
  }

  // SCHEDULE (calendar)
  if (lower.startsWith('schedule')) {
    const scheduleParams = parseScheduleCommand(message);
    return {
      action: 'schedule',
      entity: 'calendar',
      params: scheduleParams,
      raw: message
    };
  }

  // SHOW TODAY / SHOW THIS WEEK
  if (lower.includes('show today') || lower === 'today') {
    return {
      action: 'list',
      entity: 'calendar',
      params: { range: 'today' },
      raw: message
    };
  }

  if (lower.includes('show this week') || lower.includes('show week') || lower === 'this week') {
    return {
      action: 'list',
      entity: 'calendar',
      params: { range: 'week' },
      raw: message
    };
  }

  // DELETE MISSION
  if (lower.startsWith('delete mission')) {
    const id = extractId(message);
    return {
      action: 'delete',
      entity: 'mission',
      params: { id },
      raw: message
    };
  }

  // DELETE BATTLEFRONT
  if (lower.startsWith('delete battlefront')) {
    const id = extractId(message);
    return {
      action: 'delete',
      entity: 'battlefront',
      params: { id },
      raw: message
    };
  }

  // DELETE CALENDAR EVENT
  if (lower.startsWith('delete event') || lower.startsWith('cancel event')) {
    const id = extractId(message);
    return {
      action: 'delete',
      entity: 'calendar',
      params: { id },
      raw: message
    };
  }

  // UPDATE MISSION DURATION
  if (lower.includes('update mission') && (lower.includes('duration') || lower.includes('minutes') || lower.includes('hours'))) {
    const id = extractId(message);
    const durationMatch = message.match(/(\d+)\s*(h|hour|hours|m|min|mins|minute|minutes)/i);

    if (id && durationMatch) {
      let minutes = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();

      if (unit.startsWith('h')) {
        minutes = minutes * 60;
      }

      return {
        action: 'update_duration',
        entity: 'mission',
        params: { id, duration: minutes },
        raw: message
      };
    }
  }

  // LINK EVENT TO MISSION
  if (lower.includes('link event') && lower.includes('to mission')) {
    const eventIdMatch = message.match(/link event ([a-f0-9-]{36})/i);
    const missionIdMatch = message.match(/to mission ([a-f0-9-]{36})/i);

    if (eventIdMatch && missionIdMatch) {
      return {
        action: 'link',
        entity: 'event_to_mission',
        params: { eventId: eventIdMatch[1], missionId: missionIdMatch[1] },
        raw: message
      };
    }
  }

  // Unknown command
  return {
    action: 'unknown',
    entity: 'unknown',
    params: {},
    raw: message
  };
}

function parseScheduleCommand(message: string): Record<string, any> {
  const lower = message.toLowerCase();

  const afterSchedule = message.substring(message.toLowerCase().indexOf('schedule') + 8).trim();

  const timeWords = ['tomorrow', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  let title = '';
  let dayPart = '';
  let timePart = '';

  for (const word of timeWords) {
    if (lower.includes(word)) {
      const idx = lower.indexOf(word);
      title = afterSchedule.substring(0, idx).trim();
      dayPart = word;

      const afterDay = afterSchedule.substring(idx + word.length).trim();
      const timeMatch = afterDay.match(/(\d{1,2})(am|pm|:\d{2}(am|pm)?)/i);
      if (timeMatch) {
        timePart = timeMatch[0];
      }
      break;
    }
  }

  let durationMinutes = 60;
  const durationMatch = lower.match(/for (\d+)\s*(hour|hours|minute|minutes|min|mins|hr|hrs)/);
  if (durationMatch) {
    const num = parseInt(durationMatch[1]);
    const unit = durationMatch[2];
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      durationMinutes = num * 60;
    } else {
      durationMinutes = num;
    }
  }

  const now = new Date();
  const zonedNow = toZonedTime(now, TIMEZONE);
  let startTime = zonedNow;

  if (dayPart === 'today') {
    startTime = zonedNow;
  } else if (dayPart === 'tomorrow') {
    startTime = addDays(zonedNow, 1);
  } else if (timeWords.includes(dayPart)) {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = daysOfWeek.indexOf(dayPart);
    const currentDay = zonedNow.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    startTime = addDays(zonedNow, daysToAdd);
  }

  if (timePart) {
    const timeMatch = timePart.match(/(\d{1,2})(:(\d{2}))?(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
      const ampm = timeMatch[4] || '';

      if (ampm.toLowerCase() === 'pm' && hour !== 12) {
        hour += 12;
      } else if (ampm.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }

      startTime = setHours(startTime, hour);
      startTime = setMinutes(startTime, minute);
    }
  }

  const startUTC = fromZonedTime(startTime, TIMEZONE);
  const endUTC = addMinutes(startUTC, durationMinutes);

  return {
    title: title || 'Event',
    start_time: startUTC.toISOString(),
    end_time: endUTC.toISOString(),
    duration_minutes: durationMinutes
  };
}

function extractId(message: string): string | null {
  const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuidMatch ? uuidMatch[0] : null;
}

export function getDateRangeInEST(range: 'today' | 'week'): { start: Date; end: Date } {
  const now = new Date();
  const zonedNow = toZonedTime(now, TIMEZONE);

  if (range === 'today') {
    const start = startOfDay(zonedNow);
    const end = endOfDay(zonedNow);
    return {
      start: fromZonedTime(start, TIMEZONE),
      end: fromZonedTime(end, TIMEZONE)
    };
  } else {
    const start = startOfWeek(zonedNow, { weekStartsOn: 1 });
    const end = endOfWeek(zonedNow, { weekStartsOn: 1 });
    return {
      start: fromZonedTime(start, TIMEZONE),
      end: fromZonedTime(end, TIMEZONE)
    };
  }
}

export function formatDateInEST(date: Date): string {
  const zonedDate = toZonedTime(date, TIMEZONE);
  return format(zonedDate, 'MMM d, yyyy h:mm a');
}
