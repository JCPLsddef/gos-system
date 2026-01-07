'use client';

import { formatTimeLabel } from '@/lib/calendar-utils';

type TimeGridProps = {
  hours: number[];
  hourHeight: number;
  weekDays: Date[];
  onGridClick: (day: Date, minutes: number) => void;
};

export function TimeGrid({ hours, hourHeight, weekDays, onGridClick }: TimeGridProps) {
  const handleCellClick = (day: Date, hour: number) => {
    const minutes = hour * 60;
    onGridClick(day, minutes);
  };

  return (
    <div className="relative flex">
      {/* Time labels column */}
      <div className="w-16 flex-shrink-0 bg-slate-900/30 border-r border-slate-700">
        {hours.map((hour) => (
          <div
            key={hour}
            className="border-b border-slate-700/50 text-xs text-slate-400 pr-2 text-right flex items-start pt-1"
            style={{ height: `${hourHeight}px` }}
          >
            {formatTimeLabel(hour)}
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex-1 grid grid-cols-7">
        {weekDays.map((day, dayIndex) => (
          <div key={dayIndex} className="border-r border-slate-700 last:border-r-0 relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b border-slate-700/30 hover:bg-slate-800/20 transition-colors cursor-pointer"
                style={{ height: `${hourHeight}px` }}
                onClick={() => handleCellClick(day, hour)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
