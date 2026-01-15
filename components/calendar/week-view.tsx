'use client';

import { useState, useRef, useEffect } from 'react';
import { format, addMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  getWeekDays,
  getHourSlots,
  positionEventsForDay,
  CalendarEvent,
  updateEventTimes,
  snapToGrid,
} from '@/lib/calendar-utils';
import { HOUR_HEIGHT_PX, GRID_START_HOUR, GRID_END_HOUR } from '@/lib/calendarLayout';
import { TimeGrid } from './time-grid';
import { CalendarEvent as CalendarEventComponent } from './calendar-event';
import { EventEditor } from './event-editor';
import { CurrentTimeLine } from './current-time-line';
import { supabase } from '@/lib/supabase';
import { startOfDay, endOfDay } from 'date-fns';
import { updateMissionFromCalendarEvent, cleanupOrphanedCalendarEvents } from '@/lib/mission-calendar-sync';
import { createMission } from '@/lib/missions-service';
import { isPreviewMode } from '@/lib/preview-mode';
import { mockCalendarEvents } from '@/lib/mockData';

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
  const hours = getHourSlots(GRID_START_HOUR, GRID_END_HOUR);

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
      // Clean up orphaned calendar events first (events without missions)
      cleanupOrphanedCalendarEvents(userId).then(count => {
        if (count > 0) {
          console.log(`🧹 WeekView: Cleaned up ${count} orphaned calendar events`);
        }
      }).catch(err => console.error('Cleanup error:', err));

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
      const durationMinutes = 60;

      // Calculate start and end times
      const startHour = Math.floor(snapped / 60);
      const startMinute = snapped % 60;
      const startTime = new Date(day);
      startTime.setHours(startHour, startMinute, 0, 0);
      const endTime = addMinutes(startTime, durationMinutes);

      // FIRST: Create mission in missions table (Master Missions is source of truth)
      const mission = await createMission(userId, {
        title: 'New Event',
        duration_minutes: durationMinutes,
        start_at: startTime.toISOString(),
      });

      console.log('📋 Created mission first:', mission.id);

      // THEN: Create calendar event linked to the mission
      const { data: eventData, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userId,
          title: 'New Event',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          mission_id: mission.id, // Link to mission!
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Update mission with calendar_event_id
      await supabase
        .from('missions')
        .update({ calendar_event_id: eventData.id })
        .eq('id', mission.id);

      console.log('📅 Created calendar event:', eventData.id, 'linked to mission:', mission.id);

      setEvents([...events, eventData as CalendarEventWithColor]);
      toast.success('Event created');
      setEditingEvent(eventData as CalendarEventWithColor);
    } catch (error: any) {
      console.error('Failed to create event:', error);
      toast.error('Failed to create event');
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
      const event = events.find((e) => e.id === eventId);

      // If event has a mission, delete the mission first (which will cascade delete the calendar event)
      if (event?.mission_id) {
        console.log('🗑️ Deleting mission:', event.mission_id, 'and its calendar event:', eventId);
        // Delete mission first - this will cascade delete calendar event
        const { error: missionError } = await supabase
          .from('missions')
          .delete()
          .eq('id', event.mission_id);

        if (missionError) {
          console.error('Error deleting mission:', missionError);
        }
      }

      // Delete the calendar event (in case mission delete didn't cascade)
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
                <TimeGrid hours={hours} hourHeight={HOUR_HEIGHT_PX} weekDays={weekDays} onGridClick={handleCreateEvent} />

                <div className="absolute top-0 left-12 md:left-16 right-0 pointer-events-none">
                  <div className="grid grid-cols-7 h-full">
                    {weekDays.map((day, dayIndex) => {
                      const dayEvents = positionEventsForDay(events, day, GRID_START_HOUR, HOUR_HEIGHT_PX);

                      return (
                        <div key={dayIndex} className="relative pointer-events-none min-w-[110px] sm:min-w-0" style={{ height: `${hours.length * HOUR_HEIGHT_PX}px` }}>
                          {dayEvents.map((block) => (
                            <div key={block.event.id} className="pointer-events-auto">
                              <CalendarEventComponent
                                block={block}
                                hourHeight={HOUR_HEIGHT_PX}
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
