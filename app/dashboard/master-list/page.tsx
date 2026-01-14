'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Check } from 'lucide-react';
import { DurationEditor } from '@/components/duration-editor';
import { getColorHex } from '@/lib/color-mapping';
import { isPreviewMode } from '@/lib/preview-mode';
import { mockBattlefronts } from '@/lib/mockData';

type Battlefront = {
  id: string;
  name: string;
  color?: string;
};

type LocalMission = {
  id: string;
  title: string;
  battlefront_id: string | null;
  duration_minutes: number;
  completed: boolean;
  battlefront?: {
    id: string;
    name: string;
    color?: string;
  } | null;
};

export default function MasterListPage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<LocalMission[]>([]);
  const [battlefronts, setBattlefronts] = useState<Battlefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionBattlefront, setNewMissionBattlefront] = useState<string>('__none__');
  const [newMissionDuration, setNewMissionDuration] = useState('60');

  // Load missions from localStorage on mount
  useEffect(() => {
    if (user) {
      const savedMissions = localStorage.getItem(`master-list-missions-${user.id}`);
      if (savedMissions) {
        try {
          setMissions(JSON.parse(savedMissions));
        } catch (error) {
          console.error('Failed to load saved missions:', error);
        }
      }
      loadBattlefronts();
    }
  }, [user]);

  // Save missions to localStorage whenever they change
  useEffect(() => {
    if (user && missions.length >= 0) {
      localStorage.setItem(`master-list-missions-${user.id}`, JSON.stringify(missions));
    }
  }, [missions, user]);

  const loadBattlefronts = async () => {
    if (!user) return;

    setLoading(true);

    if (isPreviewMode()) {
      setBattlefronts(mockBattlefronts.map(bf => ({ id: bf.id, name: bf.name, color: 'blue' })));
      setLoading(false);
      return;
    }

    try {
      const { data: battlefrontsData } = await supabase
        .from('battlefronts')
        .select('id, name, color')
        .eq('user_id', user.id);

      setBattlefronts(battlefrontsData || []);
    } catch (error: any) {
      console.error('Failed to load battlefronts:', error);
      toast.error('Failed to load battlefronts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMission = () => {
    if (!newMissionTitle.trim()) {
      toast.error('Mission title is required');
      return;
    }

    const battlefront = battlefronts.find(bf => bf.id === newMissionBattlefront);
    
    const newMission: LocalMission = {
      id: Date.now().toString(),
      title: newMissionTitle.trim(),
      battlefront_id: newMissionBattlefront === '__none__' ? null : newMissionBattlefront,
      duration_minutes: parseInt(newMissionDuration) || 60,
      completed: false,
      battlefront: battlefront ? {
        id: battlefront.id,
        name: battlefront.name,
        color: battlefront.color,
      } : null,
    };

    setMissions([newMission, ...missions]);
    setNewMissionTitle('');
    setNewMissionBattlefront('__none__');
    setNewMissionDuration('60');
    setShowNewModal(false);
    toast.success('Mission added to list');
  };

  const handleUpdateTitle = (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    const newTitle = editTitle.trim();

    if (!newTitle || mission?.title === newTitle) {
      setEditingTitle(null);
      return;
    }

    setMissions(missions.map((m) => 
      m.id === missionId ? { ...m, title: newTitle } : m
    ));
    setEditingTitle(null);
    toast.success('Title updated');
  };

  const handleUpdateDuration = (missionId: string, duration: number) => {
    setMissions(missions.map((m) => 
      m.id === missionId ? { ...m, duration_minutes: duration } : m
    ));
    toast.success('Duration updated');
  };

  const handleUpdateBattlefront = (missionId: string, battlefrontId: string) => {
    const newBattlefrontId = battlefrontId === '__none__' ? null : battlefrontId;
    const battlefront = battlefronts.find(bf => bf.id === battlefrontId);

    setMissions(missions.map((m) => 
      m.id === missionId ? { 
        ...m, 
        battlefront_id: newBattlefrontId,
        battlefront: battlefront ? {
          id: battlefront.id,
          name: battlefront.name,
          color: battlefront.color,
        } : null,
      } : m
    ));
    toast.success('Battlefront updated');
  };

  const handleToggleComplete = (missionId: string) => {
    setMissions(missions.map((m) => 
      m.id === missionId ? { ...m, completed: !m.completed } : m
    ));
  };

  const handleDeleteMission = (mission: LocalMission) => {
    setMissions(missions.filter((m) => m.id !== mission.id));
    toast.success('Mission removed from list');
  };

  const getBattlefrontColor = (battlefrontId: string | null | undefined): string | undefined => {
    if (!battlefrontId) return undefined;
    const bf = battlefronts.find((b) => b.id === battlefrontId);
    return bf?.color;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">MASTER LIST</h1>
          <p className="text-slate-400 text-lg mt-1">Local mission planner</p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          New Mission
        </Button>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold w-12">☐</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm">Mission Title</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden md:table-cell">Battlefront</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden sm:table-cell">Duration</th>
                <th className="text-right p-3 sm:p-4 text-slate-400 font-semibold w-20 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {missions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No missions yet. Click &quot;New Mission&quot; to add one.
                  </td>
                </tr>
              ) : (
                missions.map((mission) => {
                  const bfColor = getBattlefrontColor(mission.battlefront_id);
                  return (
                    <tr
                      key={mission.id}
                      className={`hover:bg-slate-800/30 transition-all ${
                        mission.completed ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="p-3 sm:p-4">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(mission.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                            mission.completed
                              ? 'bg-green-500 border-green-500 scale-110'
                              : 'border-slate-600 hover:border-blue-500'
                          }`}
                        >
                          {mission.completed && <Check className="w-4 h-4 text-white" />}
                        </button>
                      </td>
                      <td className="p-3 sm:p-4">
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
                            className={`cursor-pointer hover:text-blue-400 transition-colors font-medium ${
                              mission.completed ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {mission.title}
                          </span>
                        )}
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
                      <td className="p-3 sm:p-4 hidden sm:table-cell">
                        <DurationEditor
                          initialDuration={mission.duration_minutes}
                          onSave={async (duration) => {
                            handleUpdateDuration(mission.id, duration);
                          }}
                        />
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMission(mission)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                            title="Delete mission"
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

      {/* New Mission Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add New Mission</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a mission to your local planning list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm mb-2 block">Mission Title *</label>
              <Input
                value={newMissionTitle}
                onChange={(e) => setNewMissionTitle(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="e.g., Morning Workout"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMissionTitle.trim()) {
                    handleCreateMission();
                  }
                }}
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm mb-2 block">Battlefront (optional)</label>
              <Select value={newMissionBattlefront} onValueChange={setNewMissionBattlefront}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select battlefront" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="__none__" className="text-white">No battlefront</SelectItem>
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
            <div>
              <label className="text-slate-300 text-sm mb-2 block">Duration (minutes)</label>
              <Input
                type="number"
                value={newMissionDuration}
                onChange={(e) => setNewMissionDuration(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="60"
                min="5"
                max="480"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewModal(false);
                setNewMissionTitle('');
                setNewMissionBattlefront('__none__');
                setNewMissionDuration('60');
              }}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateMission}
              className="bg-green-600 hover:bg-green-700"
              disabled={!newMissionTitle.trim()}
            >
              Add Mission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
