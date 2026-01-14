'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getTorontoDate } from '@/lib/date-utils';
import { Calendar, Clock } from 'lucide-react';

type Mission = {
  id: string;
  title: string;
  duration_minutes: number;
  due_date?: string | null;
  start_at?: string | null;
};

type DeployMissionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | null;
  onDeploy: (missionId: string, data: { start_at: string; duration_minutes: number; due_date?: string | null }) => Promise<void>;
};

export function DeployMissionModal({ isOpen, onClose, mission, onDeploy }: DeployMissionModalProps) {
  const [date, setDate] = useState(() => format(getTorontoDate(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [dueDate, setDueDate] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  const handleOpen = (open: boolean) => {
    if (open && mission) {
      setDuration(mission.duration_minutes.toString());
      setDueDate(mission.due_date || '');
      if (mission.start_at) {
        const startDate = new Date(mission.start_at);
        setDate(format(startDate, 'yyyy-MM-dd'));
        setStartTime(format(startDate, 'HH:mm'));
      } else {
        setDate(format(getTorontoDate(), 'yyyy-MM-dd'));
        setStartTime('09:00');
      }
    }
    if (!open) {
      onClose();
    }
  };

  const handleDeploy = async () => {
    if (!mission) return;

    if (!date || !startTime) {
      toast.error('Please select date and time');
      return;
    }

    setIsDeploying(true);

    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(date);
      startDate.setHours(hours, minutes, 0, 0);

      await onDeploy(mission.id, {
        start_at: startDate.toISOString(),
        duration_minutes: parseInt(duration) || 60,
        due_date: dueDate || null,
      });

      toast.success(mission.start_at ? 'Mission rescheduled' : 'Mission deployed to schedule');
      onClose();
    } catch (error) {
      toast.error('Failed to deploy mission');
    } finally {
      setIsDeploying(false);
    }
  };

  if (!mission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            {mission.start_at ? 'Reschedule Mission' : 'Deploy Mission'}
          </DialogTitle>
          <p className="text-slate-400 text-sm mt-2">{mission.title}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="deploy-date" className="text-slate-300">
                Date *
              </Label>
              <Input
                id="deploy-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="deploy-time" className="text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Start Time *
              </Label>
              <Input
                id="deploy-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="deploy-duration" className="text-slate-300">
              Duration (minutes)
            </Label>
            <Input
              id="deploy-duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
              placeholder="60"
              min="5"
              max="480"
            />
          </div>

          <div>
            <Label htmlFor="deploy-due-date" className="text-slate-300">
              Due Date (optional)
            </Label>
            <Input
              id="deploy-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
            />
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-400">
              This mission will be added to your Master Missions and Calendar at the scheduled time.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeploying}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isDeploying ? 'Deploying...' : mission.start_at ? 'Reschedule' : 'Deploy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
