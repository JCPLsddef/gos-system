'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  getWeekDays,
  getHourSlots,
  positionEventsForDay,
  CalendarEvent,
  createEvent,
  updateEventTimes,
  snapToGrid,
} from '@/lib/calendar-utils';
import { TimeGrid } from './time-grid';
import { CalendarEvent as CalendarEventComponent } from './calendar-event';
import { EventEditor } from './event-editor';
import { CurrentTimeLine } from './current-time-line';
import { supabase } from '@/lib/supabase';
import { startOfDay, endOfDay } from 'date-fns';
import { updateMissionFromCalendarEvent } from '@/lib/mission-calendar-sync';
import { isPreviewMode } from '@/lib/preview-mode';
import { mockCalendarEvents } from '@/lib/mockData';

const HOUR_HEIGHT = 80;
const START_HOUR = 4;
const END_HOUR = 22;

type WeekViewProps = {
  userId: string;
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
};

type CalendarEventWithColor = CalendarEvent & {
  mission?: { battlefront?: { color: string } | null } | null;
};

export function WeekView({ userId, currentWeekStart, onWeekChange }: WeekViewProps) {
  const [events, setEvents] = useState<CalendarEventWithColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithColor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const weekDays = getWeekDays(currentWeekStart);
  const hours = getHourSlots(START_HOUR, END_HOUR);

  useEffect(() => {
    loadEvents();
  }, [currentWeekStart, userId]);

  const loadEvents = async () => {
    setLoading(true);

    // PREVIEW MODE: Use mock data for visual validation
    if (isPreviewMode()) {
      const eventsWithColor = mockCalendarEvents.map((e: any) => ({
        ...e,
        color: e.mission_id ? 'blue' : null,
      }));
      setEvents(eventsWithColor);
      setLoading(false);
      return;
    }

    // PRODUCTION: Real Supabase queries
    try {
      const weekStart = startOfDay(weekDays[0]);
      const weekEnd = endOfDay(weekDays[6]);

      const { data: eventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time');

      if (eventsError) throw eventsError;

      const eventsWithMissions = eventsData?.filter((e) => e.mission_id) || [];
      const missionIds = eventsWithMissions.map((e) => e.mission_id);

      let missionColors: Record<string, string> = {};
      if (missionIds.length > 0) {
        const { data: missionsData } = await supabase
          .from('missions')
          .select('id, battlefront_id')
          .in('id', missionIds);

        const battlefrontIds = missionsData?.map((m) => m.battlefront_id).filter(Boolean) || [];

        if (battlefrontIds.length > 0) {
          const { data: battlefrontsData } = await supabase
            .from('battlefronts')
            .select('id, color')
            .in('id', battlefrontIds);

          const battlefrontColorMap: Record<string, string> = {};
          battlefrontsData?.forEach((b) => {
            battlefrontColorMap[b.id] = b.color;
          });

          missionsData?.forEach((m) => {
            if (m.battlefront_id && battlefrontColorMap[m.battlefront_id]) {
              missionColors[m.id] = battlefrontColorMap[m.battlefront_id];
            }
          });
        }
      }

      const eventsWithColor = (eventsData || []).map((e: any) => ({
        ...e,
        color: e.mission_id ? missionColors[e.mission_id] || null : null,
      }));

      setEvents(eventsWithColor);
    } catch (error: any) {
      toast.error('Failed to load events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (day: Date, startMinutes: number) => {
    try {
      const snapped = snapToGrid(startMinutes, 15);
      const newEvent = createEvent(userId, 'New Event', day, snapped, 60);

      const { data, error } = await supabase.from('calendar_events').insert(newEvent).select().single();

      if (error) throw error;

      setEvents([...events, data as CalendarEventWithColor]);
      toast.success('Event created');
      setEditingEvent(data as CalendarEventWithColor);
    } catch (error: any) {
      toast.error('Failed to create event');
      console.error(error);
    }
  };

  const handleDragEnd = async (eventId: string, newStartMinutes: number) => {
    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const snapped = snapToGrid(newStartMinutes, 15);
      const updates = updateEventTimes(event, null, snapped, null);

      const { error } = await supabase.from('calendar_events').update(updates).eq('id', eventId);

      if (error) throw error;

      setEvents(events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)));

      if (event.mission_id && updates.start_time && updates.end_time) {
        await updateMissionFromCalendarEvent(eventId, updates.start_time, updates.end_time);
      }

      toast.success('Event moved');
    } catch (error: any) {
      toast.error('Failed to move event');
      console.error(error);
      loadEvents();
    }
  };

  const handleResizeEnd = async (eventId: string, newDurationMinutes: number) => {
    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const snapped = snapToGrid(newDurationMinutes, 15);
      const updates = updateEventTimes(event, null, null, snapped);

      const { error } = await supabase.from('calendar_events').update(updates).eq('id', eventId);

      if (error) throw error;

      setEvents(events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)));

      if (event.mission_id && updates.start_time && updates.end_time) {
        await updateMissionFromCalendarEvent(eventId, updates.start_time, updates.end_time);
      }

      toast.success('Event resized');
    } catch (error: any) {
      toast.error('Failed to resize event');
      console.error(error);
      loadEvents();
    }
  };

  const handleSaveEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const { error } = await supabase.from('calendar_events').update(updates).eq('id', eventId);

      if (error) throw error;

      setEvents(events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)));

      const event = events.find((e) => e.id === eventId);
      if (event?.mission_id && updates.start_time && updates.end_time) {
        await updateMissionFromCalendarEvent(eventId, updates.start_time, updates.end_time);
      }

      toast.success('Event updated');
    } catch (error: any) {
      toast.error('Failed to update event');
      console.error(error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);

      if (error) throw error;

      setEvents(events.filter((e) => e.id !== eventId));
      toast.success('Event deleted');
    } catch (error: any) {
      toast.error(`Failed to delete event: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekChange(new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 h-8 w-8 md:h-10 md:w-10"
          >
            <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => onWeekChange(new Date())}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white text-xs md:text-sm px-3 md:px-4 h-8 md:h-10"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekChange(new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 h-8 w-8 md:h-10 md:w-10"
          >
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">
          {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
        </h2>
      </div>

      {/* Mobile: single shared horizontal scroll container for header + grid */}
      <div className="overflow-x-auto sm:overflow-x-visible scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[840px] sm:min-w-0 space-y-4">
          {/* Week header row */}
          <div className="flex">
            <div className="w-12 md:w-16 flex-shrink-0" />
            <div className="flex-1 grid grid-cols-7 gap-px bg-slate-700">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="bg-slate-900 p-1 md:p-2 text-center min-w-[110px] sm:min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-400 uppercase">{format(day, 'EEE')}</div>
                  <div className="text-sm sm:text-base md:text-xl font-bold text-white mt-0.5 md:mt-1">{format(day, 'd')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar grid */}
          <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-96 text-white">Loading...</div>
            ) : (
              <div ref={containerRef} className="relative overflow-y-auto max-h-[600px]">
                <TimeGrid hours={hours} hourHeight={HOUR_HEIGHT} weekDays={weekDays} onGridClick={handleCreateEvent} />

                <div className="absolute top-0 left-12 md:left-16 right-0 pointer-events-none">
                  <div className="grid grid-cols-7 h-full">
                    {weekDays.map((day, dayIndex) => {
                      const dayEvents = positionEventsForDay(events, day, START_HOUR, HOUR_HEIGHT);

                      return (
                        <div key={dayIndex} className="relative pointer-events-none min-w-[110px] sm:min-w-0" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
                          {dayEvents.map((block) => (
                            <div key={block.event.id} className="pointer-events-auto">
                              <CalendarEventComponent
                                block={block}
                                hourHeight={HOUR_HEIGHT}
                                onDragEnd={handleDragEnd}
                                onResizeEnd={handleResizeEnd}
                                onClick={(id) => setEditingEvent(events.find((e) => e.id === id) || null)}
                                isWeekView={true}
                                color={block.event.color}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <EventEditor
        event={editingEvent}
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onRefresh={loadEvents}
      />
    </div>
  );
}
