'use client';

import { Card } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function WarRoomPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-red-400" />
        <div>
          <h1 className="text-4xl font-bold text-white">WAR ROOM</h1>
          <p className="text-slate-400 text-lg mt-1">Identity & Discipline</p>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
        <h3 className="text-xl text-white mb-2">Code of Honor</h3>
        <p className="text-slate-400">Define your principles and track commitments</p>
      </Card>
    </div>
  );
}
