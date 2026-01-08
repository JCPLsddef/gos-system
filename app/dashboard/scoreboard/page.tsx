'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  ChevronLeft,
  ChevronRight,
  Target,
  CheckCircle2,
  TrendingUp,
  Clock,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Zap,
  Calendar,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getMissionsForWeek,
  getMissions,
  selectMissionsForDay,
  sumRemainingDurationMins,
  sumCompletedDurationMins,
  type Mission,
} from '@/lib/missions-service';
import {
  getCurrentWeekStart,
  getWeekRange,
  formatWeekRange,
  getTorontoDate,
  getMinutesLeftTodayToronto,
  isDayFinishedToronto,
  formatDuration,
  isSameDayToronto,
} from '@/lib/date-utils';
import { getColorHex } from '@/lib/color-mapping';
import { addWeeks, subWeeks, isBefore, differenceInHours, format } from 'date-fns';

type Battlefront = {
  id: string;
  name: string;
  color?: string;
};

type BattlefrontStats = {
  id: string;
  name: string;
  color?: string;
  total: number;
  completed: number;
  percent: number;
};

type StatusType = 'on-track' | 'behind' | 'needs-focus';
type ViewMode = 'week' | 'day';

export default function ScoreboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => getCurrentWeekStart());
  const [missions, setMissions] = useState<Mission[]>([]);
  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [battlefronts, setBattlefronts] = useState<Battlefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [minutesLeftToday, setMinutesLeftToday] = useState(() => getMinutesLeftTodayToronto());

  useEffect(() => {
    const interval = setInterval(() => {
      setMinutesLeftToday(getMinutesLeftTodayToronto());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, weekStart]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { start, end } = getWeekRange(weekStart);
      const [weekMissionsData, allMissionsData, bfData] = await Promise.all([
        getMissionsForWeek(user.id, start, end),
        getMissions(user.id),
        supabase.from('battlefronts').select('id, name, color').eq('user_id', user.id),
      ]);

      setMissions(weekMissionsData);
      setAllMissions(allMissionsData);
      setBattlefronts(bfData.data || []);
    } catch (error) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const handleNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const handleThisWeek = () => setWeekStart(getCurrentWeekStart());

  const { start, end } = getWeekRange(weekStart);
  const currentWeek = getWeekRange(getTorontoDate());
  const isCurrentWeek = formatWeekRange(start, end) === formatWeekRange(currentWeek.start, currentWeek.end);

  const now = getTorontoDate();
  const todayMissions = selectMissionsForDay(allMissions, now);
  const activeMissions = viewMode === 'day' ? todayMissions : missions;

  const completed = activeMissions.filter((m) => m.completed_at);
  const active = activeMissions.filter((m) => !m.completed_at);
  const totalTime = activeMissions.reduce((sum, m) => sum + m.duration_minutes, 0);
  const completedTime = sumCompletedDurationMins(activeMissions);
  const remainingTime = sumRemainingDurationMins(activeMissions);

  const dayOfWeek = now.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const expectedPct = viewMode === 'day' ? 1 : (dayIndex + 1) / 7;
  const actualPct = activeMissions.length > 0 ? completed.length / activeMissions.length : 0;

  const getStatus = (): StatusType => {
    if (viewMode === 'day') {
      if (isDayFinishedToronto()) return actualPct >= 0.8 ? 'on-track' : actualPct >= 0.5 ? 'behind' : 'needs-focus';
      if (actualPct >= 0.7) return 'on-track';
      if (actualPct >= 0.4) return 'behind';
      return 'needs-focus';
    }
    if (!isCurrentWeek) return actualPct >= 0.8 ? 'on-track' : actualPct >= 0.5 ? 'behind' : 'needs-focus';
    if (actualPct >= expectedPct - 0.1) return 'on-track';
    if (actualPct >= expectedPct - 0.25) return 'behind';
    return 'needs-focus';
  };

  const status = getStatus();

  const statusConfig = {
    'on-track': {
      label: 'On Track',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      icon: TrendingUp,
    },
    behind: {
      label: 'Behind',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: AlertTriangle,
    },
    'needs-focus': {
      label: 'Needs Focus',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: AlertCircle,
    },
  };

  const battlefrontStats: BattlefrontStats[] = battlefronts.map((bf) => {
    const bfMissions = activeMissions.filter((m) => m.battlefront_id === bf.id);
    const bfCompleted = bfMissions.filter((m) => m.completed_at);
    return {
      id: bf.id,
      name: bf.name,
      color: bf.color,
      total: bfMissions.length,
      completed: bfCompleted.length,
      percent: bfMissions.length > 0 ? Math.round((bfCompleted.length / bfMissions.length) * 100) : 0,
    };
  }).filter((bf) => bf.total > 0).sort((a, b) => a.percent - b.percent);

  const unassignedMissions = activeMissions.filter((m) => !m.battlefront_id);
  const unassignedCompleted = unassignedMissions.filter((m) => m.completed_at);

  const overdueMissions = active.filter((m) => {
    if (!m.start_at) return false;
    return isBefore(new Date(m.start_at), now);
  });

  const dueSoonMissions = active.filter((m) => {
    if (!m.start_at) return false;
    const startDate = new Date(m.start_at);
    return !isBefore(startDate, now) && differenceInHours(startDate, now) <= 24;
  });

  const lowestBattlefront = battlefrontStats.length > 0 ? battlefrontStats[0] : null;

  const timeStatus: 'good' | 'risk' = remainingTime <= minutesLeftToday ? 'good' : 'risk';

  const navigateToMissions = (filter?: string, value?: string) => {
    const params = new URLSearchParams();
    if (filter && value) {
      params.set(filter, value);
    }
    if (viewMode === 'day') {
      params.set('mode', 'day');
    }
    router.push(`/dashboard/missions${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white">COMMAND CENTER</h1>
            <p className="text-slate-400 text-sm sm:text-lg mt-1">
              {viewMode === 'day' ? "Today's" : 'Weekly'} performance & insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('week')}
            className={viewMode === 'week' ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-400 hover:text-white'}
          >
            <Calendar className="w-4 h-4 mr-1.5" />
            Week
          </Button>
          <Button
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('day')}
            className={viewMode === 'day' ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-400 hover:text-white'}
          >
            <Sun className="w-4 h-4 mr-1.5" />
            Day
          </Button>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 p-4 sm:p-6">
        {viewMode === 'week' ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevWeek}
                className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white h-8 w-8 sm:h-10 sm:w-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleThisWeek}
                disabled={isCurrentWeek}
                className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white text-xs sm:text-sm"
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextWeek}
                className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white h-8 w-8 sm:h-10 sm:w-10"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-white font-semibold text-sm sm:text-base">{formatWeekRange(start, end)}</div>
              <div className="text-slate-400 text-xs sm:text-sm">Monday - Sunday</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-white font-semibold">{format(now, 'EEEE, MMMM d')}</div>
                <div className="text-slate-400 text-sm">Today&apos;s Missions</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${minutesLeftToday > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                {minutesLeftToday > 0 ? formatDuration(minutesLeftToday) : '0m'}
              </div>
              <div className="text-slate-400 text-xs">Time left today (until 10 PM)</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-slate-400">Loading stats...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              <button
                onClick={() => navigateToMissions()}
                className="text-center p-4 sm:p-6 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-500 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-hover:text-white transition-colors" />
                </div>
                <div className="text-3xl sm:text-5xl font-bold text-white mb-2">{activeMissions.length}</div>
                <div className="text-slate-400 text-base sm:text-lg">Total Missions</div>
                <div className="text-slate-500 text-xs sm:text-sm mt-2">
                  {viewMode === 'day' ? 'Today' : 'This week'}
                </div>
              </button>

              <button
                onClick={() => navigateToMissions('filter', 'completed')}
                className="text-center p-4 sm:p-6 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-green-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                </div>
                <div className="text-3xl sm:text-5xl font-bold text-green-500 mb-2">{completed.length}</div>
                <div className="text-slate-400 text-base sm:text-lg">Completed</div>
                <div className="text-slate-500 text-xs sm:text-sm mt-2">{active.length} still active</div>
              </button>

              <button
                onClick={() => navigateToMissions('filter', status === 'on-track' ? 'active' : 'active')}
                className={`text-center p-4 sm:p-6 rounded-lg border transition-all cursor-pointer group sm:col-span-2 lg:col-span-1 ${statusConfig[status].bg} ${statusConfig[status].border}`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <StatusIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${statusConfig[status].color}`} />
                </div>
                <div className={`text-2xl sm:text-3xl font-bold mb-1 ${statusConfig[status].color}`}>
                  {statusConfig[status].label}
                </div>
                <div className="text-slate-400 text-base sm:text-lg mb-2">Status</div>
                <div className="text-slate-400 text-xs sm:text-sm">
                  {completed.length}/{activeMissions.length} missions
                </div>
                {viewMode === 'week' && isCurrentWeek && (
                  <div className="text-slate-500 text-xs mt-1">
                    Expected: ~{Math.round(expectedPct * 100)}% by today
                  </div>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className={`bg-slate-800/30 border-slate-700 p-4 sm:p-5 ${timeStatus === 'risk' ? 'ring-1 ring-red-500/50' : ''}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className={`w-5 h-5 ${timeStatus === 'risk' ? 'text-red-400' : 'text-blue-400'}`} />
                  <h3 className="text-base sm:text-lg font-semibold text-white">Time Allocation</h3>
                  {timeStatus === 'risk' && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                      AT RISK
                    </span>
                  )}
                  {timeStatus === 'good' && remainingTime > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                      ON TRACK
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-2">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-white">
                        {formatDuration(completedTime)} / {formatDuration(totalTime)}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${totalTime > 0 ? (completedTime / totalTime) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-green-400">
                        {formatDuration(completedTime)}
                      </div>
                      <div className="text-slate-500 text-xs sm:text-sm">Completed</div>
                    </div>
                    <div>
                      <div className={`text-xl sm:text-2xl font-bold ${timeStatus === 'risk' ? 'text-red-400' : 'text-blue-400'}`}>
                        {formatDuration(remainingTime)}
                      </div>
                      <div className="text-slate-500 text-xs sm:text-sm">Est. Remaining</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-700 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs sm:text-sm">Time left today</span>
                      <span className={`font-semibold text-sm sm:text-base ${minutesLeftToday > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                        {minutesLeftToday > 0 ? formatDuration(minutesLeftToday) : 'Day ended'}
                      </span>
                    </div>
                    {viewMode === 'day' && remainingTime > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs sm:text-sm">Buffer</span>
                        <span className={`font-semibold text-sm sm:text-base ${timeStatus === 'good' ? 'text-green-400' : 'text-red-400'}`}>
                          {timeStatus === 'good'
                            ? `+${formatDuration(minutesLeftToday - remainingTime)}`
                            : `-${formatDuration(remainingTime - minutesLeftToday)}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-teal-400" />
                    <h3 className="text-base sm:text-lg font-semibold text-white">Battlefront Breakdown</h3>
                  </div>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {battlefrontStats.length === 0 && unassignedMissions.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-4">
                      No missions {viewMode === 'day' ? 'today' : 'this week'}
                    </div>
                  ) : (
                    <>
                      {battlefrontStats.map((bf) => (
                        <button
                          key={bf.id}
                          onClick={() => navigateToMissions('battlefront', bf.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors group"
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getColorHex(bf.color) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="text-white text-xs sm:text-sm truncate">{bf.name}</span>
                              <span className="text-slate-400 text-xs ml-2">
                                {bf.completed}/{bf.total}
                              </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${bf.percent}%`,
                                  backgroundColor: getColorHex(bf.color),
                                }}
                              />
                            </div>
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              bf.percent >= 80
                                ? 'text-green-400'
                                : bf.percent >= 50
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                          >
                            {bf.percent}%
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        </button>
                      ))}
                      {unassignedMissions.length > 0 && (
                        <button
                          onClick={() => navigateToMissions('battlefront', 'unassigned')}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors group"
                        >
                          <div className="w-3 h-3 rounded-full flex-shrink-0 bg-slate-500" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-xs sm:text-sm">Unassigned</span>
                              <span className="text-slate-500 text-xs ml-2">
                                {unassignedCompleted.length}/{unassignedMissions.length}
                              </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                              <div
                                className="h-1.5 rounded-full bg-slate-500 transition-all"
                                style={{
                                  width: `${
                                    unassignedMissions.length > 0
                                      ? (unassignedCompleted.length / unassignedMissions.length) * 100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-medium text-slate-400">
                            {unassignedMissions.length > 0
                              ? Math.round((unassignedCompleted.length / unassignedMissions.length) * 100)
                              : 0}
                            %
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base sm:text-lg font-semibold text-white">Next Actions</h3>
                </div>

                <div className="space-y-3">
                  {overdueMissions.length > 0 && (
                    <button
                      onClick={() => navigateToMissions('filter', 'overdue')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors group"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="text-red-400 font-medium text-sm sm:text-base">{overdueMissions.length} Overdue</div>
                        <div className="text-slate-400 text-xs">Requires immediate attention</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-red-400/50 group-hover:text-red-400 transition-colors" />
                    </button>
                  )}

                  {dueSoonMissions.length > 0 && (
                    <button
                      onClick={() => navigateToMissions('filter', 'due-soon')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors group"
                    >
                      <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="text-amber-400 font-medium text-sm sm:text-base">{dueSoonMissions.length} Due Soon</div>
                        <div className="text-slate-400 text-xs">Within 24 hours</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
                    </button>
                  )}

                  {timeStatus === 'risk' && viewMode === 'day' && (
                    <div className="w-full flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="text-red-400 font-medium text-sm sm:text-base">Time Crunch</div>
                        <div className="text-slate-400 text-xs">
                          {formatDuration(remainingTime - minutesLeftToday)} over capacity
                        </div>
                      </div>
                    </div>
                  )}

                  {lowestBattlefront && lowestBattlefront.percent < 50 && overdueMissions.length === 0 && (
                    <button
                      onClick={() => navigateToMissions('battlefront', lowestBattlefront.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-colors group"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: getColorHex(lowestBattlefront.color) }}
                      >
                        <Target className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-medium text-sm sm:text-base truncate">Focus: {lowestBattlefront.name}</div>
                        <div className="text-slate-400 text-xs">
                          Lowest progress ({lowestBattlefront.percent}%)
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                  )}

                  {overdueMissions.length === 0 && dueSoonMissions.length === 0 && timeStatus !== 'risk' && (
                    <div className="text-center py-4">
                      {status === 'on-track' ? (
                        <>
                          <div className="text-green-400 font-medium mb-1">You&apos;re on track!</div>
                          <div className="text-slate-500 text-sm">
                            {viewMode === 'day' ? 'Keep up the momentum' : 'Complete 1 mission to increase progress'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-slate-400 font-medium mb-1">No urgent items</div>
                          <div className="text-slate-500 text-sm">
                            Focus on completing active missions
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
