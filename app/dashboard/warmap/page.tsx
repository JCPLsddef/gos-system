'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Sword, Shield, Skull } from 'lucide-react';
import Link from 'next/link';
import { ColorPicker } from '@/components/color-picker';
import { getColorHex } from '@/lib/color-mapping';

type Battlefront = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'WON' | 'COLLAPSING';
  binary_exit_target: string;
  color: string;
  checkpointsDone: number;
  checkpointsTotal: number;
  missionsDone: number;
  missionsTotal: number;
};

export default function WarMapPage() {
  const { user } = useAuth();
  const [battlefronts, setBattlefronts] = useState<Battlefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'WON' | 'COLLAPSING'>('ACTIVE');
  const [newColor, setNewColor] = useState('blue');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBattlefronts();
  }, [user]);

  const loadBattlefronts = async () => {
    if (!user) return;

    try {
      const { data: fronts, error } = await supabase
        .from('battlefronts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const frontsWithProgress = await Promise.all(
        (fronts || []).map(async (front) => {
          const { data: checkpoints } = await supabase
            .from('checkpoints')
            .select('done')
            .eq('battlefront_id', front.id);

          const { data: missions } = await supabase
            .from('missions')
            .select('completed_at')
            .eq('battlefront_id', front.id);

          const checkpointsDone = checkpoints?.filter((c) => c.done).length || 0;
          const checkpointsTotal = checkpoints?.length || 0;
          const missionsDone = missions?.filter((m) => m.completed_at !== null).length || 0;
          const missionsTotal = missions?.length || 0;

          return {
            ...front,
            color: front.color || 'blue',
            checkpointsDone,
            checkpointsTotal,
            missionsDone,
            missionsTotal,
          };
        })
      );

      setBattlefronts(frontsWithProgress);
    } catch (error: any) {
      toast.error('Failed to load battlefronts');
    } finally {
      setLoading(false);
    }
  };

  const createBattlefront = async () => {
    if (!user || !newName.trim()) {
      toast.error('Name is required');
      return;
    }

    setCreating(true);

    try {
      const { error } = await supabase.from('battlefronts').insert({
        user_id: user.id,
        name: newName,
        status: newStatus,
        color: newColor,
        binary_exit_target: '',
      });

      if (error) throw error;

      toast.success('Battlefront created');
      setDialogOpen(false);
      setNewName('');
      setNewStatus('ACTIVE');
      setNewColor('blue');
      loadBattlefronts();
    } catch (error: any) {
      toast.error('Failed to create battlefront');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateColor = async (frontId: string, color: string) => {
    try {
      const { error } = await supabase
        .from('battlefronts')
        .update({ color })
        .eq('id', frontId);

      if (error) throw error;

      setBattlefronts(battlefronts.map((bf) =>
        bf.id === frontId ? { ...bf, color } : bf
      ));
      toast.success('Color updated');
    } catch (error) {
      toast.error('Failed to update color');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Sword className="w-5 h-5" />;
      case 'WON':
        return <Shield className="w-5 h-5" />;
      case 'COLLAPSING':
        return <Skull className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-600';
      case 'WON':
        return 'bg-green-600';
      case 'COLLAPSING':
        return 'bg-red-600';
      default:
        return 'bg-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Loading war map...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">WAR MAP</h1>
          <p className="text-slate-400 text-lg mt-1">Strategic Battlefronts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5 mr-2" />
              New Battlefront
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Create New Battlefront</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Battlefront Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Revenue Growth, Physical Dominance"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Initial Status</Label>
                <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="WON">WON</SelectItem>
                    <SelectItem value="COLLAPSING">COLLAPSING</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <ColorPicker value={newColor} onChange={setNewColor} />
                  <span className="text-slate-400 text-sm capitalize">{newColor}</span>
                </div>
              </div>
              <Button
                onClick={createBattlefront}
                disabled={creating}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {creating ? 'Creating...' : 'Create Battlefront'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {battlefronts.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700 p-12 text-center">
          <h3 className="text-xl text-white mb-2">No Battlefronts Yet</h3>
          <p className="text-slate-400 mb-6">Create your first battlefront to start executing</p>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Create First Battlefront
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {battlefronts.map((front) => (
            <Card
              key={front.id}
              className="bg-slate-900/50 border-slate-700 hover:border-slate-500 transition-all flex flex-col"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getColorHex(front.color) }}
                      title={`Color: ${front.color}`}
                    />
                    <Link href={`/dashboard/battlefronts/${front.id}`} className="min-w-0">
                      <h3 className="text-xl font-bold text-white hover:text-blue-400 transition-colors cursor-pointer truncate">
                        {front.name}
                      </h3>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <ColorPicker
                      value={front.color}
                      onChange={(color) => handleUpdateColor(front.id, color)}
                    />
                    <Badge className={`${getStatusColor(front.status)} text-white flex items-center gap-1 whitespace-nowrap`}>
                      {getStatusIcon(front.status)}
                      {front.status}
                    </Badge>
                  </div>
                </div>

                <div className="h-10 mb-4">
                  {front.binary_exit_target ? (
                    <p className="text-sm text-slate-400 line-clamp-2">{front.binary_exit_target}</p>
                  ) : (
                    <p className="text-sm text-slate-600 italic">No target set</p>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Checkpoints</span>
                    <span className="text-white font-semibold">
                      {front.checkpointsDone} / {front.checkpointsTotal}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        backgroundColor: getColorHex(front.color),
                        width: `${
                          front.checkpointsTotal > 0
                            ? (front.checkpointsDone / front.checkpointsTotal) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm py-3 border-t border-slate-700">
                  <span className="text-slate-400">Weekly Missions</span>
                  <span className="text-white font-semibold">
                    {front.missionsDone} / {front.missionsTotal}
                  </span>
                </div>

                <div className="mt-auto pt-2">
                  <Link href={`/dashboard/battlefronts/${front.id}`}>
                    <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-800">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
