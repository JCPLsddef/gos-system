'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDate } from '@/lib/timezone';
import Link from 'next/link';

type Mission = {
  id: string;
  title: string;
  attack_date: string;
  due_date: string;
  duration_minutes: number;
  status: 'DONE' | 'NOT_DONE';
  battlefront: {
    id: string;
    name: string;
  };
};

export default function MasterMissionsPage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMissions();
  }, [user]);

  const loadMissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('missions')
        .select(`
          *,
          battlefront:battlefronts!inner(id, name)
        `)
        .eq('user_id', user.id)
        .order('attack_date', { ascending: true });

      if (error) throw error;

      setMissions((data || []).map((m: any) => ({
        ...m,
        battlefront: Array.isArray(m.battlefront) ? m.battlefront[0] : m.battlefront,
      })));
    } catch (error: any) {
      toast.error('Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

  const toggleMission = async (mission: Mission) => {
    try {
      const newStatus = mission.status === 'DONE' ? 'NOT_DONE' : 'DONE';
      const { error } = await supabase
        .from('missions')
        .update({ status: newStatus })
        .eq('id', mission.id);

      if (error) throw error;

      setMissions(missions.map((m) => (m.id === mission.id ? { ...m, status: newStatus } : m)));
    } catch (error: any) {
      toast.error('Failed to update mission');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Loading missions...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white">MASTER MISSIONS</h1>
        <p className="text-slate-400 text-lg mt-1">All missions across battlefronts</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left p-4 text-slate-400 font-semibold">Status</th>
                <th className="text-left p-4 text-slate-400 font-semibold">Mission</th>
                <th className="text-left p-4 text-slate-400 font-semibold">Battlefront</th>
                <th className="text-left p-4 text-slate-400 font-semibold">Due Date</th>
                <th className="text-left p-4 text-slate-400 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {missions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No missions yet. Create missions in your battlefronts.
                  </td>
                </tr>
              ) : (
                missions.map((mission) => (
                  <tr key={mission.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <Checkbox
                        checked={mission.status === 'DONE'}
                        onCheckedChange={() => toggleMission(mission)}
                      />
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-white font-medium ${
                          mission.status === 'DONE' ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {mission.title}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/dashboard/battlefront/${mission.battlefront.id}`}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {mission.battlefront.name}
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-300 text-sm">{formatDate(mission.due_date)}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-slate-300">
                        {mission.duration_minutes}m
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{missions.length}</div>
            <div className="text-slate-400 mt-1">Total Missions</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">
              {missions.filter((m) => m.status === 'DONE').length}
            </div>
            <div className="text-slate-400 mt-1">Completed</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500">
              {missions.filter((m) => m.status === 'NOT_DONE').length}
            </div>
            <div className="text-slate-400 mt-1">Active</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
