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

type Battlefront = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'WON' | 'COLLAPSING';
  binary_exit_target: string;
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
            .select('status')
            .eq('battlefront_id', front.id);

          const checkpointsDone = checkpoints?.filter((c) => c.done).length || 0;
          const checkpointsTotal = checkpoints?.length || 0;
          const missionsDone = missions?.filter((m) => m.status === 'DONE').length || 0;
          const missionsTotal = missions?.length || 0;

          return {
            ...front,
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
        binary_exit_target: '',
      });

      if (error) throw error;

      toast.success('Battlefront created');
      setDialogOpen(false);
      setNewName('');
      setNewStatus('ACTIVE');
      loadBattlefronts();
    } catch (error: any) {
      toast.error('Failed to create battlefront');
    } finally {
      setCreating(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {battlefronts.map((front) => (
            <Link key={front.id} href={`/dashboard/battlefront/${front.id}`}>
              <Card className="bg-slate-900/50 border-slate-700 hover:border-blue-500 transition-all cursor-pointer h-full p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold text-white">{front.name}</h3>
                    <Badge className={`${getStatusColor(front.status)} text-white flex items-center gap-1`}>
                      {getStatusIcon(front.status)}
                      {front.status}
                    </Badge>
                  </div>

                  {front.binary_exit_target && (
                    <p className="text-sm text-slate-400 line-clamp-2">{front.binary_exit_target}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Checkpoints</span>
                      <span className="text-white font-semibold">
                        {front.checkpointsDone} / {front.checkpointsTotal}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            front.checkpointsTotal > 0
                              ? (front.checkpointsDone / front.checkpointsTotal) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-700">
                    <span className="text-slate-400">Weekly Missions</span>
                    <span className="text-white font-semibold">
                      {front.missionsDone} / {front.missionsTotal}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
