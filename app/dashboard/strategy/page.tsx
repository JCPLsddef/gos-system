'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function GrandStrategyPage() {
  const { user } = useAuth();
  const [strategy, setStrategy] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStrategy();
  }, [user]);

  const loadStrategy = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('grand_strategy')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStrategy(data.grand_strategy || '');
      } else {
        await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            grand_strategy: '',
          });
      }
    } catch (error: any) {
      toast.error('Failed to load strategy');
    } finally {
      setLoading(false);
    }
  };

  const saveStrategy = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            grand_strategy: strategy,
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) throw error;

      toast.success('Grand Strategy saved');
    } catch (error: any) {
      console.error('Error saving strategy:', error);
      toast.error('Failed to save strategy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white">GRAND STRATEGY</h1>
        <p className="text-slate-400 text-lg">Why I Fight</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 p-8">
        <div className="space-y-6">
          <div>
            <p className="text-slate-300 mb-4 leading-relaxed">
              This is your core purpose. The reason you wake up and execute every day.
              Define what success means to you. Be specific. Be honest. This drives everything.
            </p>
          </div>

          <Textarea
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            placeholder="Example: Build a $10M/year business that allows me to train full-time while helping 1000+ entrepreneurs achieve freedom..."
            className="min-h-[300px] bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-lg leading-relaxed resize-none"
          />

          <Button
            onClick={saveStrategy}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'SAVE GRAND STRATEGY'}
          </Button>
        </div>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h3 className="text-white font-semibold mb-3">Strategic Clarity</h3>
        <ul className="space-y-2 text-slate-400">
          <li>• Your Grand Strategy is the filter for all decisions</li>
          <li>• If a battlefront doesn't serve this, it's a distraction</li>
          <li>• Review this weekly to ensure you're still aligned</li>
          <li>• Update it as you evolve, but don't chase shiny objects</li>
        </ul>
      </Card>
    </div>
  );
}
