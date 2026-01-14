'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Rocket, Trash2, Clock, Layers } from 'lucide-react';
import { DurationEditor } from '@/components/duration-editor';
import { DeployMissionModal } from '@/components/deploy-mission-modal';
import { getColorHex } from '@/lib/color-mapping';
import { isPreviewMode } from '@/lib/preview-mode';
import { mockBattlefronts } from '@/lib/mockData';
import { getMissionTemplates, type MissionTemplate } from '@/lib/mission-templates-service';

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
  const [newTemplateModal, setNewTemplateModal] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [deployTemplate, setDeployTemplate] = useState<MissionTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MissionTemplate | null>(null);

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

      if (error) throw error;

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
        .select(`
          *,
          battlefront:battlefronts(id, name, color)
        `)
        .single();

      if (error) throw error;

      setTemplates(templates.map((t) => (t.id === templateId ? data : t)));
      setEditingTitle(null);
      toast.success('Title updated');
    } catch (error) {
      toast.error('Failed to update title');
    }
  };

  const handleUpdateDuration = async (templateId: string, duration: number) => {
    try {
      const { data, error } = await supabase
        .from('mission_templates')
        .update({ duration_minutes: duration })
        .eq('id', templateId)
        .select(`
          *,
          battlefront:battlefronts(id, name, color)
        `)
        .single();

      if (error) throw error;

      setTemplates(templates.map((t) => (t.id === templateId ? data : t)));
      toast.success('Duration updated');
    } catch (error) {
      toast.error('Failed to update duration');
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
        <Button onClick={() => setNewTemplateModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-amber-900/20 to-slate-900/50 border-amber-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-4 text-slate-400 font-medium">Template</th>
                <th className="text-left p-4 text-slate-400 font-medium">Battlefront</th>
                <th className="text-left p-4 text-slate-400 font-medium">Est. Time</th>
                <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">
                    <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No templates yet. Click &quot;New Template&quot; to create one.</p>
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4">
                      {editingTitle === template.id ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleUpdateTitle(template.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateTitle(template.id);
                            if (e.key === 'Escape') setEditingTitle(null);
                          }}
                          className="bg-slate-800 border-slate-600 text-white"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="text-white hover:text-blue-400 cursor-pointer"
                          onClick={() => {
                            setEditingTitle(template.id);
                            setEditTitle(template.title);
                          }}
                        >
                          {template.title}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {template.battlefront ? (
                        <Badge
                          className="text-white flex items-center gap-1.5 w-fit"
                          style={{
                            backgroundColor: getColorHex(template.battlefront.color) + '40',
                            borderColor: getColorHex(template.battlefront.color),
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getColorHex(template.battlefront.color) }}
                          />
                          {template.battlefront.name}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <DurationEditor
                        duration={template.duration_minutes}
                        onChange={(newDuration) => handleUpdateDuration(template.id, newDuration)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeployTemplate(template)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/30"
                          title="Deploy to calendar"
                        >
                          <Rocket className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(template)}
                          className="text-slate-400 hover:text-red-400 hover:bg-slate-700"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Template Modal */}
      <Dialog open={newTemplateModal} onOpenChange={setNewTemplateModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new mission template that you can deploy multiple times
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm mb-2 block">Template Name</label>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewTemplateModal(false);
                setNewTemplateTitle('');
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

      {/* Deploy Modal */}
      {deployTemplate && (
        <DeployMissionModal
          isOpen={!!deployTemplate}
          onClose={() => setDeployTemplate(null)}
          template={deployTemplate}
          battlefronts={battlefronts}
          onDeploy={async () => {
            await loadData();
            toast.success('Mission deployed to calendar');
          }}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete &quot;{deleteConfirm?.title}&quot;? This action cannot be undone.
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
              onClick={() => deleteConfirm && handleDeleteTemplate(deleteConfirm)}
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
