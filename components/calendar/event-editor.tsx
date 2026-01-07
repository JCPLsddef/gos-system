'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarEvent } from '@/lib/calendar-utils';
import { format, addDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { Trash2, Target, Repeat } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getColorHex } from '@/lib/color-mapping';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

type Battlefront = {
  id: string;
  name: string;
  color: string;
};

type MissionData = {
  id: string;
  battlefront_id: string | null;
  is_recurring: boolean;
  recurrence_days: string | null;
  recurrence_time: string | null;
};

type EventEditorProps = {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
  onRefresh?: () => void;
};

const TIMEZONE = 'America/Toronto';

export function EventEditor({ event, isOpen, onClose, onSave, onDelete, onRefresh }: EventEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [originalStartTime, setOriginalStartTime] = useState('');
  const [originalEndTime, setOriginalEndTime] = useState('');
  const [timeEdited, setTimeEdited] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [battlefronts, setBattlefronts] = useState<Battlefront[]>([]);
  const [selectedBattlefrontId, setSelectedBattlefrontId] = useState<string>('none');
  const [originalBattlefrontId, setOriginalBattlefrontId] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const [originalIsDaily, setOriginalIsDaily] = useState(false);
  const [dailyDays, setDailyDays] = useState('7');
  const [linkedMission, setLinkedMission] = useState<MissionData | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadBattlefronts();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setNotes('');

      const start = toZonedTime(new Date(event.start_time), TIMEZONE);
      const end = toZonedTime(new Date(event.end_time), TIMEZONE);

      const startTimeStr = format(start, 'HH:mm');
      const endTimeStr = format(end, 'HH:mm');

      setStartTime(startTimeStr);
      setEndTime(endTimeStr);
      setOriginalStartTime(startTimeStr);
      setOriginalEndTime(endTimeStr);
      setTimeError('');
      setTimeEdited(false);
      setDailyDays('7');

      if (event.mission_id) {
        loadMissionData(event.mission_id);
      } else {
        setSelectedBattlefrontId('none');
        setOriginalBattlefrontId('none');
        setIsDaily(false);
        setOriginalIsDaily(false);
        setLinkedMission(null);
      }
    }
  }, [event]);

  const loadBattlefronts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('battlefronts')
      .select('id, name, color')
      .eq('user_id', user.id)
      .order('name');
    setBattlefronts(data || []);
  };

  const loadMissionData = async (missionId: string) => {
    const { data } = await supabase
      .from('missions')
      .select('id, battlefront_id, is_recurring, recurrence_days, recurrence_time')
      .eq('id', missionId)
      .maybeSingle();

    if (data) {
      setLinkedMission(data);
      const bfId = data.battlefront_id || 'none';
      setSelectedBattlefrontId(bfId);
      setOriginalBattlefrontId(bfId);
      const recurring = data.is_recurring || false;
      setIsDaily(recurring);
      setOriginalIsDaily(recurring);
    } else {
      setSelectedBattlefrontId('none');
      setOriginalBattlefrontId('none');
      setIsDaily(false);
      setOriginalIsDaily(false);
      setLinkedMission(null);
    }
  };

  if (!event) return null;

  const parseTimeInput = (input: string): { hour: number; minute: number } | null => {
    const cleaned = input.trim().toLowerCase();

    const formats = [
      /^(\d{1,2}):(\d{2})$/,
      /^(\d{1,2})(\d{2})$/,
      /^(\d{1,2}):(\d{2})\s*(am|pm)$/,
      /^(\d{1,2})\s*(am|pm)$/,
    ];

    for (const regex of formats) {
      const match = cleaned.match(regex);
      if (match) {
        let hour = parseInt(match[1]);
        let minute = match[2] ? parseInt(match[2]) : 0;
        const meridian = match[3] || match[2]?.match(/am|pm/)?.[0];

        if (meridian) {
          if (meridian === 'pm' && hour !== 12) hour += 12;
          if (meridian === 'am' && hour === 12) hour = 0;
        }

        if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
          return { hour, minute };
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    if (!user || !event) return;
    setSaving(true);

    try {
      const updates: Partial<CalendarEvent> = {};
      let finalStartTime = event.start_time;
      let finalEndTime = event.end_time;

      if (title !== event.title) {
        updates.title = title;
      }

      if (timeEdited) {
        const startParsed = parseTimeInput(startTime);
        const endParsed = parseTimeInput(endTime);

        if (!startParsed) {
          setTimeError('Invalid start time. Try: 9:00, 9am, 14:30');
          setSaving(false);
          return;
        }

        if (!endParsed) {
          setTimeError('Invalid end time. Try: 5:00, 5pm, 17:30');
          setSaving(false);
          return;
        }

        const currentStartDate = toZonedTime(new Date(event.start_time), TIMEZONE);

        const newStartDate = new Date(
          currentStartDate.getFullYear(),
          currentStartDate.getMonth(),
          currentStartDate.getDate(),
          startParsed.hour,
          startParsed.minute,
          0,
          0
        );

        const newEndDate = new Date(
          currentStartDate.getFullYear(),
          currentStartDate.getMonth(),
          currentStartDate.getDate(),
          endParsed.hour,
          endParsed.minute,
          0,
          0
        );

        if (newEndDate <= newStartDate) {
          setTimeError('End time must be after start time');
          setSaving(false);
          return;
        }

        finalStartTime = fromZonedTime(newStartDate, TIMEZONE).toISOString();
        finalEndTime = fromZonedTime(newEndDate, TIMEZONE).toISOString();
        updates.start_time = finalStartTime;
        updates.end_time = finalEndTime;
      }

      const battlefrontChanged = selectedBattlefrontId !== originalBattlefrontId;
      const dailyChanged = isDaily !== originalIsDaily;

      const durationMs = new Date(finalEndTime).getTime() - new Date(finalStartTime).getTime();
      const durationMinutes = Math.round(durationMs / 60000);
      const recurrenceTime = format(toZonedTime(new Date(finalStartTime), TIMEZONE), 'HH:mm:ss');

      if (battlefrontChanged || dailyChanged || timeEdited) {
        if (selectedBattlefrontId !== 'none') {
          if (linkedMission) {
            await supabase
              .from('missions')
              .update({
                battlefront_id: selectedBattlefrontId,
                title: title || event.title,
                start_at: finalStartTime,
                duration_minutes: durationMinutes,
                is_recurring: isDaily,
                recurrence_time: recurrenceTime,
                recurrence_days: 'mon,tue,wed,thu,fri,sat,sun',
              })
              .eq('id', linkedMission.id);
          } else {
            const { data: newMission } = await supabase
              .from('missions')
              .insert({
                user_id: user.id,
                battlefront_id: selectedBattlefrontId,
                title: title || event.title,
                start_at: finalStartTime,
                duration_minutes: durationMinutes,
                calendar_event_id: event.id,
                is_recurring: isDaily,
                recurrence_time: recurrenceTime,
                recurrence_days: 'mon,tue,wed,thu,fri,sat,sun',
              })
              .select()
              .single();

            if (newMission) {
              updates.mission_id = newMission.id;
              setLinkedMission({
                id: newMission.id,
                battlefront_id: selectedBattlefrontId,
                is_recurring: isDaily,
                recurrence_days: 'mon,tue,wed,thu,fri,sat,sun',
                recurrence_time: recurrenceTime,
              });
            }
          }
        } else if (linkedMission) {
          await supabase.from('missions').delete().eq('id', linkedMission.id);
          updates.mission_id = null;
          setLinkedMission(null);
        }
      }

      if (Object.keys(updates).length > 0) {
        await onSave(event.id, updates);
      }

      if (isDaily && !originalIsDaily && selectedBattlefrontId !== 'none') {
        const numDays = parseInt(dailyDays) || 7;
        const eventsToCreate = [];
        const baseDate = toZonedTime(new Date(finalStartTime), TIMEZONE);

        const missionIdToUse = linkedMission?.id || updates.mission_id;

        for (let i = 1; i < numDays; i++) {
          const nextDate = addDays(baseDate, i);
          const nextStartTime = fromZonedTime(nextDate, TIMEZONE).toISOString();
          const nextEndDate = addDays(toZonedTime(new Date(finalEndTime), TIMEZONE), i);
          const nextEndTime = fromZonedTime(nextEndDate, TIMEZONE).toISOString();

          eventsToCreate.push({
            user_id: user.id,
            title: title || event.title,
            start_time: nextStartTime,
            end_time: nextEndTime,
            mission_id: missionIdToUse,
            battlefront_id: selectedBattlefrontId,
          });
        }

        if (eventsToCreate.length > 0) {
          await supabase.from('calendar_events').insert(eventsToCreate);
          toast.success(`Created ${eventsToCreate.length + 1} daily events`);
        }
      }

      if (onRefresh) {
        onRefresh();
      }

      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!event) return;

    try {
      await onDelete(event.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error in handleDeleteConfirm:', error);
      setShowDeleteConfirm(false);
    }
  };

  const startDate = toZonedTime(new Date(event.start_time), TIMEZONE);

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeEdited(false);
      setTimeError('');
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Event</DialogTitle>
          </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="event-title" className="text-slate-300">
              Title
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
              placeholder="Event title"
            />
          </div>

          <div>
            <Label className="text-slate-300">Date</Label>
            <div className="text-white mt-1">{format(startDate, 'EEEE, MMMM d, yyyy')}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start-time" className="text-slate-300">
                Start Time
              </Label>
              <Input
                id="start-time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setTimeError('');
                  setTimeEdited(true);
                }}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="9:00 or 9am"
              />
            </div>
            <div>
              <Label htmlFor="end-time" className="text-slate-300">
                End Time
              </Label>
              <Input
                id="end-time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setTimeError('');
                  setTimeEdited(true);
                }}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="5:00 or 5pm"
              />
            </div>
          </div>

          {timeError && (
            <div className="text-red-400 text-sm">{timeError}</div>
          )}

          <div>
            <Label className="text-slate-300 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Battlefront
            </Label>
            <Select value={selectedBattlefrontId} onValueChange={setSelectedBattlefrontId}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Select battlefront" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="none" className="text-slate-300">
                  No battlefront
                </SelectItem>
                {battlefronts.map((bf) => (
                  <SelectItem key={bf.id} value={bf.id} className="text-white">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getColorHex(bf.color) }}
                      />
                      <span>{bf.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBattlefrontId !== 'none' && (
              <p className="text-xs text-slate-500 mt-1">
                This event will be added to your missions
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-slate-300" />
              <div>
                <Label className="text-slate-300">Daily Repeat</Label>
                <p className="text-xs text-slate-500">
                  {originalIsDaily ? 'This is a recurring mission' : 'Create same event for multiple days'}
                </p>
              </div>
            </div>
            <Switch
              checked={isDaily}
              onCheckedChange={setIsDaily}
              disabled={originalIsDaily}
            />
          </div>

          {isDaily && !originalIsDaily && (
            <div>
              <Label htmlFor="daily-days" className="text-slate-300">
                Number of Days
              </Label>
              <Input
                id="daily-days"
                type="number"
                min="2"
                max="30"
                value={dailyDays}
                onChange={(e) => setDailyDays(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="7"
              />
              <p className="text-xs text-slate-500 mt-1">
                This will create {dailyDays} calendar events linked to one daily mission
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="event-notes" className="text-slate-300">
              Notes
            </Label>
            <Textarea
              id="event-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[80px]"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button type="button" onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              onClick={handleDeleteClick}
              variant="destructive"
              size="icon"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Event?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
