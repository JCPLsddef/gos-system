'use client';

import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BattlefrontPage() {
  const params = useParams();
  const battlefrontId = params.id as string;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/warmap">
          <Button variant="ghost" size="icon" className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold text-white">BATTLEFRONT DETAIL</h1>
          <p className="text-slate-400 text-sm mt-1">ID: {battlefrontId}</p>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 p-8">
        <h3 className="text-xl text-white mb-4">Binary Exit Target</h3>
        <p className="text-slate-400">Define clear success criteria for this battlefront</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Checkpoints</h3>
          <p className="text-slate-400 text-sm">Create ordered milestones</p>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Missions</h3>
          <p className="text-slate-400 text-sm">Time-bound execution tasks</p>
        </Card>
      </div>
    </div>
  );
}
