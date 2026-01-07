'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

type NonNegotiable = {
  id: string;
  title: string;
  order_index: number;
};

type Check = {
  id: string;
  nonnegotiable_id: string;
  completed: boolean;
};

type NonNegotiablesProps = {
  userId: string;
};

export function NonNegotiables({ userId }: NonNegotiablesProps) {
  const [items, setItems] = useState<NonNegotiable[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    const [itemsRes, checksRes] = await Promise.all([
      supabase.from('war_room_nonnegotiables').select('*').eq('user_id', userId).order('order_index'),
      supabase
        .from('war_room_nonnegotiable_checks')
        .select('*')
        .eq('user_id', userId)
        .eq('check_date', today),
    ]);

    if (itemsRes.data) setItems(itemsRes.data as NonNegotiable[]);
    if (checksRes.data) setChecks(checksRes.data as Check[]);
  };

  const addItem = async () => {
    if (!newTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('war_room_nonnegotiables')
        .insert({
          user_id: userId,
          title: newTitle,
          order_index: items.length,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, data as NonNegotiable]);
      setNewTitle('');
      setIsAdding(false);
      toast.success('Added');
    } catch (error: any) {
      toast.error('Failed to add');
    }
  };

  const removeItem = async (id: string) => {
    try {
      const { error } = await supabase.from('war_room_nonnegotiables').delete().eq('id', id);

      if (error) throw error;

      setItems(items.filter((i) => i.id !== id));
      setChecks(checks.filter((c) => c.nonnegotiable_id !== id));
      toast.success('Removed');
    } catch (error: any) {
      toast.error('Failed to remove');
    }
  };

  const toggleCheck = async (itemId: string, currentlyChecked: boolean) => {
    try {
      if (currentlyChecked) {
        const check = checks.find((c) => c.nonnegotiable_id === itemId);
        if (check) {
          await supabase.from('war_room_nonnegotiable_checks').delete().eq('id', check.id);
          setChecks(checks.filter((c) => c.id !== check.id));
        }
      } else {
        const { data, error } = await supabase
          .from('war_room_nonnegotiable_checks')
          .insert({
            nonnegotiable_id: itemId,
            user_id: userId,
            check_date: today,
            completed: true,
          })
          .select()
          .single();

        if (error) throw error;
        setChecks([...checks, data as Check]);
      }
    } catch (error: any) {
      toast.error('Failed to update');
    }
  };

  const isChecked = (itemId: string) => checks.some((c) => c.nonnegotiable_id === itemId);

  return (
    <Card className="bg-slate-900/50 border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">NON-NEGOTIABLES</h2>
          <p className="text-slate-400 text-sm">Daily commitments</p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-lg p-3 group hover:border-slate-600 transition-colors"
          >
            <Checkbox checked={isChecked(item.id)} onCheckedChange={() => toggleCheck(item.id, isChecked(item.id))} />
            <span className={`flex-1 text-white ${isChecked(item.id) ? 'line-through text-slate-400' : ''}`}>
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {isAdding && (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3 space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Commitment..."
              className="bg-slate-900 border-slate-600 text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') addItem();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewTitle('');
                }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={addItem} className="bg-blue-600 hover:bg-blue-700">
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                }}
                className="border-slate-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 && !isAdding && (
          <div className="text-center py-8 text-slate-400">No commitments yet</div>
        )}
      </div>
    </Card>
  );
}
