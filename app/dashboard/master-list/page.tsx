'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Check, Calendar, Target, Pencil, Trash2, X, ArrowLeft, Repeat, Sun } from 'lucide-react';
import { DurationEditor } from '@/components/duration-editor';
import { NewMissionModal } from '@/components/new-mission-modal';
import { DateTimePicker } from '@/components/date-time-picker';
import { getColorHex } from '@/lib/color-mapping';
import { isBefore, differenceInHours, format } from 'date-fns';
import {
  getTorontoDate,
  getMinutesLeftTodayToronto,
  formatDuration,
  getCurrentWeekStart,
  getWeekRange,
} from '@/lib/date-utils';
import {
  getMissions,
  createMission,
  updateMission,
  completeMission,
  uncompleteMission,
  deleteMission,
  selectMissionsForDay,
  type Mission,
} from '@/lib/missions-service';
import { syncMissionToCalendar, deleteMissionCalendarEvent } from '@/lib/mission-calendar-sync';
import { isPreviewMode } from '@/lib/preview-mode';
import { mockMissions, mockBattlefronts } from '@/lib/mockData';

type Battlefront = {
  id: string;
  name: string;
  color?: string;
};

type FilterType = 'all' | 'active' | 'completed' | 'overdue' | 'due-soon';
type ViewMode = 'week' | 'day';

