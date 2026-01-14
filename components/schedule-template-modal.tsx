'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { getTorontoDate } from '@/lib/date-utils';
import { Calendar, Repeat, CalendarPlus } from 'lucide-react';
import { MissionTemplate } from '@/lib/mission-templates-service';

type ScheduleTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  template: MissionTemplate | null;
  onSchedule: (data: {
    title: string;
    battlefront_id?: string;
    start_at: string;
    duration_minutes: number;
  }) => Promise<void>;
  onScheduleMultiple?: (missions: {
    title: string;
    battlefront_id?: string;
    start_at: string;
    duration_minutes: number;
  }[]) => Promise<void>;
};

const DAYS_OF_WEEK = [
  { key: 'mon', label: 'M', fullLabel: 'Monday' },
  { key: 'tue', label: 'T', fullLabel: 'Tuesday' },
  { key: 'wed', label: 'W', fullLabel: 'Wednesday' },
  { key: 'thu', label: 'T', fullLabel: 'Thursday' },
  { key: 'fri', label: 'F', fullLabel: 'Friday' },
  { key: 'sat', label: 'S', fullLabel: 'Saturday' },
  { key: 'sun', label: 'S', fullLabel: 'Sunday' },
];

export function ScheduleTemplateModal({
  isOpen,
  onClose,
  template,
  onSchedule,
  onScheduleMultiple,
}: ScheduleTemplateModalProps) {
  const [date, setDate] = useState(() => format(getTorontoDate(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [multiDay, setMultiDay] = useState(false);
  const [numberOfDays, setNumberOfDays] = useState('7');
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  });
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (template) {
      setDuration(String(template.duration_minutes));
    }
  }, [template]);

  const toggleDay = (dayKey: string) => {
    setSelectedDays(prev => ({
      ...prev,
      [dayKey]: !prev[dayKey],
    }));
  };

  const getDayOfWeekKey = (date: Date): string => {
    const dayIndex = date.getDay();
    const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return keys[dayIndex];
  };

  const handleSchedule = async () => {
    if (!template) return;

    setIsScheduling(true);
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(date);
      startDate.setHours(hours, minutes, 0, 0);

      const baseMissionData = {
        title: template.title,
        battlefront_id: template.battlefront_id || undefined,
        duration_minutes: parseInt(duration) || 60,
      };

      if (multiDay && onScheduleMultiple) {
        const missions: (typeof baseMissionData & { start_at: string })[] = [];
        const numDays = parseInt(numberOfDays) || 7;

        for (let i = 0; i < numDays; i++) {
          const missionDate = addDays(startDate, i);
          const dayKey = getDayOfWeekKey(missionDate);

          if (selectedDays[dayKey]) {
            missions.push({
              ...baseMissionData,
              start_at: missionDate.toISOString(),
            });
          }
        }

        if (missions.length === 0) {
          toast.error('No days selected for the selected period');
          setIsScheduling(false);
          return;
        }

        await onScheduleMultiple(missions);
        toast.success(`Scheduled ${missions.length} missions from template`);
      } else {
        await onSchedule({
          ...baseMissionData,
          start_at: startDate.toISOString(),
        });
        toast.success('Mission scheduled from template');
      }

      // Reset form
      setDate(format(getTorontoDate(), 'yyyy-MM-dd'));
      setStartTime('09:00');
      setMultiDay(false);
      setNumberOfDays('7');
      setSelectedDays({
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: false,
        sun: false,
      });

      onClose();
    } catch (error) {
      toast.error('Failed to schedule mission');
    } finally {
      setIsScheduling(false);
    }
  };

  const selectedDaysCount = Object.values(selectedDays).filter(Boolean).length;

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-green-400" />
            Schedule Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <p className="text-white font-medium">{template.title}</p>
            {template.battlefront && (
              <p className="text-slate-400 text-sm mt-1">
                Battlefront: {template.battlefront.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="schedule-date" className="text-slate-300">
                {multiDay ? 'Start Date' : 'Date'}
              </Label>
              <Input
                id="schedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="schedule-time" className="text-slate-300">
                Start Time
              </Label>
              <Input
                id="schedule-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="schedule-duration" className="text-slate-300">
              Duration (minutes)
            </Label>
            <Input
              id="schedule-duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
              placeholder="60"
            />
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">Multiple Days</span>
              </div>
              <Switch
                checked={multiDay}
                onCheckedChange={setMultiDay}
              />
            </div>

            {multiDay && (
              <>
                <div>
                  <Label className="text-slate-300 text-sm">Number of Days</Label>
                  <Input
                    type="number"
                    min="2"
                    max="30"
                    value={numberOfDays}
                    onChange={(e) => setNumberOfDays(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-slate-300 text-sm mb-2 block">
                    Active Days ({selectedDaysCount} selected)
                  </Label>
                  <div className="flex gap-1">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleDay(day.key)}
                        className={`
                          w-9 h-9 rounded-lg text-sm font-medium transition-all
                          ${selectedDays[day.key]
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }
                        `}
                        title={day.fullLabel}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Creates missions at {startTime} for selected days over {numberOfDays} days
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
              disabled={isScheduling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isScheduling}
            >
              {isScheduling ? 'Scheduling...' : multiDay ? 'Schedule All' : 'Schedule Mission'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
