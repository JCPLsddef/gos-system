'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mission } from '@/lib/missions-service';
import { format } from 'date-fns';
import { getTorontoDate } from '@/lib/date-utils';
import { Trash2 } from 'lucide-react';

type Battlefront = {
  id: string;
  name: string;
};

type MissionQuickEditProps = {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (missionId: string, updates: Partial<Mission>) => Promise<void>;
  onDelete: (missionId: string) => Promise<void>;
  battlefronts: Battlefront[];
};

export function MissionQuickEdit({
  mission,
  isOpen,
  onClose,
  onSave,
  onDelete,
  battlefronts,
}: MissionQuickEditProps) {
  const [title, setTitle] = useState('');
  const [battlefrontId, setBattlefrontId] = useState<string>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (mission) {
      setTitle(mission.title);
      setBattlefrontId(mission.battlefront_id || '__none__');

      if (mission.start_at) {
        const startDate = getTorontoDate(new Date(mission.start_at));
        setDate(format(startDate, 'yyyy-MM-dd'));
        setStartTime(format(startDate, 'HH:mm'));
      } else {
        setDate('');
        setStartTime('');
      }

      setDuration(mission.duration_minutes.toString());
    }
  }, [mission]);

  if (!mission) return null;

  const handleSave = async () => {
    try {
      let start_at: string | undefined;

      if (date && startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date(date);
        startDate.setHours(hours, minutes, 0, 0);
        start_at = startDate.toISOString();
      }

      await onSave(mission.id, {
        title,
        battlefront_id: battlefrontId === '__none__' ? undefined : battlefrontId,
        start_at,
        duration_minutes: parseInt(duration) || 60,
      });

      onClose();
    } catch (error) {
      toast.error('Failed to update mission');
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this mission?')) {
      try {
        await onDelete(mission.id);
        onClose();
      } catch (error) {
        toast.error('Failed to delete mission');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Mission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="mission-title" className="text-slate-300">
              Title
            </Label>
            <Input
              id="mission-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
              placeholder="Mission title"
            />
          </div>

          <div>
            <Label htmlFor="mission-battlefront" className="text-slate-300">
              Battlefront
            </Label>
            <Select value={battlefrontId || '__none__'} onValueChange={setBattlefrontId}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Select battlefront" />
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
              <Label htmlFor="mission-date" className="text-slate-300">
                Date
              </Label>
              <Input
                id="mission-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mission-time" className="text-slate-300">
                Start Time
              </Label>
              <Input
                id="mission-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="mission-duration" className="text-slate-300">
              Duration (minutes)
            </Label>
            <Input
              id="mission-duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
              placeholder="60"
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="icon" className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
