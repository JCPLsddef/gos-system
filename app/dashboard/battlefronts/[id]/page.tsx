'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { Mission } from '@/lib/missions-service';

type Battlefront = {
  id: string;
  name: string;
  binary_exit_target: string;
  user_id: string;
};

type Checkpoint = {
  id: string;
  title: string;
  order_index: number;
  done: boolean;
  battlefront_id: string;
  user_id: string;
};

export default function BattlefrontPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const battlefrontId = params.id as string;

  const [battlefront, setBattlefront] = useState<Battlefront | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [binaryExitTarget, setBinaryExitTarget] = useState('');
  const [newCheckpointTitle, setNewCheckpointTitle] = useState('');

  useEffect(() => {
    if (user && battlefrontId) {
      loadData();
    }
  }, [user, battlefrontId]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [bfData, cpData, missionsData] = await Promise.all([
        supabase.from('battlefronts').select('*').eq('id', battlefrontId).eq('user_id', user.id).maybeSingle(),
        supabase
          .from('checkpoints')
          .select('*')
          .eq('battlefront_id', battlefrontId)
          .order('order_index', { ascending: true }),
        supabase
          .from('missions')
          .select(`
            *,
            battlefront:battlefronts(id, name)
          `)
          .eq('battlefront_id', battlefrontId)
          .eq('user_id', user.id)
          .order('start_at', { ascending: true }),
      ]);

      if (!bfData.data) {
        toast.error('Battlefront not found');
        router.push('/dashboard/warmap');
        return;
      }

      setBattlefront(bfData.data);
      setName(bfData.data.name);
      setBinaryExitTarget(bfData.data.binary_exit_target || '');
      setCheckpoints(cpData.data || []);
      setMissions(missionsData.data || []);
    } catch (error: any) {
      toast.error('Failed to load battlefront');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!battlefront || !name.trim()) return;

    try {
      const { error } = await supabase
        .from('battlefronts')
        .update({ name: name.trim() })
        .eq('id', battlefront.id);

      if (error) throw error;

      setBattlefront({ ...battlefront, name: name.trim() });
      setEditingName(false);
      toast.success('Name updated');
    } catch (error) {
      toast.error('Failed to update name');
    }
  };

  const handleUpdateBinaryExitTarget = async () => {
    if (!battlefront) return;

    try {
      const { error } = await supabase
        .from('battlefronts')
        .update({ binary_exit_target: binaryExitTarget })
        .eq('id', battlefront.id);

      if (error) throw error;

      toast.success('Binary Exit Target updated');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleAddCheckpoint = async () => {
    if (!newCheckpointTitle.trim() || !battlefront || !user) return;

    try {
      const { data, error } = await supabase
        .from('checkpoints')
        .insert({
          battlefront_id: battlefront.id,
          user_id: user.id,
          title: newCheckpointTitle.trim(),
          order_index: checkpoints.length,
          done: false,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Checkpoint insert error:', error);
        throw error;
      }

      setCheckpoints([...checkpoints, data]);
      setNewCheckpointTitle('');
      toast.success('Checkpoint added');
    } catch (error: any) {
      console.error('Failed to add checkpoint:', error);
      toast.error(`Failed to add checkpoint: ${error.message || 'Unknown error'}`);
    }
  };

  const handleToggleCheckpoint = async (checkpoint: Checkpoint) => {
    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({ done: !checkpoint.done })
        .eq('id', checkpoint.id);

      if (error) throw error;

      setCheckpoints(checkpoints.map((cp) => (cp.id === checkpoint.id ? { ...cp, done: !cp.done } : cp)));
      toast.success(checkpoint.done ? 'Checkpoint reopened' : 'Checkpoint completed');
    } catch (error) {
      toast.error('Failed to update checkpoint');
    }
  };

  const handleDeleteCheckpoint = async (checkpointId: string) => {
    if (!confirm('Delete this checkpoint?')) return;

    try {
      const { error } = await supabase.from('checkpoints').delete().eq('id', checkpointId);

      if (error) throw error;

      setCheckpoints(checkpoints.filter((cp) => cp.id !== checkpointId));
      toast.success('Checkpoint deleted');
    } catch (error) {
      toast.error('Failed to delete checkpoint');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!battlefront) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Battlefront not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/warmap">
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          {editingName ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleUpdateName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateName();
                if (e.key === 'Escape') {
                  setEditingName(false);
                  setName(battlefront.name);
                }
              }}
              className="text-xl md:text-2xl lg:text-4xl font-bold bg-slate-800 border-slate-600 text-white"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => setEditingName(true)}
              className="text-xl md:text-2xl lg:text-4xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors truncate"
            >
              BATTLEFRONT: {battlefront.name}
            </h1>
          )}
          <p className="text-slate-400 text-sm md:text-base lg:text-lg mt-1">Strategy, checkpoints & missions</p>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h3 className="text-xl text-white mb-4 font-semibold">Binary Exit Target</h3>
        <Textarea
          value={binaryExitTarget}
          onChange={(e) => setBinaryExitTarget(e.target.value)}
          onBlur={handleUpdateBinaryExitTarget}
          className="bg-slate-800 border-slate-600 text-white min-h-[120px] resize-y focus:ring-2 focus:ring-blue-500 transition-all"
          placeholder="Define clear success criteria for this battlefront..."
        />
        <p className="text-slate-500 text-sm mt-2">
          What does success look like? Be specific and measurable. Changes save automatically.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Checkpoints</h3>
            <span className="text-slate-400 text-sm">
              {checkpoints.filter((cp) => cp.done).length}/{checkpoints.length}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            {checkpoints.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No checkpoints yet</p>
            ) : (
              checkpoints.map((checkpoint, index) => (
                <div
                  key={checkpoint.id}
                  className="flex items-start gap-3 p-3 bg-slate-800/50 rounded border border-slate-700 hover:border-slate-600 transition-all"
                >
                  <button
                    onClick={() => handleToggleCheckpoint(checkpoint)}
                    className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      checkpoint.done
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-600 hover:border-blue-500'
                    }`}
                  >
                    {checkpoint.done && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-white ${
                        checkpoint.done ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {checkpoint.title}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCheckpoint(checkpoint.id)}
                    className="text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={newCheckpointTitle}
              onChange={(e) => setNewCheckpointTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCheckpoint();
              }}
              className="bg-slate-800 border-slate-600 text-white"
              placeholder="New checkpoint..."
            />
            <Button onClick={handleAddCheckpoint} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Missions</h3>
            <span className="text-slate-400 text-sm">{missions.length} total</span>
          </div>

          <div className="space-y-2">
            {missions.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">
                No missions yet. Assign missions from Master Missions page.
              </p>
            ) : (
              missions.map((mission) => (
                <div
                  key={mission.id}
                  className="p-3 bg-slate-800/50 rounded border border-slate-700 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {mission.completed_at ? (
                        <div className="w-5 h-5 rounded bg-green-500 border-green-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded border-2 border-slate-600" />
                      )}
                      <span
                        className={`text-white ${
                          mission.completed_at ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {mission.title}
                      </span>
                    </div>
                    {mission.start_at && (
                      <span className="text-slate-400 text-sm">{formatDate(mission.start_at)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/dashboard/missions">
            <Button className="w-full mt-4 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white">
              Manage Missions
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
