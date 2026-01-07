'use client';

import { useState, useEffect } from 'react';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Toronto';
const HOUR_HEIGHT = 60;
const START_HOUR = 6;

type CurrentTimeLineProps = {
  day?: Date;
  startHour?: number;
  hourHeight?: number;
};

export function CurrentTimeLine({ day, startHour = START_HOUR, hourHeight = HOUR_HEIGHT }: CurrentTimeLineProps) {
  const [topPosition, setTopPosition] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const zonedNow = toZonedTime(now, TIMEZONE);

      if (day) {
        const zonedDay = toZonedTime(day, TIMEZONE);
        const isSameDay =
          zonedNow.getDate() === zonedDay.getDate() &&
          zonedNow.getMonth() === zonedDay.getMonth() &&
          zonedNow.getFullYear() === zonedDay.getFullYear();

        if (!isSameDay) {
          setIsVisible(false);
          return;
        }
      }

      const currentHour = zonedNow.getHours();
      const currentMinute = zonedNow.getMinutes();

      const minutesFromStart = (currentHour - startHour) * 60 + currentMinute;

      if (minutesFromStart < 0 || currentHour > 22) {
        setIsVisible(false);
        return;
      }

      setIsVisible(true);
      const position = (minutesFromStart / 60) * hourHeight;
      setTopPosition(position);
    };

    updatePosition();

    const interval = setInterval(updatePosition, 30000);

    return () => clearInterval(interval);
  }, [day, startHour, hourHeight]);

  if (!isVisible) return null;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${topPosition}px` }}
    >
      <div className="flex items-center">
        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg" />
        <div className="flex-1 h-0.5 bg-red-500 shadow-lg" />
      </div>
    </div>
  );
}
