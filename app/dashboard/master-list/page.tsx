'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, Calendar, Pencil, Trash2, Rocket, Search, X, RefreshCw } from 'lucide-react';
import { DurationEditor } from '@/components/duration-editor';
import { DeployMissionModal } from '@/components/deploy-mission-modal';
import { getColorHex } from '@/lib/color-mapping';
import { format } from 'date-fns';
import {
  getMissions,
  updateMission,
  completeMission,
  uncompleteMission,
  deleteMission,
  type Mission,
} from '@/lib/missions-service';
import { syncMissionToCalendar, deleteMissionCalendarEvent } from '@/lib/mission-calendar-sync';
import { isPreviewMode } from '@/lib/preview-mode';
import { mockMissions, mockBattlefronts } from '@/lib/mockData';
import { seedMasterListMissions } from '@/lib/seed-master-list-missions';

type Battlefront = {
  id: string;
  name: string;
  color?: string;
};

type FilterType = 'all' | 'backlog' | 'scheduled';

export default function MasterListPage() {
  const { user } = useAuth();
  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [battlefronts, setBattlefronts] = useState<Battlefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Mission | null>(null);
  const [deployMission, setDeployMission] = useState<Mission | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const [filter, setFilter] = useState<FilterType>('backlog');
  const [battlefrontFilter, setBattlefrontFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSeedMissions = async () => {
    if (!user) return;

    setIsSeeding(true);
    try {
      const result = await seedMasterListMissions(user.id);
      toast.success(`Created ${result.created} missions (${result.skipped} already existed)`);
      await loadData();
    } catch (error) {
      toast.error('Failed to seed missions');
    } finally {
      setIsSeeding(false);
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
      toast.success(updated.completed_at ? 'Mission completed' : 'Mission reopened');
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

  const handleDeployMission = async (
    missionId: string,
    data: { start_at: string; duration_minutes: number; due_date?: string | null }
  ) => {
    const mission = allMissions.find((m) => m.id === missionId);
    if (!mission || !user) return;

    try {
      const updated = await updateMission(missionId, {
        start_at: data.start_at,
        duration_minutes: data.duration_minutes,
        due_date: data.due_date,
      });

      await syncMissionToCalendar({
        id: updated.id,
        user_id: user.id,
        title: updated.title,
        start_at: updated.start_at,
        duration_minutes: updated.duration_minutes,
        calendar_event_id: updated.calendar_event_id,
        battlefront_id: updated.battlefront_id,
      });

      setAllMissions(allMissions.map((m) => (m.id === missionId ? updated : m)));
    } catch (error) {
      throw error;
    }
  };

  const handleUnscheduleMission = async (missionId: string) => {
    const mission = allMissions.find((m) => m.id === missionId);
    if (!mission || !user) return;

    try {
      const updated = await updateMission(missionId, { start_at: null });

      if (mission.calendar_event_id) {
        await deleteMissionCalendarEvent(missionId);
      }

      setAllMissions(allMissions.map((m) => (m.id === missionId ? updated : m)));
      toast.success('Mission moved to backlog');
    } catch (error) {
      toast.error('Failed to unschedule mission');
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
    setFilter('backlog');
    setBattlefrontFilter(null);
    setSearchQuery('');
  };

  const filteredMissions = allMissions
    .filter((m) => {
      if (filter === 'backlog') {
        return !m.start_at;
      } else if (filter === 'scheduled') {
        return !!m.start_at;
      }
      return true;
    })
    .filter((m) => {
      if (battlefrontFilter) {
        if (battlefrontFilter === 'unassigned') {
          if (m.battlefront_id) return false;
        } else {
          if (m.battlefront_id !== battlefrontFilter) return false;
        }
      }
      return true;
    })
    .filter((m) => {
      if (searchQuery.trim()) {
        return m.title.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const hasActiveFilters = battlefrontFilter || filter !== 'backlog' || searchQuery.trim();
  const activeBattlefront =
    battlefrontFilter && battlefrontFilter !== 'unassigned'
      ? battlefronts.find((bf) => bf.id === battlefrontFilter)
      : null;

  const stats = {
    total: allMissions.length,
    backlog: allMissions.filter((m) => !m.start_at).length,
    scheduled: allMissions.filter((m) => m.start_at).length,
    completed: allMissions.filter((m) => m.completed_at).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Loading Master List...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white">MASTER LIST</h1>
          <p className="text-slate-400 text-sm sm:text-lg mt-1">
            Mission backlog and deployment center
          </p>
        </div>
        <Button
          onClick={handleSeedMissions}
          disabled={isSeeding}
          className="bg-green-600 hover:bg-green-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSeeding ? 'animate-spin' : ''}`} />
          {isSeeding ? 'Loading...' : 'Load Sample Missions'}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-800 border-slate-600 text-white pl-10"
          />
        </div>
        <Select value={battlefrontFilter || '__all__'} onValueChange={(v) => setBattlefrontFilter(v === '__all__' ? null : v)}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-full sm:w-48">
            <SelectValue placeholder="All Battlefronts" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="__all__" className="text-white">
              All Battlefronts
            </SelectItem>
            <SelectItem value="unassigned" className="text-white">
              Unassigned
            </SelectItem>
            {battlefronts.map((bf) => (
              <SelectItem key={bf.id} value={bf.id} className="text-white">
                {bf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          {searchQuery.trim() && (
            <Badge className="bg-slate-700 text-white flex items-center gap-1">
              Search: {searchQuery.substring(0, 20)}
              <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-400 hover:text-white ml-auto">
            Clear all
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'backlog' ? 'default' : 'outline'}
          onClick={() => setFilter('backlog')}
          className={filter === 'backlog' ? 'bg-blue-600' : 'bg-slate-800 border-slate-600 text-white'}
          size="sm"
        >
          Backlog ({stats.backlog})
        </Button>
        <Button
          variant={filter === 'scheduled' ? 'default' : 'outline'}
          onClick={() => setFilter('scheduled')}
          className={filter === 'scheduled' ? 'bg-blue-600' : 'bg-slate-800 border-slate-600 text-white'}
          size="sm"
        >
          Scheduled ({stats.scheduled})
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
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold w-12"></th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm">Mission</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden md:table-cell">
                  Battlefront
                </th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden lg:table-cell">
                  Due Date
                </th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden lg:table-cell">
                  Scheduled For
                </th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden sm:table-cell">
                  Duration
                </th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold w-24 text-sm">Status</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold w-32 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredMissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {filter === 'backlog' && !searchQuery && !battlefrontFilter && 'No missions in backlog'}
                    {filter === 'scheduled' && 'No scheduled missions'}
                    {filter === 'all' && !searchQuery && !battlefrontFilter && 'No missions. Click "Load Sample Missions" to get started.'}
                    {(searchQuery || battlefrontFilter) && 'No missions matching filters'}
                  </td>
                </tr>
              ) : (
                filteredMissions.map((mission) => {
                  const bfColor = getBattlefrontColor(mission.battlefront_id);
                  const isBacklog = !mission.start_at;

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
                        >
                          {mission.completed_at && <Check className="w-4 h-4 text-white" />}
                        </button>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
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
                              <SelectValue placeholder="Select">
                                {mission.battlefront?.name || 'Unassigned'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="__none__" className="text-white">
                                Unassigned
                              </SelectItem>
                              {battlefronts.map((bf) => (
                                <SelectItem key={bf.id} value={bf.id} className="text-white">
                                  {bf.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 hidden lg:table-cell">
                        <span className="text-slate-300 text-sm">
                          {mission.due_date ? format(new Date(mission.due_date), 'MMM d, yyyy') : '—'}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 hidden lg:table-cell">
                        <span className="text-slate-300 text-sm">
                          {mission.start_at ? format(new Date(mission.start_at), 'MMM d, HH:mm') : '—'}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 hidden sm:table-cell">
                        <DurationEditor
                          initialDuration={mission.duration_minutes}
                          onSave={(duration) => handleUpdateDuration(mission.id, duration)}
                        />
                      </td>
                      <td className="p-3 sm:p-4">
                        {mission.completed_at ? (
                          <Badge className="bg-slate-600 text-white text-xs">Done</Badge>
                        ) : mission.start_at ? (
                          <Badge className="bg-green-600 text-white text-xs">Scheduled</Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                            Backlog
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-1">
                          {isBacklog ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeployMission(mission)}
                              className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                              title="Deploy to schedule"
                            >
                              <Rocket className="w-4 h-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeployMission(mission)}
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                                title="Edit schedule"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUnscheduleMission(mission.id)}
                                className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-slate-700"
                                title="Move to backlog"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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
            <div className="text-2xl sm:text-3xl font-bold text-amber-500">{stats.backlog}</div>
            <div className="text-slate-400 text-xs sm:text-sm mt-1">Backlog</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-4 sm:p-6">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-500">{stats.scheduled}</div>
            <div className="text-slate-400 text-xs sm:text-sm mt-1">Scheduled</div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700 p-4 sm:p-6">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-500">{stats.completed}</div>
            <div className="text-slate-400 text-xs sm:text-sm mt-1">Completed</div>
          </div>
        </Card>
      </div>

      <DeployMissionModal
        isOpen={!!deployMission}
        onClose={() => setDeployMission(null)}
        mission={deployMission}
        onDeploy={handleDeployMission}
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
            <Button onClick={() => deleteConfirm && handleDeleteMission(deleteConfirm)} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
