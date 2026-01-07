'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { getTorontoDate } from '@/lib/date-utils';
import { Repeat, Calendar } from 'lucide-react';

type Battlefront = {
  id: string;
  name: string;
};

type NewMissionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    battlefront_id?: string;
    start_at?: string;
    duration_minutes: number;
  }) => Promise<void>;
  onCreateMultiple?: (missions: {
    title: string;
    battlefront_id?: string;
    start_at?: string;
    duration_minutes: number;
  }[]) => Promise<void>;
  battlefronts: Battlefront[];
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

export function NewMissionModal({ isOpen, onClose, onCreate, onCreateMultiple, battlefronts }: NewMissionModalProps) {
  const [title, setTitle] = useState('');
  const [battlefrontId, setBattlefrontId] = useState<string>('__none__');
  const [date, setDate] = useState(() => format(getTorontoDate(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [dailyRepeat, setDailyRepeat] = useState(false);
  const [numberOfDays, setNumberOfDays] = useState('7');
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
    sun: true,
  });

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

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Mission title is required');
      return;
    }

    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(date);
      startDate.setHours(hours, minutes, 0, 0);

      const baseMissionData = {
        title: title.trim(),
        battlefront_id: battlefrontId === '__none__' ? undefined : battlefrontId,
        duration_minutes: parseInt(duration) || 60,
      };

      if (dailyRepeat && onCreateMultiple) {
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
          return;
        }

        await onCreateMultiple(missions);
        toast.success(`Created ${missions.length} missions`);
      } else {
        await onCreate({
          ...baseMissionData,
          start_at: startDate.toISOString(),
        });
      }

      setTitle('');
      setBattlefrontId('__none__');
      setDate(format(getTorontoDate(), 'yyyy-MM-dd'));
      setStartTime('09:00');
      setDuration('60');
      setDailyRepeat(false);
      setNumberOfDays('7');
      setSelectedDays({
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: true,
        sun: true,
      });

      onClose();
    } catch (error) {
      toast.error('Failed to create mission');
    }
  };

  const selectedDaysCount = Object.values(selectedDays).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">New Mission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="new-mission-title" className="text-slate-300">
              Title *
            </Label>
            <Input
              id="new-mission-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
              placeholder="Enter mission title"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="new-mission-battlefront" className="text-slate-300">
              Battlefront
            </Label>
            <Select value={battlefrontId || '__none__'} onValueChange={setBattlefrontId}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Select battlefront (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="__none__" className="text-white">Unassigned</SelectItem>
                {battlefronts.map((bf) => (
                  <SelectItem key={bf.id} value={bf.id} className="text-white">
                    {bf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-mission-date" className="text-slate-300">
                {dailyRepeat ? 'Start Date' : 'Date'}
              </Label>
              <Input
                id="new-mission-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-mission-time" className="text-slate-300">
                Start Time
              </Label>
              <Input
                id="new-mission-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="new-mission-duration" className="text-slate-300">
              Duration (minutes)
            </Label>
            <Input
              id="new-mission-duration"
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
                <span className="text-white font-medium">Daily Repeat</span>
              </div>
              <Switch
                checked={dailyRepeat}
                onCheckedChange={setDailyRepeat}
              />
            </div>

            {dailyRepeat && (
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
                    {DAYS_OF_WEEK.map((day, index) => (
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
            <Button onClick={onClose} variant="outline" className="flex-1 bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {dailyRepeat ? `Create ${selectedDaysCount > 0 ? 'Missions' : ''}` : 'Create Mission'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