export default function MasterListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [battlefronts, setBattlefronts] = useState<Battlefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Mission | null>(null);
  const [minutesLeftToday, setMinutesLeftToday] = useState(() => getMinutesLeftTodayToronto());

  const urlFilter = searchParams.get('filter') as FilterType | null;
  const urlBattlefront = searchParams.get('battlefront');
  const urlMode = searchParams.get('mode') as ViewMode | null;
  const [filter, setFilter] = useState<FilterType>('active');
  const [battlefrontFilter, setBattlefrontFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  useEffect(() => {
    const interval = setInterval(() => {
      setMinutesLeftToday(getMinutesLeftTodayToronto());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (urlFilter) {
      setFilter(urlFilter);
    }
    if (urlBattlefront) {
      setBattlefrontFilter(urlBattlefront);
    }
    if (urlMode) {
      setViewMode(urlMode);
    }
  }, [urlFilter, urlBattlefront, urlMode]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    if (isPreviewMode()) {
      setAllMissions(mockMissions as any);
      setBattlefronts(mockBattlefronts.map(bf => ({ id: bf.id, name: bf.name, color: 'blue' })));
      setLoading(false);
      return;
    }

    try {
      const [missionsData, battlefrontsData] = await Promise.all([
        getMissions(user.id),
        supabase.from('battlefronts').select('id, name, color').eq('user_id', user.id),
      ]);

      setAllMissions(missionsData);
      setBattlefronts(battlefrontsData.data || []);
    } catch (error: any) {
      toast.error('Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

  const now = getTorontoDate();
  const weekStart = getCurrentWeekStart();
  const { start: weekRangeStart, end: weekRangeEnd } = getWeekRange(weekStart);

  const getMissionsForCurrentView = (): Mission[] => {
    if (viewMode === 'day') {
      return selectMissionsForDay(allMissions, now);
    }
    return allMissions.filter((m) => {
      if (m.is_recurring) return true;
      if (!m.start_at) return true;
      const startDate = new Date(m.start_at);
      return startDate >= weekRangeStart && startDate <= weekRangeEnd;
    });
  };

  const missions = getMissionsForCurrentView();

  const handleCreateMission = async (data: any) => {
    if (!user) return;

    try {
      const newMission = await createMission(user.id, data);

      if (newMission.start_at) {
        await syncMissionToCalendar({
          id: newMission.id,
          user_id: user.id,
          title: newMission.title,
          start_at: newMission.start_at,
          duration_minutes: newMission.duration_minutes,
          calendar_event_id: newMission.calendar_event_id,
          battlefront_id: newMission.battlefront_id,
        });
      }

      setAllMissions([newMission, ...allMissions]);
      toast.success('Mission created');
    } catch (error) {
      toast.error('Failed to create mission');
    }
  };

  const handleCreateMultipleMissions = async (missionsData: any[]) => {
    if (!user) return;

    try {
      const newMissions: Mission[] = [];

      for (const data of missionsData) {
        const newMission = await createMission(user.id, data);

        if (newMission.start_at) {
          await syncMissionToCalendar({
            id: newMission.id,
            user_id: user.id,
            title: newMission.title,
            start_at: newMission.start_at,
            duration_minutes: newMission.duration_minutes,
            calendar_event_id: newMission.calendar_event_id,
            battlefront_id: newMission.battlefront_id,
          });
        }

        newMissions.push(newMission);
      }

      setAllMissions([...newMissions, ...allMissions]);
    } catch (error) {
      toast.error('Failed to create missions');
    }
  };

  const handleToggleComplete = async (mission: Mission) => {
    const optimisticUpdate = {
      ...mission,
      completed_at: mission.completed_at ? null : new Date().toISOString(),
    };

    setAllMissions(allMissions.map((m) => (m.id === mission.id ? optimisticUpdate : m)));

    try {
      const updated = mission.completed_at
        ? await uncompleteMission(mission.id)
        : await completeMission(mission.id);

      setAllMissions(allMissions.map((m) => (m.id === mission.id ? updated : m)));
      toast.success(updated.completed_at ? 'Mission completed!' : 'Mission reopened');
    } catch (error: any) {
      setAllMissions(allMissions.map((m) => (m.id === mission.id ? mission : m)));
      toast.error(error.message || 'Failed to update mission');
    }
  };

  const handleUpdateTitle = async (missionId: string) => {
    const mission = allMissions.find((m) => m.id === missionId);
    const newTitle = editTitle.trim();

    if (!newTitle || mission?.title === newTitle) {
      setEditingTitle(null);
      return;
    }

    try {
      const updated = await updateMission(missionId, { title: newTitle });
      setAllMissions(allMissions.map((m) => (m.id === missionId ? updated : m)));
      setEditingTitle(null);
      toast.success('Title updated');
    } catch (error) {
      toast.error('Failed to update title');
    }
  };

  const handleUpdateBattlefront = async (missionId: string, battlefrontId: string) => {
    const mission = allMissions.find((m) => m.id === missionId);
    const newBattlefrontId = battlefrontId === '__none__' ? undefined : battlefrontId;
    if (!mission || mission.battlefront_id === newBattlefrontId) return;

    try {
      const updated = await updateMission(missionId, {
        battlefront_id: newBattlefrontId,
      });
      setAllMissions(allMissions.map((m) => (m.id === missionId ? updated : m)));
      toast.success('Battlefront updated');
    } catch (error) {
      toast.error('Failed to update battlefront');
    }
  };

  const handleUpdateDuration = async (missionId: string, duration: number) => {
    const mission = allMissions.find((m) => m.id === missionId);
    if (!mission) return;

    try {
      const updated = await updateMission(missionId, { duration_minutes: duration });

      if (updated.start_at && user) {
        await syncMissionToCalendar({
          id: updated.id,
          user_id: user.id,
          title: updated.title,
          start_at: updated.start_at,
          duration_minutes: updated.duration_minutes,
          calendar_event_id: updated.calendar_event_id,
          battlefront_id: updated.battlefront_id,
        });
      }

      setAllMissions(allMissions.map((m) => (m.id === missionId ? updated : m)));
      toast.success('Duration updated');
    } catch (error) {
      toast.error('Failed to update duration');
    }
  };

  const handleUpdateStartAt = async (missionId: string, startAt: string | null) => {
    const mission = allMissions.find((m) => m.id === missionId);
    if (!mission || !user) return;

    const optimistic = { ...mission, start_at: startAt };
    setAllMissions(allMissions.map((m) => (m.id === missionId ? optimistic : m)));

    try {
      const updated = await updateMission(missionId, { start_at: startAt || undefined });

      await syncMissionToCalendar({
        id: updated.id,
        user_id: user.id,
        title: updated.title,
        start_at: updated.start_at,
        duration_minutes: updated.duration_minutes,
        calendar_event_id: updated.calendar_event_id,
        battlefront_id: updated.battlefront_id,
      });

      await loadData();
      toast.success(startAt ? 'Mission scheduled' : 'Schedule cleared');
    } catch (error) {
      setAllMissions(allMissions.map((m) => (m.id === missionId ? mission : m)));
      toast.error('Failed to update schedule');
    }
  };

  const handleDeleteMission = async (mission: Mission) => {
    try {
      if (mission.calendar_event_id) {
        await deleteMissionCalendarEvent(mission.id);
      }
      await deleteMission(mission.id);
      setAllMissions(allMissions.filter((m) => m.id !== mission.id));
      setDeleteConfirm(null);
      toast.success('Mission deleted');
    } catch (error) {
      toast.error('Failed to delete mission');
    }
  };

  const getBattlefrontColor = (battlefrontId: string | null | undefined): string | undefined => {
    if (!battlefrontId) return undefined;
    const bf = battlefronts.find((b) => b.id === battlefrontId);
    return bf?.color;
  };

  const clearFilters = () => {
    setFilter('active');
    setBattlefrontFilter(null);
    router.push('/dashboard/master-list');
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    const params = new URLSearchParams(window.location.search);
    if (mode === 'day') {
      params.set('mode', 'day');
    } else {
      params.delete('mode');
    }
    router.push(`/dashboard/master-list${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const filteredMissions = missions
    .filter((m) => {
      if (battlefrontFilter) {
        if (battlefrontFilter === 'unassigned') {
          if (m.battlefront_id) return false;
        } else {
          if (m.battlefront_id !== battlefrontFilter) return false;
        }
      }

      if (filter === 'active') return !m.completed_at;
      if (filter === 'completed') return !!m.completed_at;
      if (filter === 'overdue') {
        if (m.completed_at) return false;
        if (!m.start_at) return false;
        return isBefore(new Date(m.start_at), now);
      }
      if (filter === 'due-soon') {
        if (m.completed_at) return false;
        if (!m.start_at) return false;
        const startDate = new Date(m.start_at);
        return !isBefore(startDate, now) && differenceInHours(startDate, now) <= 24;
      }
      return true;
    })
    .sort((a, b) => {
      if (!a.start_at && !b.start_at) return 0;
      if (!a.start_at) return 1;
      if (!b.start_at) return -1;
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });

  const hasActiveFilters = battlefrontFilter || filter !== 'active';
  const activeBattlefront = battlefrontFilter && battlefrontFilter !== 'unassigned'
    ? battlefronts.find(bf => bf.id === battlefrontFilter)
    : null;

  const stats = {
    total: missions.length,
    completed: missions.filter((m) => m.completed_at).length,
    active: missions.filter((m) => !m.completed_at).length,
    scheduled: missions.filter((m) => m.start_at && !m.completed_at).length,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white">MASTER LIST</h1>
          <p className="text-slate-400 text-sm sm:text-lg mt-1">
            {viewMode === 'day' ? "Today's missions" : 'All missions this week'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('week')}
              className={viewMode === 'week' ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-400 hover:text-white'}
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Week
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('day')}
              className={viewMode === 'day' ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-400 hover:text-white'}
            >
              <Sun className="w-4 h-4 mr-1.5" />
              Day
            </Button>
          </div>
          <Button onClick={() => setShowNewModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Mission
          </Button>
        </div>
      </div>

      {viewMode === 'day' && (
        <Card className="bg-slate-800/30 border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-white font-semibold">{format(now, 'EEEE, MMMM d')}</div>
                <div className="text-slate-400 text-sm">Showing only today&apos;s scheduled missions</div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className={`text-lg font-bold ${minutesLeftToday > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                {minutesLeftToday > 0 ? formatDuration(minutesLeftToday) : '0m'}
              </div>
              <div className="text-slate-400 text-xs">Time left today (until 10 PM)</div>
            </div>
          </div>
        </Card>
      )}

      {hasActiveFilters && (
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex-wrap">
          <span className="text-slate-400 text-sm">Filtered by:</span>
          {battlefrontFilter && (
            <Badge className="bg-slate-700 text-white flex items-center gap-1 max-w-[200px] md:max-w-xs">
              {battlefrontFilter === 'unassigned' ? (
                'Unassigned'
              ) : (
                <>
                  {activeBattlefront && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getColorHex(activeBattlefront.color) }}
                    />
                  )}
                  <span className="truncate">{activeBattlefront?.name || battlefrontFilter}</span>
                </>
              )}
              <button onClick={() => setBattlefrontFilter(null)} className="ml-1 hover:text-red-400 flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filter !== 'active' && (
            <Badge className="bg-slate-700 text-white flex items-center gap-1">
              {filter === 'overdue' && 'Overdue'}
              {filter === 'due-soon' && 'Due Soon'}
              {filter === 'completed' && 'Completed'}
              {filter === 'all' && 'All'}
              <button onClick={() => setFilter('active')} className="ml-1 hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-slate-400 hover:text-white ml-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'active' && !battlefrontFilter ? 'default' : 'outline'}
          onClick={() => { setFilter('active'); setBattlefrontFilter(null); }}
          className={filter === 'active' && !battlefrontFilter ? 'bg-blue-600' : 'bg-slate-800 border-slate-600 text-white'}
          size="sm"
        >
          Active ({stats.active})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'bg-blue-600' : 'bg-slate-800 border-slate-600 text-white'}
          size="sm"
        >
          Completed ({stats.completed})
        </Button>
        <Button
          variant={filter === 'overdue' ? 'default' : 'outline'}
          onClick={() => setFilter('overdue')}
          className={filter === 'overdue' ? 'bg-red-600' : 'bg-slate-800 border-slate-600 text-white'}
          size="sm"
        >
          Overdue
        </Button>
        <Button
          variant={filter === 'due-soon' ? 'default' : 'outline'}
          onClick={() => setFilter('due-soon')}
          className={filter === 'due-soon' ? 'bg-amber-600' : 'bg-slate-800 border-slate-600 text-white'}
          size="sm"
        >
          Due Soon
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-blue-600' : 'bg-slate-800 border-slate-600 text-white'}
          size="sm"
        >
          All ({stats.total})
        </Button>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold w-12">☐</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm">Mission</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden md:table-cell">Battlefront</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden lg:table-cell">Due Date</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden sm:table-cell">Est. Time</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden xl:table-cell">Scheduled</th>
                <th className="text-right p-3 sm:p-4 text-slate-400 font-semibold w-20 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredMissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {filter === 'active' && !battlefrontFilter && `No active missions ${viewMode === 'day' ? 'today' : 'this week'}`}
                    {filter === 'completed' && 'No completed missions'}
                    {filter === 'overdue' && 'No overdue missions - great job!'}
                    {filter === 'due-soon' && 'No missions due soon'}
                    {filter === 'all' && !battlefrontFilter && `No missions ${viewMode === 'day' ? 'today' : 'this week'}. Click "New Mission" to create one.`}
                    {battlefrontFilter && 'No missions matching this filter'}
                  </td>
                </tr>
              ) : (
                filteredMissions.map((mission) => {
                  const bfColor = getBattlefrontColor(mission.battlefront_id);
                  return (
                    <tr
                      key={mission.id}
                      className={`hover:bg-slate-800/30 transition-all ${
                        mission.completed_at ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="p-3 sm:p-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleComplete(mission);
                          }}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                            mission.completed_at
                              ? 'bg-green-500 border-green-500 scale-110'
                              : 'border-slate-600 hover:border-blue-500'
                          }`}
                          aria-label={mission.completed_at ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {mission.completed_at && <Check className="w-4 h-4 text-white" />}
                        </button>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          {mission.is_recurring && (
                            <span title="Daily mission - resets at midnight">
                              <Repeat className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            </span>
                          )}
                          {mission.calendar_event_id && !mission.is_recurring && (
                            <span title="Linked to calendar">
                              <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            </span>
                          )}
                          {editingTitle === mission.id ? (
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => handleUpdateTitle(mission.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateTitle(mission.id);
                                if (e.key === 'Escape') setEditingTitle(null);
                              }}
                              className="bg-slate-800 border-slate-600 text-white -my-2"
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingTitle(mission.id);
                                setEditTitle(mission.title);
                              }}
                              className={`cursor-pointer hover:text-blue-400 transition-colors text-sm sm:text-base ${
                                mission.completed_at ? 'line-through text-slate-400' : 'text-white font-medium'
                              }`}
                            >
                              {mission.title}
                            </span>
                          )}
                        </div>
                        <div className="md:hidden mt-1">
                          {bfColor && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: getColorHex(bfColor) }}
                              />
                              {mission.battlefront?.name || 'Unassigned'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {bfColor && (
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getColorHex(bfColor) }}
                            />
                          )}
                          <Select
                            value={mission.battlefront_id || '__none__'}
                            onValueChange={(value) => handleUpdateBattlefront(mission.id, value)}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-32 lg:w-40 text-sm">
                              <SelectValue placeholder="Select battlefront">
                                {mission.battlefront?.name || 'Unassigned'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="__none__" className="text-white">
                                Unassigned
                              </SelectItem>
                              {battlefronts.map((bf) => (
                                <SelectItem key={bf.id} value={bf.id} className="text-white">
                                  <div className="flex items-center gap-2">
                                    {bf.color && (
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: getColorHex(bf.color) }}
                                      />
                                    )}
                                    {bf.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 hidden lg:table-cell">
                        <span className="text-slate-400 text-sm">
                          {mission.due_date ? format(new Date(mission.due_date), 'MMM dd') : '—'}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 hidden sm:table-cell">
                        <DurationEditor
                          initialDuration={mission.duration_minutes}
                          onSave={(duration) => handleUpdateDuration(mission.id, duration)}
                        />
                      </td>
                      <td className="p-3 sm:p-4 hidden xl:table-cell">
                        <DateTimePicker
                          value={mission.start_at}
                          onChange={(value) => handleUpdateStartAt(mission.id, value)}
                          placeholder="—"
                        />
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTitle(mission.id);
                              setEditTitle(mission.title);
                            }}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(mission)}
                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-slate-900/50 border-slate-700 p-4 sm:p-6">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-xs sm:text-sm mt-1">Total</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-4 sm:p-6">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-slate-400 text-xs sm:text-sm mt-1">Completed</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-4 sm:p-6">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-500">{stats.active}</div>
            <div className="text-slate-400 text-xs sm:text-sm mt-1">Active</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-4 sm:p-6">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-500">{stats.scheduled}</div>
            <div className="text-slate-400 text-xs sm:text-sm mt-1">Scheduled</div>
          </div>
        </Card>
      </div>

      <NewMissionModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={handleCreateMission}
        onCreateMultiple={handleCreateMultipleMissions}
        battlefronts={battlefronts}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Mission</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete &quot;{deleteConfirm?.title}&quot;? This action cannot be undone.
              {deleteConfirm?.calendar_event_id && (
                <span className="block mt-2 text-amber-400">
                  This will also remove the linked calendar event.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDeleteMission(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
