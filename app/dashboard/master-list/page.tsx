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
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { DurationEditor } from '@/components/duration-editor';
import { getColorHex } from '@/lib/color-mapping';
import { isPreviewMode } from '@/lib/preview-mode';
import { mockBattlefronts } from '@/lib/mockData';
import {
  getMissionTemplates,
  createMissionTemplate,
  updateMissionTemplate,
  deleteMissionTemplate,
  type MissionTemplate,
} from '@/lib/mission-templates-service';

type Battlefront = {
  id: string;
  name: string;
  color?: string;
};

export default function MasterListPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MissionTemplate[]>([]);
  const [battlefronts, setBattlefronts] = useState<Battlefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateBattlefront, setNewTemplateBattlefront] = useState<string>('__none__');
  const [newTemplateDuration, setNewTemplateDuration] = useState('60');

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
        getMissionTemplates(user.id),
        supabase.from('battlefronts').select('id, name, color').eq('user_id', user.id),
      ]);

      setTemplates(templatesData);
      setBattlefronts(battlefrontsData.data || []);
    } catch (error: any) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!user || !newTemplateTitle.trim()) {
      toast.error('Template title is required');
      return;
    }

    try {
      const newTemplate = await createMissionTemplate(user.id, {
        title: newTemplateTitle.trim(),
        battlefront_id: newTemplateBattlefront === '__none__' ? undefined : newTemplateBattlefront,
        duration_minutes: parseInt(newTemplateDuration) || 60,
      });

      setTemplates([newTemplate, ...templates]);
      setNewTemplateTitle('');
      setNewTemplateBattlefront('__none__');
      setNewTemplateDuration('60');
      setShowNewModal(false);
      toast.success('Template created');
    } catch (error: any) {
      toast.error('Failed to create template');
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
      const updated = await updateMissionTemplate(templateId, { title: newTitle });
      setTemplates(templates.map((t) => (t.id === templateId ? updated : t)));
      setEditingTitle(null);
      toast.success('Title updated');
    } catch (error) {
      toast.error('Failed to update title');
    }
  };

  const handleUpdateDuration = async (templateId: string, duration: number) => {
    try {
      const updated = await updateMissionTemplate(templateId, { duration_minutes: duration });
      setTemplates(templates.map((t) => (t.id === templateId ? updated : t)));
      toast.success('Duration updated');
    } catch (error) {
      toast.error('Failed to update duration');
    }
  };

  const handleUpdateBattlefront = async (templateId: string, battlefrontId: string) => {
    const newBattlefrontId = battlefrontId === '__none__' ? null : battlefrontId;

    try {
      const updated = await updateMissionTemplate(templateId, {
        battlefront_id: newBattlefrontId,
      });
      setTemplates(templates.map((t) => (t.id === templateId ? updated : t)));
      toast.success('Battlefront updated');
    } catch (error) {
      toast.error('Failed to update battlefront');
    }
  };

  const handleDeleteTemplate = async (template: MissionTemplate) => {
    try {
      await deleteMissionTemplate(template.id);
      setTemplates(templates.filter((t) => t.id !== template.id));
      toast.success('Template deleted');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const getBattlefrontColor = (battlefrontId: string | null | undefined): string | undefined => {
    if (!battlefrontId) return undefined;
    const bf = battlefronts.find((b) => b.id === battlefrontId);
    return bf?.color;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">MASTER LIST</h1>
          <p className="text-slate-400 text-lg mt-1">Mission template library</p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold w-12">☐</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm">Mission Template</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden md:table-cell">Battlefront</th>
                <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-sm hidden sm:table-cell">Est. Time</th>
                <th className="text-right p-3 sm:p-4 text-slate-400 font-semibold w-20 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No templates yet. Click &quot;New Template&quot; to create one.
                  </td>
                </tr>
              ) : (
                templates.map((template) => {
                  const bfColor = getBattlefrontColor(template.battlefront_id);
                  return (
                    <tr
                      key={template.id}
                      className="hover:bg-slate-800/30 transition-all"
                    >
                      <td className="p-3 sm:p-4">
                        <div className="w-6 h-6 rounded border-2 border-slate-600 flex items-center justify-center">
                          {/* Checkbox visual only for now */}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
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
                            className="cursor-pointer hover:text-blue-400 transition-colors text-white font-medium"
                          >
                            {template.title}
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
                            value={template.battlefront_id || '__none__'}
                            onValueChange={(value) => handleUpdateBattlefront(template.id, value)}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-32 lg:w-40 text-sm">
                              <SelectValue placeholder="Select battlefront">
                                {template.battlefront?.name || 'Unassigned'}
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
                          initialDuration={template.duration_minutes}
                          onSave={(duration) => handleUpdateDuration(template.id, duration)}
                        />
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTitle(template.id);
                              setEditTitle(template.title);
                            }}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template)}
                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                            title="Delete template"
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

      {/* New Template Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a reusable mission template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm mb-2 block">Template Name *</label>
              <Input
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="e.g., Morning Workout"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTemplateTitle.trim()) {
                    handleCreateTemplate();
                  }
                }}
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm mb-2 block">Battlefront (optional)</label>
              <Select value={newTemplateBattlefront} onValueChange={setNewTemplateBattlefront}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select battlefront" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="__none__" className="text-white">No battlefront</SelectItem>
                  {battlefronts.map((bf) => (
                    <SelectItem key={bf.id} value={bf.id} className="text-white">
                      {bf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-slate-300 text-sm mb-2 block">Default Duration (minutes)</label>
              <Input
                type="number"
                value={newTemplateDuration}
                onChange={(e) => setNewTemplateDuration(e.target.value)}
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
                setNewTemplateTitle('');
                setNewTemplateBattlefront('__none__');
                setNewTemplateDuration('60');
              }}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              className="bg-green-600 hover:bg-green-700"
              disabled={!newTemplateTitle.trim()}
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
