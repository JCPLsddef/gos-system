'use client';

import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-4xl font-bold text-white">CALENDAR</h1>
          <p className="text-slate-400 text-lg mt-1">Hourly time blocks (EST)</p>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
        <h3 className="text-xl text-white mb-2">Command Schedule</h3>
        <p className="text-slate-400">Schedule your execution time blocks</p>
      </Card>
    </div>
  );
}
