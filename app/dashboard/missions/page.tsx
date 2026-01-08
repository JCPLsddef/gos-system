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
import { Plus, Check, Calendar, Target, Pencil, Trash2, X, ArrowLeft, Repeat } from 'lucide-react';
import { DurationEditor } from '@/components/duration-editor';
import { NewMissionModal } from '@/components/new-mission-modal';
import { DateTimePicker } from '@/components/date-time-picker';
import { getColorHex } from '@/lib/color-mapping';
import { isBefore, differenceInHours } from 'date-fns';
import { getTorontoDate } from '@/lib/date-utils';
import {
  getMissions,
  createMission,
  updateMission,
  completeMission,
  uncompleteMission,
  deleteMission,
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

export default function MasterMissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [battlefronts, setBattlefronts] = useState<Battlefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Mission | null>(null);

  const urlFilter = searchParams.get('filter') as FilterType | null;
  const urlBattlefront = searchParams.get('battlefront');
  const [filter, setFilter] = useState<FilterType>('active');
  const [battlefrontFilter, setBattlefrontFilter] = useState<string | null>(null);

  useEffect(() => {
    if (urlFilter) {
      setFilter(urlFilter);
    }
    if (urlBattlefront) {
      setBattlefrontFilter(urlBattlefront);
    }
  }, [urlFilter, urlBattlefront]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    // PREVIEW MODE: Use mock data for visual validation
    if (isPreviewMode()) {
      setMissions(mockMissions as any);
      setBattlefronts(mockBattlefronts.map(bf => ({ id: bf.id, name: bf.name, color: 'blue' })));
      setLoading(false);
      return;
    }

    // PRODUCTION: Real Supabase queries
    try {
      const [missionsData, battlefrontsData] = await Promise.all([
        getMissions(user.id),
        supabase.from('battlefronts').select('id, name, color').eq('user_id', user.id),
      ]);

      setMissions(missionsData);
      setBattlefronts(battlefrontsData.data || []);
    } catch (error: any) {
      toast.error('Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

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

      setMissions([newMission, ...missions]);
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

      setMissions([...newMissions, ...missions]);
    } catch (error) {
      toast.error('Failed to create missions');
    }
  };

  const handleToggleComplete = async (mission: Mission) => {
    const optimisticUpdate = {
      ...mission,
      completed_at: mission.completed_at ? null : new Date().toISOString(),
    };

    setMissions(missions.map((m) => (m.id === mission.id ? optimisticUpdate : m)));

    try {
      const updated = mission.completed_at
        ? await uncompleteMission(mission.id)
        : await completeMission(mission.id);

      setMissions(missions.map((m) => (m.id === mission.id ? updated : m)));
      toast.success(updated.completed_at ? 'Mission completed!' : 'Mission reopened');
    } catch (error: any) {
      setMissions(missions.map((m) => (m.id === mission.id ? mission : m)));
      toast.error(error.message || 'Failed to update mission');
    }
  };

  const handleUpdateTitle = async (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    const newTitle = editTitle.trim();

    if (!newTitle || mission?.title === newTitle) {
      setEditingTitle(null);
      return;
    }

    try {
      const updated = await updateMission(missionId, { title: newTitle });
      setMissions(missions.map((m) => (m.id === missionId ? updated : m)));
      setEditingTitle(null);
      toast.success('Title updated');
    } catch (error) {
      toast.error('Failed to update title');
    }
  };

  const handleUpdateBattlefront = async (missionId: string, battlefrontId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    const newBattlefrontId = battlefrontId === '__none__' ? undefined : battlefrontId;
    if (!mission || mission.battlefront_id === newBattlefrontId) return;

    try {
      const updated = await updateMission(missionId, {
        battlefront_id: newBattlefrontId,
      });
      setMissions(missions.map((m) => (m.id === missionId ? updated : m)));
      toast.success('Battlefront updated');
    } catch (error) {
      toast.error('Failed to update battlefront');
    }
  };

  const handleUpdateDuration = async (missionId: string, duration: number) => {
    const mission = missions.find((m) => m.id === missionId);
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

      setMissions(missions.map((m) => (m.id === missionId ? updated : m)));
      toast.success('Duration updated');
    } catch (error) {
      toast.error('Failed to update duration');
    }
  };

  const handleUpdateStartAt = async (missionId: string, startAt: string | null) => {
    const mission = missions.find((m) => m.id === missionId);
    if (!mission || !user) return;

    const optimistic = { ...mission, start_at: startAt };
    setMissions(missions.map((m) => (m.id === missionId ? optimistic : m)));

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
      setMissions(missions.map((m) => (m.id === missionId ? mission : m)));
      toast.error('Failed to update schedule');
    }
  };

  const handleDeleteMission = async (mission: Mission) => {
    try {
      if (mission.calendar_event_id) {
        await deleteMissionCalendarEvent(mission.id);
      }
      await deleteMission(mission.id);
      setMissions(missions.filter((m) => m.id !== mission.id));
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
    router.push('/dashboard/missions');
  };

  const now = getTorontoDate();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">MASTER MISSIONS</h1>
          <p className="text-slate-400 text-lg mt-1">All missions across battlefronts</p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Mission
        </Button>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
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
        >
          Active ({stats.active})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'bg-blue-600' : 'bg-slate-800 border-slate-600 text-white'}
        >
          Completed ({stats.completed})
        </Button>
        <Button
          variant={filter === 'overdue' ? 'default' : 'outline'}
          onClick={() => setFilter('overdue')}
          className={filter === 'overdue' ? 'bg-red-600' : 'bg-slate-800 border-slate-600 text-white'}
        >
          Overdue
        </Button>
        <Button
          variant={filter === 'due-soon' ? 'default' : 'outline'}
          onClick={() => setFilter('due-soon')}
          className={filter === 'due-soon' ? 'bg-amber-600' : 'bg-slate-800 border-slate-600 text-white'}
        >
          Due Soon
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-blue-600' : 'bg-slate-800 border-slate-600 text-white'}
        >
          All ({stats.total})
        </Button>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left p-4 text-slate-400 font-semibold w-12"></th>
                <th className="text-left p-4 text-slate-400 font-semibold">Mission</th>
                <th className="text-left p-4 text-slate-400 font-semibold">Battlefront</th>
                <th className="text-left p-4 text-slate-400 font-semibold">Scheduled For</th>
                <th className="text-left p-4 text-slate-400 font-semibold">Duration</th>
                <th className="text-left p-4 text-slate-400 font-semibold w-24">Status</th>
                <th className="text-left p-4 text-slate-400 font-semibold w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredMissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {filter === 'active' && !battlefrontFilter && 'No active missions'}
                    {filter === 'completed' && 'No completed missions'}
                    {filter === 'overdue' && 'No overdue missions - great job!'}
                    {filter === 'due-soon' && 'No missions due soon'}
                    {filter === 'all' && !battlefrontFilter && 'No missions yet. Click "New Mission" to create one.'}
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
                      <td className="p-4">
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
                      <td className="p-4">
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
                              className={`cursor-pointer hover:text-blue-400 transition-colors ${
                                mission.completed_at ? 'line-through text-slate-400' : 'text-white font-medium'
                              }`}
                            >
                              {mission.title}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
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
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-40">
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
                      <td className="p-4">
                        <DateTimePicker
                          value={mission.start_at}
                          onChange={(value) => handleUpdateStartAt(mission.id, value)}
                          placeholder="Schedule mission"
                        />
                      </td>
                      <td className="p-4">
                        <DurationEditor
                          initialDuration={mission.duration_minutes}
                          onSave={(duration) => handleUpdateDuration(mission.id, duration)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {mission.is_recurring && (
                            <Badge className="bg-amber-600 text-white flex items-center gap-1 w-fit">
                              <Repeat className="w-3 h-3" />
                              Daily
                            </Badge>
                          )}
                          {mission.completed_at ? (
                            <Badge className="bg-slate-600 text-white">Done</Badge>
                          ) : mission.start_at && !mission.is_recurring ? (
                            <Badge className="bg-green-600 text-white flex items-center gap-1 w-fit">
                              <Calendar className="w-3 h-3" />
                              Scheduled
                            </Badge>
                          ) : !mission.is_recurring ? (
                            <Badge variant="outline" className="border-slate-600 text-slate-400">
                              Not scheduled
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 mt-1">Total Missions</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-slate-400 mt-1">Completed</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500">{stats.active}</div>
            <div className="text-slate-400 mt-1">Active</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-500">{stats.scheduled}</div>
            <div className="text-slate-400 mt-1">Scheduled</div>
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
              Are you sure you want to delete "{deleteConfirm?.title}"? This action cannot be undone.
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
