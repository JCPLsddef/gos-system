export const BATTLEFRONT_COLORS = [
  'blue',
  'green',
  'orange',
  'red',
  'pink',
  'teal',
  'yellow',
  'cyan',
  'amber',
  'lime',
  'emerald',
  'rose',
  'sky',
  'violet',
  'slate',
] as const;

export type BattlefrontColor = typeof BATTLEFRONT_COLORS[number];

export const COLOR_CLASSES: Record<BattlefrontColor, { bg: string; hover: string; border: string; text: string }> = {
  blue: {
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    border: 'border-blue-400',
    text: 'text-blue-100',
  },
  green: {
    bg: 'bg-green-600',
    hover: 'hover:bg-green-700',
    border: 'border-green-400',
    text: 'text-green-100',
  },
  orange: {
    bg: 'bg-orange-500',
    hover: 'hover:bg-orange-600',
    border: 'border-orange-400',
    text: 'text-orange-100',
  },
  red: {
    bg: 'bg-red-600',
    hover: 'hover:bg-red-700',
    border: 'border-red-400',
    text: 'text-red-100',
  },
  pink: {
    bg: 'bg-pink-500',
    hover: 'hover:bg-pink-600',
    border: 'border-pink-400',
    text: 'text-pink-100',
  },
  teal: {
    bg: 'bg-teal-500',
    hover: 'hover:bg-teal-600',
    border: 'border-teal-400',
    text: 'text-teal-100',
  },
  yellow: {
    bg: 'bg-yellow-500',
    hover: 'hover:bg-yellow-600',
    border: 'border-yellow-300',
    text: 'text-yellow-900',
  },
  cyan: {
    bg: 'bg-cyan-500',
    hover: 'hover:bg-cyan-600',
    border: 'border-cyan-400',
    text: 'text-cyan-100',
  },
  amber: {
    bg: 'bg-amber-500',
    hover: 'hover:bg-amber-600',
    border: 'border-amber-400',
    text: 'text-amber-100',
  },
  lime: {
    bg: 'bg-lime-500',
    hover: 'hover:bg-lime-600',
    border: 'border-lime-400',
    text: 'text-lime-100',
  },
  emerald: {
    bg: 'bg-emerald-500',
    hover: 'hover:bg-emerald-600',
    border: 'border-emerald-400',
    text: 'text-emerald-100',
  },
  rose: {
    bg: 'bg-rose-500',
    hover: 'hover:bg-rose-600',
    border: 'border-rose-400',
    text: 'text-rose-100',
  },
  sky: {
    bg: 'bg-sky-500',
    hover: 'hover:bg-sky-600',
    border: 'border-sky-400',
    text: 'text-sky-100',
  },
  violet: {
    bg: 'bg-violet-500',
    hover: 'hover:bg-violet-600',
    border: 'border-violet-400',
    text: 'text-violet-100',
  },
  slate: {
    bg: 'bg-slate-500',
    hover: 'hover:bg-slate-600',
    border: 'border-slate-400',
    text: 'text-slate-100',
  },
};

export const COLOR_DISPLAY_CLASSES: Record<BattlefrontColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
  yellow: 'bg-yellow-400',
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
  lime: 'bg-lime-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  slate: 'bg-slate-400',
};

export const COLOR_HEX_VALUES: Record<BattlefrontColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  pink: '#ec4899',
  teal: '#14b8a6',
  yellow: '#facc15',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  lime: '#84cc16',
  emerald: '#10b981',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  slate: '#94a3b8',
};

export function getColorClasses(color: string | undefined | null): { bg: string; hover: string; border: string; text: string } {
  const validColor = (color && color in COLOR_CLASSES) ? color as BattlefrontColor : 'blue';
  return COLOR_CLASSES[validColor];
}

export function getColorDisplayClass(color: string | undefined | null): string {
  if (!color || !(color in COLOR_DISPLAY_CLASSES)) {
    return 'bg-slate-400';
  }
  return COLOR_DISPLAY_CLASSES[color as BattlefrontColor];
}

export function getColorHex(color: string | undefined | null): string {
  if (!color || !(color in COLOR_HEX_VALUES)) {
    return '#94a3b8';
  }
  return COLOR_HEX_VALUES[color as BattlefrontColor];
}
