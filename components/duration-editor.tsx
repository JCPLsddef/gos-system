'use client';

import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { parseDuration, formatDuration, validateDuration } from '@/lib/duration-parser';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type DurationEditorProps = {
  initialDuration: number;
  onSave: (duration: number) => Promise<void>;
  className?: string;
};

export function DurationEditor({ initialDuration, onSave, className }: DurationEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!isEditing) {
      setInputValue(initialDuration.toString());
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    const parsed = parseDuration(inputValue);
    const validation = validateDuration(parsed);

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid duration');
      inputRef.current?.select();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(parsed!);
      toast.success('Duration updated');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update duration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim() && !isSaving) {
      handleSave();
    } else {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="relative inline-flex items-center gap-1">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-20 h-7 text-sm bg-slate-800 border-slate-600 text-white px-2"
          placeholder="60 or 1h"
          disabled={isSaving}
        />
        {isSaving && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`cursor-pointer hover:bg-slate-700/50 transition-colors ${className || 'text-slate-300'}`}
      onClick={handleClick}
    >
      {formatDuration(initialDuration)}
    </Badge>
  );
}
