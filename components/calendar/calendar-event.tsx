'use client';

import { TimeBlock } from '@/lib/calendar-utils';
import { getColorHex } from '@/lib/color-mapping';
import { useState, useRef, useEffect } from 'react';
import { Target } from 'lucide-react';

type CalendarEventProps = {
  block: TimeBlock;
  hourHeight: number;
  onDragEnd: (eventId: string, newStartMinutes: number) => void;
  onResizeEnd: (eventId: string, newDurationMinutes: number) => void;
  onClick: (eventId: string) => void;
  isWeekView?: boolean;
  color?: string | null;
};

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export function CalendarEvent({ block, hourHeight, onDragEnd, onResizeEnd, onClick, isWeekView = false, color }: CalendarEventProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [originalTop, setOriginalTop] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const eventRef = useRef<HTMLDivElement>(null);

  const eventColor = color || block.event.color || null;
  const bgColor = getColorHex(eventColor);
  const borderColor = adjustColorBrightness(bgColor, 30);
  const hasMission = !!block.event.mission_id;

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }

    setIsDragging(true);
    setDragStartY(e.clientY);
    setOriginalTop(block.top);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setDragStartY(e.clientY);
    setOriginalHeight(block.height);
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaY = e.clientY - dragStartY;
        const newTop = Math.max(0, originalTop + deltaY);
        if (eventRef.current) {
          eventRef.current.style.top = `${newTop}px`;
        }
      } else if (isResizing) {
        const deltaY = e.clientY - dragStartY;
        const newHeight = Math.max(80, originalHeight + deltaY);
        if (eventRef.current) {
          eventRef.current.style.height = `${newHeight}px`;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        const deltaY = e.clientY - dragStartY;
        const movedDistance = Math.abs(deltaY);

        if (movedDistance > 5) {
          const newTop = Math.max(0, originalTop + deltaY);
          const newStartMinutes = Math.round((newTop / hourHeight) * 60);
          onDragEnd(block.event.id, newStartMinutes);
        }
        setIsDragging(false);
      } else if (isResizing) {
        const deltaY = e.clientY - dragStartY;
        const resizedDistance = Math.abs(deltaY);

        if (resizedDistance > 5) {
          const newHeight = Math.max(80, originalHeight + deltaY);
          const newDurationMinutes = Math.round((newHeight / hourHeight) * 60);
          onResizeEnd(block.event.id, newDurationMinutes);
        }
        setIsResizing(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStartY, originalTop, originalHeight, hourHeight, block.event.id, onDragEnd, onResizeEnd]);

  return (
    <div
      ref={eventRef}
      className={`absolute rounded-lg overflow-hidden cursor-move shadow-lg hover:shadow-xl hover:brightness-110 transition-all ${
        isDragging || isResizing ? 'z-50 opacity-75' : 'z-10'
      }`}
      style={{
        top: `${block.top}px`,
        height: `${block.height}px`,
        left: `calc(${block.left}% + 4px)`,
        width: `calc(${block.width}% - 8px)`,
        minHeight: '80px',
        backgroundColor: bgColor,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: borderColor,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (!isDragging && !isResizing) {
          e.stopPropagation();
          onClick(block.event.id);
        }
      }}
    >
      <div className="px-3 py-2.5 h-full flex flex-col justify-center overflow-hidden">
        <div className={`${isWeekView ? 'text-base sm:text-lg md:text-lg' : 'text-base sm:text-base'} text-white font-bold leading-tight flex items-start gap-2`}>
          {hasMission && <Target className="w-4 h-4 flex-shrink-0 mt-1" />}
          <span className="line-clamp-4 break-words">{block.event.title}</span>
        </div>
      </div>
      <div
        className="resize-handle absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-white/20 transition-colors"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}
