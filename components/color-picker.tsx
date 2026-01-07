'use client';

import { BATTLEFRONT_COLORS, COLOR_HEX_VALUES, BattlefrontColor } from '@/lib/color-mapping';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
};

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const currentColor = (value && value in COLOR_HEX_VALUES) ? value as BattlefrontColor : 'blue';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="w-10 h-10 p-0 border-2 border-slate-600 hover:border-slate-500"
        >
          <div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: COLOR_HEX_VALUES[currentColor] }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 bg-slate-900 border-2 border-slate-700" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-300">Select Color</p>
          <div className="grid grid-cols-5 gap-2">
            {BATTLEFRONT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                className={`w-10 h-10 rounded-full transition-all hover:scale-110 ${
                  value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                }`}
                style={{ backgroundColor: COLOR_HEX_VALUES[color] }}
                title={color.charAt(0).toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center capitalize">{currentColor}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
