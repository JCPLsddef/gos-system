'use client';

import { useAuth } from '@/lib/auth-context';
import { Shield } from 'lucide-react';
import { CodeOfHonor } from '@/components/war-room/code-of-honor';
import { NonNegotiables } from '@/components/war-room/non-negotiables';
import { Disqualifiers } from '@/components/war-room/disqualifiers';
import { WeeklyReview } from '@/components/war-room/weekly-review';

export default function WarRoomPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Please log in</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-red-400" />
        <div>
          <h1 className="text-4xl font-bold text-white">WAR ROOM</h1>
          <p className="text-slate-400 text-lg mt-1">Identity & Discipline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CodeOfHonor userId={user.id} />
        <NonNegotiables userId={user.id} />
      </div>

      <Disqualifiers userId={user.id} />

      <WeeklyReview userId={user.id} />
    </div>
  );
}
