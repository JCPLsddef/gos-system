'use client';

import { useState, useEffect } from 'react';
import { format, setHours, setMinutes, startOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIMEZONE = 'America/Toronto';

type DateTimePickerProps = {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
};

const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = [0, 15, 30, 45];

export function DateTimePicker({ value, onChange, placeholder = 'Select date & time' }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedHour, setSelectedHour] = useState<string>('9');
  const [selectedMinute, setSelectedMinute] = useState<string>('0');

  useEffect(() => {
    if (value) {
      try {
        const utcDate = new Date(value);
        if (!isNaN(utcDate.getTime())) {
          const localDate = toZonedTime(utcDate, TIMEZONE);
          setSelectedDate(startOfDay(localDate));
          setSelectedHour(localDate.getHours().toString());
          setSelectedMinute(localDate.getMinutes().toString());
        }
      } catch {
        setSelectedDate(undefined);
      }
    } else {
      setSelectedDate(undefined);
      setSelectedHour('9');
      setSelectedMinute('0');
    }
  }, [value]);

  const handleApply = () => {
    if (selectedDate) {
      let localDate = new Date(selectedDate);
      localDate = setHours(localDate, parseInt(selectedHour));
      localDate = setMinutes(localDate, parseInt(selectedMinute));
      localDate.setSeconds(0);
      localDate.setMilliseconds(0);

      const utcDate = fromZonedTime(localDate, TIMEZONE);
      onChange(utcDate.toISOString());
    }
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSelectedDate(undefined);
    setSelectedHour('9');
    setSelectedMinute('0');
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return null;
    try {
      const utcDate = new Date(value);
      const localDate = toZonedTime(utcDate, TIMEZONE);
      return format(localDate, 'd MMM yyyy HH:mm');
    } catch {
      return null;
    }
  };

  const displayValue = getDisplayValue();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal bg-slate-800 border-slate-600 hover:bg-slate-700 ${
            !displayValue ? 'text-slate-400' : 'text-white'
          }`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-slate-900 border-2 border-slate-700 shadow-2xl" align="start">
        <div className="p-4 space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            initialFocus
            className="rounded-md"
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-4',
              caption: 'flex justify-center pt-1 relative items-center text-white',
              caption_label: 'text-sm font-medium text-white',
              nav: 'space-x-1 flex items-center',
              nav_button: 'h-7 w-7 bg-slate-800 p-0 opacity-70 hover:opacity-100 hover:bg-slate-700 rounded-md border border-slate-600 inline-flex items-center justify-center',
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'text-slate-400 rounded-md w-9 font-normal text-[0.8rem]',
              row: 'flex w-full mt-2',
              cell: 'h-9 w-9 text-center text-sm p-0 relative',
              day: 'h-9 w-9 p-0 font-normal text-white hover:bg-slate-700 rounded-md inline-flex items-center justify-center',
              day_selected: 'bg-blue-600 text-white hover:bg-blue-700',
              day_today: 'bg-slate-700 text-white',
              day_outside: 'text-slate-500 opacity-50',
              day_disabled: 'text-slate-600 opacity-50',
              day_hidden: 'invisible',
            }}
          />

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Hour</label>
              <Select value={selectedHour} onValueChange={setSelectedHour}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-48">
                  {hours.map((h) => (
                    <SelectItem key={h} value={h.toString()} className="text-white hover:bg-slate-700">
                      {h.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-white text-xl mt-5">:</span>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Minute</label>
              <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m.toString()} className="text-white hover:bg-slate-700">
                      {m.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClear}
              className="flex-1 bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              onClick={handleApply}
              disabled={!selectedDate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
