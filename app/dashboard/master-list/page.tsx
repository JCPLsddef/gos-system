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
import { Trash2, Rocket, Search, X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DurationEditor } from '@/components/duration-editor';
import { DeployMissionModal } from '@/components/deploy-mission-modal';
import { getColorHex } from '@/lib/color-mapping';
import { isPreviewMode } from '@/lib/preview-mode';
import { mockBattlefronts } from '@/lib/mockData';

type Battlefront = {
  id: string;
  name: string;
  color?: string;
};

type MissionTemplate = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  battlefront_id: string | null;
  duration_minutes: number;
  color: string;
  created_at: string;
  updated_at: string;
  battlefront?: Battlefront;
};

export default function MasterListPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MissionTemplate[]>([]);
  const [battlefronts, setBattlefronts] = useState<Battlefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<MissionTemplate | null>(null);
  const [deployTemplate, setDeployTemplate] = useState<MissionTemplate | null>(null);
  const [newTemplateModal, setNewTemplateModal] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');

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
      setTemplates([]);
      setBattlefronts(mockBattlefronts.map(bf => ({ id: bf.id, name: bf.name, color: 'blue' })));
      setLoading(false);
      return;
    }

    try {
      const [templatesData, battlefrontsData] = await Promise.all([
        supabase
          .from('mission_templates')
          .select(`
            *,
            battlefront:battlefronts(id, name, color)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('battlefronts').select('id, name, color').eq('user_id', user.id),
      ]);

      if (templatesData.error) {
        console.error('Load templates error:', templatesData.error);
        throw templatesData.error;
      }
      if (battlefrontsData.error) {
        console.error('Load battlefronts error:', battlefrontsData.error);
        throw battlefrontsData.error;
      }

      setTemplates(templatesData.data || []);
      setBattlefronts(battlefrontsData.data || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error(error?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!user || !newTemplateTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('mission_templates')
        .insert({
          user_id: user.id,
          title: newTemplateTitle.trim(),
          description: '',
          duration_minutes: 60,
          color: '#3b82f6',
        })
        .select(`
          *,
          battlefront:battlefronts(id, name, color)
        `)
        .single();

      if (error) {
        console.error('Create template error:', error);
        throw error;
      }

      setTemplates([data, ...templates]);
      setNewTemplateTitle('');
      setNewTemplateModal(false);
      toast.success('Template created');
    } catch (error: any) {
      console.error('Failed to create template:', error);
      toast.error(error?.message || 'Failed to create template');
    }
  };

  const handleUpdateTitle = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    const newTitle = editTitle.trim();

    if (!newTitle || template?.title === newTitle) {
      setEditingTitle(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('mission_templates')
        .update({ title: newTitle })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;

      setTemplates(templates.map((t) => (t.id === templateId ? data : t)));
      setEditingTitle(null);
      toast.success('Title updated');
    } catch (error) {
      toast.error('Failed to update title');
    }
  };

  const handleUpdateBattlefront = async (templateId: string, battlefrontId: string) => {
    const template = templates.find((t) => t.id === templateId);
    const newBattlefrontId = battlefrontId === '__none__' ? null : battlefrontId;
    if (!template || template.battlefront_id === newBattlefrontId) return;

    try {
      const { data, error } = await supabase
        .from('mission_templates')
        .update({ battlefront_id: newBattlefrontId })
        .eq('id', templateId)
        .select(`
          *,
          battlefront:battlefronts(id, name, color)
        `)
        .single();

      if (error) throw error;

      setTemplates(templates.map((t) => (t.id === templateId ? data : t)));
      toast.success('Battlefront updated');
    } catch (error) {
      toast.error('Failed to update battlefront');
    }
  };

  const handleUpdateDuration = async (templateId: string, duration: number) => {
    try {
      const { data, error } = await supabase
        .from('mission_templates')
        .update({ duration_minutes: duration })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;

      setTemplates(templates.map((t) => (t.id === templateId ? data : t)));
      toast.success('Duration updated');
    } catch (error) {
      toast.error('Failed to update duration');
    }
  };

  const handleDeployTemplate = async (
    templateId: string,
    data: { start_at: string; duration_minutes: number; due_date?: string | null }
  ) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template || !user) return;

    try {
      const { data: mission, error } = await supabase
        .from('missions')
        .insert({
          user_id: user.id,
          title: template.title,
          battlefront_id: template.battlefront_id,
          duration_minutes: data.duration_minutes,
          start_at: data.start_at,
          due_date: data.due_date,
        })
        .select()
        .single();

      if (error) {
        console.error('Create mission error:', error);
        throw error;
      }

      const startDate = new Date(data.start_at);
      const endDate = new Date(startDate.getTime() + data.duration_minutes * 60000);

      const { error: calendarError } = await supabase.from('calendar_events').insert({
        user_id: user.id,
        mission_id: mission.id,
        title: mission.title,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        battlefront_id: template.battlefront_id,
      });

      if (calendarError) {
        console.error('Create calendar event error:', calendarError);
      }

      // Update mission with calendar_event_id
      const { data: calendarEvent } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('mission_id', mission.id)
        .single();

      if (calendarEvent) {
        await supabase
          .from('missions')
          .update({ calendar_event_id: calendarEvent.id })
          .eq('id', mission.id);
      }

      toast.success('Mission deployed to schedule');
      setDeployTemplate(null);
    } catch (error: any) {
      console.error('Failed to deploy mission:', error);
      toast.error(error?.message || 'Failed to deploy mission');
      throw error;
    }
  };

  const handleDeleteTemplate = async (template: MissionTemplate) => {
    try {
      const { error } = await supabase
        .from('mission_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      setTemplates(templates.filter((t) => t.id !== template.id));
      setDeleteConfirm(null);
      toast.success('Template deleted');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const getBattlefrontColor = (battlefrontId: string | null): string | undefined => {
    if (!battlefrontId) return undefined;
    const bf = battlefronts.find((b) => b.id === battlefrontId);
    return bf?.color;
  };

  const clearFilters = () => {
    setBattlefrontFilter(null);
    setSearchQuery('');
  };

  const filteredTemplates = templates
    .filter((t) => {
      if (battlefrontFilter) {
        if (battlefrontFilter === 'unassigned') {
          if (t.battlefront_id) return false;
        } else {
          if (t.battlefront_id !== battlefrontFilter) return false;
        }
      }
      return true;
    })
    .filter((t) => {
      if (searchQuery.trim()) {
        return t.title.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

  const hasActiveFilters = battlefrontFilter || searchQuery.trim();
  const activeBattlefront =
    battlefrontFilter && battlefrontFilter !== 'unassigned'
      ? battlefronts.find((bf) => bf.id === battlefrontFilter)
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Loading Mission Templates...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white">MASTER LIST</h1>
          <p className="text-slate-400 text-sm sm:text-lg mt-1">
            Mission template library
          </p>
        </div>
        <Button
          onClick={() => setNewTemplateModal(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search templates..."
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

      <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm">Mission Template</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden md:table-cell">
                  Battlefront
                </th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden sm:table-cell">
                  Duration
                </th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold w-32 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    {!searchQuery && !battlefrontFilter && 'No templates. Click "New Template" to create one.'}
                    {(searchQuery || battlefrontFilter) && 'No templates matching filters'}
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => {
                  const bfColor = getBattlefrontColor(template.battlefront_id);

                  return (
                    <tr
                      key={template.id}
                      className="hover:bg-slate-800/30 transition-all"
                    >
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          {editingTitle === template.id ? (
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => handleUpdateTitle(template.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateTitle(template.id);
                                if (e.key === 'Escape') setEditingTitle(null);
                              }}
                              className="bg-slate-800 border-slate-600 text-white -my-2"
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingTitle(template.id);
                                setEditTitle(template.title);
                              }}
                              className="cursor-pointer hover:text-blue-400 transition-colors text-sm sm:text-base text-white font-medium"
                            >
                              {template.title}
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
                            value={template.battlefront_id || '__none__'}
                            onValueChange={(value) => handleUpdateBattlefront(template.id, value)}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-32 lg:w-40 text-sm">
                              <SelectValue placeholder="Select">
                                {template.battlefront?.name || 'Unassigned'}
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
                      <td className="p-3 sm:p-4 hidden sm:table-cell">
                        <DurationEditor
                          initialDuration={template.duration_minutes}
                          onSave={(duration) => handleUpdateDuration(template.id, duration)}
                        />
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeployTemplate(template)}
                            className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                            title="Deploy to schedule"
                          >
                            <Rocket className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(template)}
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

      <Card className="bg-slate-900/50 border-slate-700 p-4 sm:p-6">
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-white">{templates.length}</div>
          <div className="text-slate-400 text-xs sm:text-sm mt-1">Mission Templates</div>
        </div>
      </Card>

      {deployTemplate && (
        <DeployMissionModal
          isOpen={true}
          onClose={() => setDeployTemplate(null)}
          mission={{
            id: deployTemplate.id,
            title: deployTemplate.title,
            duration_minutes: deployTemplate.duration_minutes,
            battlefront_id: deployTemplate.battlefront_id,
          } as any}
          onDeploy={handleDeployTemplate}
        />
      )}

      <Dialog open={newTemplateModal} onOpenChange={setNewTemplateModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new mission template that you can deploy multiple times
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Template Name</label>
              <Input
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTemplate();
                }}
                placeholder="e.g., Morning Routine, Deep Work Session"
                className="bg-slate-800 border-slate-600 text-white"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewTemplateModal(false);
                setNewTemplateTitle('');
              }}
              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={!newTemplateTitle.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete &quot;{deleteConfirm?.title}&quot;? This action cannot be undone.
              <span className="block mt-2 text-yellow-400">
                Note: This will not delete any missions created from this template.
              </span>
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
            <Button onClick={() => deleteConfirm && handleDeleteTemplate(deleteConfirm)} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
