'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Layers } from 'lucide-react';

type Battlefront = {
  id: string;
  name: string;
};

type NewTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    battlefront_id?: string;
    duration_minutes: number;
  }) => Promise<void>;
  battlefronts: Battlefront[];
};

export function NewTemplateModal({ isOpen, onClose, onCreate, battlefronts }: NewTemplateModalProps) {
  const [title, setTitle] = useState('');
  const [battlefrontId, setBattlefrontId] = useState<string>('__none__');
  const [duration, setDuration] = useState('60');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Template title is required');
      return;
    }

    setIsCreating(true);
    try {
      await onCreate({
        title: title.trim(),
        battlefront_id: battlefrontId === '__none__' ? undefined : battlefrontId,
        duration_minutes: parseInt(duration) || 60,
      });

      setTitle('');
      setBattlefrontId('__none__');
      setDuration('60');
      onClose();
    } catch (error) {
      toast.error('Failed to create template');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            New Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="template-title" className="text-slate-300">
              Template Name *
            </Label>
            <Input
              id="template-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
              placeholder="e.g., Morning Workout, Deep Work Session"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) handleCreate();
              }}
            />
          </div>

          <div>
            <Label htmlFor="template-battlefront" className="text-slate-300">
              Battlefront (optional)
            </Label>
            <Select value={battlefrontId} onValueChange={setBattlefrontId}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Select battlefront (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="__none__" className="text-white">No battlefront</SelectItem>
                {battlefronts.map((bf) => (
                  <SelectItem key={bf.id} value={bf.id} className="text-white">
                    {bf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="template-duration" className="text-slate-300">
              Default Duration (minutes)
            </Label>
            <Input
              id="template-duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
              placeholder="60"
              min="5"
              max="480"
            />
          </div>

          <p className="text-slate-400 text-sm">
            Templates are reusable mission blueprints. Click "Schedule" on a template to create an actual mission with a specific date/time.
          </p>

          <div className="flex items-center gap-2 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
