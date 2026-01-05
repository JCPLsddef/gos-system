'use client';

import { Card } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-4xl font-bold text-white">NOTIFICATIONS</h1>
          <p className="text-slate-400 text-lg mt-1">Strategic alerts and reminders</p>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
        <h3 className="text-xl text-white mb-2">Notification Center</h3>
        <p className="text-slate-400">No notifications yet</p>
      </Card>
    </div>
  );
}
