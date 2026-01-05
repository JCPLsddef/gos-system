'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { getWeekStart, getWeekEnd, formatDate } from '@/lib/timezone';
import { Trophy, Target, TrendingUp } from 'lucide-react';

export default function ScoreboardPage() {
  const { user } = useAuth();
  const [weeklyStats, setWeeklyStats] = useState({
    totalMissions: 0,
    completedMissions: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd();

      const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .gte('attack_date', weekStart)
        .lte('attack_date', weekEnd);

      if (error) throw error;

      const totalMissions = missions?.length || 0;
      const completedMissions = missions?.filter((m) => m.status === 'DONE').length || 0;
      const completionRate = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;

      setWeeklyStats({ totalMissions, completedMissions, completionRate });
    } catch (error: any) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Loading scoreboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white">SCOREBOARD</h1>
        <p className="text-slate-400 text-lg mt-1">Weekly Performance & Execution Metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm">This Week</p>
              <p className="text-4xl font-bold text-white mt-2">{weeklyStats.totalMissions}</p>
              <p className="text-slate-300 mt-1">Total Missions</p>
            </div>
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm">Completed</p>
              <p className="text-4xl font-bold text-green-500 mt-2">{weeklyStats.completedMissions}</p>
              <p className="text-slate-300 mt-1">Missions Done</p>
            </div>
            <div className="p-3 bg-green-600/20 rounded-lg">
              <Trophy className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm">Completion Rate</p>
              <p className="text-4xl font-bold text-white mt-2">{weeklyStats.completionRate.toFixed(0)}%</p>
              <p className="text-slate-300 mt-1">Success Rate</p>
            </div>
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Performance Summary</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded bg-slate-800/50">
            <span className="text-slate-300">Week Start</span>
            <span className="text-white font-medium">{formatDate(getWeekStart())}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded bg-slate-800/50">
            <span className="text-slate-300">Week End</span>
            <span className="text-white font-medium">{formatDate(getWeekEnd())}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
