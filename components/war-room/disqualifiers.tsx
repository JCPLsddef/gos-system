'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Disqualifier = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
};

type DisqualifiersProps = {
  userId: string;
};

export function Disqualifiers({ userId }: DisqualifiersProps) {
  const [items, setItems] = useState<Disqualifier[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    loadItems();
  }, [userId]);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('war_room_disqualifiers')
      .select('*')
      .eq('user_id', userId)
      .order('order_index');

    if (!error && data) {
      setItems(data as Disqualifier[]);
    }
  };

  const addItem = async () => {
    if (!newTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('war_room_disqualifiers')
        .insert({
          user_id: userId,
          title: newTitle,
          description: newDescription || null,
          order_index: items.length,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, data as Disqualifier]);
      setNewTitle('');
      setNewDescription('');
      setIsAdding(false);
      toast.success('Added');
    } catch (error: any) {
      toast.error('Failed to add');
    }
  };

  const removeItem = async (id: string) => {
    try {
      const { error } = await supabase.from('war_room_disqualifiers').delete().eq('id', id);

      if (error) throw error;

      setItems(items.filter((i) => i.id !== id));
      toast.success('Removed');
    } catch (error: any) {
      toast.error('Failed to remove');
    }
  };

  return (
    <Card className="bg-slate-900/50 border-red-900/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            DISQUALIFIERS
          </h2>
          <p className="text-slate-400 text-sm">Behaviors that instantly fail the day</p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 group hover:border-red-800 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-red-300 font-semibold">{item.title}</h3>
                {item.description && <p className="text-slate-400 text-sm mt-1">{item.description}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {isAdding && (
          <div className="bg-red-950/20 border border-red-800 rounded-lg p-4 space-y-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Disqualifier..."
              className="bg-slate-900 border-red-800 text-white"
              autoFocus
            />
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description..."
              className="bg-slate-900 border-red-800 text-white min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button onClick={addItem} className="bg-red-600 hover:bg-red-700">
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                  setNewDescription('');
                }}
                className="border-red-800 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 && !isAdding && (
          <div className="text-center py-8 text-slate-400">No disqualifiers defined</div>
        )}
      </div>
    </Card>
  );
}
