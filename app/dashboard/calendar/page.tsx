'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type CalendarEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  mission_id?: string;
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      setLoading(true);

      // Get today's events
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const { data: today } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', startOfToday.toISOString())
        .lte('start_time', endOfToday.toISOString())
        .order('start_time', { ascending: true });

      setTodayEvents(today || []);

      // Get this week's events
      const startOfWeek = new Date();
      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const { data: week } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', startOfWeek.toISOString())
        .lte('start_time', endOfWeek.toISOString())
        .order('start_time', { ascending: true });

      setWeekEvents(week || []);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-4xl font-bold text-white">CALENDAR</h1>
          <p className="text-slate-400 text-lg mt-1">Hourly time blocks (EST)</p>
        </div>
      </div>

      {/* Today's Events */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Today</h2>
        {loading ? (
          <p className="text-slate-400">Loading events...</p>
        ) : todayEvents.length === 0 ? (
          <p className="text-slate-400">No events scheduled for today.</p>
        ) : (
          <div className="space-y-3">
            {todayEvents.map((event) => (
              <div
                key={event.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-slate-400 mt-1">{event.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {formatTime(event.start_time)} - {formatTime(event.end_time)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* This Week's Events */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">This Week</h2>
        {loading ? (
          <p className="text-slate-400">Loading events...</p>
        ) : weekEvents.length === 0 ? (
          <p className="text-slate-400">No events scheduled for this week.</p>
        ) : (
          <div className="space-y-3">
            {weekEvents.map((event) => (
              <div
                key={event.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                        {formatDate(event.start_time)}
                      </span>
                      <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                    </div>
                    {event.description && (
                      <p className="text-sm text-slate-400 mt-2">{event.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {formatTime(event.start_time)} - {formatTime(event.end_time)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
