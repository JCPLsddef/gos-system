'use client';

import { useState, useRef, useEffect } from 'react';
import { format, addDays, subDays, addMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
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

type DayViewProps = {
  userId: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
};

type CalendarEventWithColor = CalendarEvent & {
  mission?: { battlefront?: { color: string } | null } | null;
};

export function DayView({ userId, currentDate, onDateChange }: DayViewProps) {
  const [events, setEvents] = useState<CalendarEventWithColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithColor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hours = getHourSlots(GRID_START_HOUR, GRID_END_HOUR);

  useEffect(() => {
    loadEvents();
  }, [currentDate, userId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Clean up orphaned calendar events first (events without missions)
      cleanupOrphanedCalendarEvents(userId).then(count => {
        if (count > 0) {
          console.log(`🧹 DayView: Cleaned up ${count} orphaned calendar events`);
        }
      }).catch(err => console.error('Cleanup error:', err));

      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);

      const { data: eventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
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

  const dayEvents = positionEventsForDay(events, currentDate, GRID_START_HOUR, HOUR_HEIGHT_PX);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(subDays(currentDate, 1))}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => onDateChange(new Date())}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(addDays(currentDate, 1))}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h2 className="text-2xl font-bold text-white">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-96 text-white">Loading...</div>
        ) : (
          <div ref={containerRef} className="relative overflow-auto max-h-[600px]">
            <TimeGrid hours={hours} hourHeight={HOUR_HEIGHT_PX} weekDays={[currentDate]} onGridClick={handleCreateEvent} />

            <div className="absolute top-0 left-16 right-0 pointer-events-none">
              <CurrentTimeLine startHour={GRID_START_HOUR} hourHeight={HOUR_HEIGHT_PX} />
            </div>

            <div className="absolute top-0 left-16 right-0 pointer-events-none">
              <div className="relative pointer-events-none" style={{ height: `${hours.length * HOUR_HEIGHT_PX}px` }}>
                {dayEvents.map((block) => (
                  <div key={block.event.id} className="pointer-events-auto">
                    <CalendarEventComponent
                      block={block}
                      hourHeight={HOUR_HEIGHT_PX}
                      onDragEnd={handleDragEnd}
                      onResizeEnd={handleResizeEnd}
                      onClick={(id) => setEditingEvent(events.find((e) => e.id === id) || null)}
                      color={block.event.color}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

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
