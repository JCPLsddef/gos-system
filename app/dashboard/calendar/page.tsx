'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Calendar as CalendarIcon } from 'lucide-react';
import { WeekView } from '@/components/calendar/week-view';
import { DayView } from '@/components/calendar/day-view';
import { Button } from '@/components/ui/button';
import { startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Toronto';

type ViewMode = 'day' | 'week';

export default function CalendarPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = toZonedTime(new Date(), TIMEZONE);
    return startOfWeek(now, { weekStartsOn: 1 });
  });
  const [currentDay, setCurrentDay] = useState(() => toZonedTime(new Date(), TIMEZONE));

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Please log in to view calendar</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-4xl font-bold text-white">CALENDAR</h1>
            <p className="text-slate-400 text-lg mt-1">Schedule & time blocks (EST)</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'day' ? 'default' : 'outline'}
            onClick={() => setViewMode('day')}
            className={viewMode === 'day' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-white'}
          >
            Day
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            onClick={() => setViewMode('week')}
            className={viewMode === 'week' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-white'}
          >
            Week
          </Button>
        </div>
      </div>

      {viewMode === 'week' ? (
        <WeekView userId={user.id} currentWeekStart={currentWeekStart} onWeekChange={setCurrentWeekStart} />
      ) : (
        <DayView userId={user.id} currentDate={currentDay} onDateChange={setCurrentDay} />
      )}
    </div>
  );
}
