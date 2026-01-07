'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Rule = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
};

type CodeOfHonorProps = {
  userId: string;
};

export function CodeOfHonor({ userId }: CodeOfHonorProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    loadRules();
  }, [userId]);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('war_room_rules')
      .select('*')
      .eq('user_id', userId)
      .order('order_index');

    if (!error && data) {
      setRules(data as Rule[]);
    }
  };

  const addRule = async () => {
    if (!newTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('war_room_rules')
        .insert({
          user_id: userId,
          title: newTitle,
          description: newDescription || null,
          order_index: rules.length,
        })
        .select()
        .single();

      if (error) throw error;

      setRules([...rules, data as Rule]);
      setNewTitle('');
      setNewDescription('');
      setIsAdding(false);
      toast.success('Rule added');
    } catch (error: any) {
      toast.error('Failed to add rule');
    }
  };

  const removeRule = async (id: string) => {
    try {
      const { error } = await supabase.from('war_room_rules').delete().eq('id', id);

      if (error) throw error;

      setRules(rules.filter((r) => r.id !== id));
      toast.success('Rule removed');
    } catch (error: any) {
      toast.error('Failed to remove rule');
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">CODE OF HONOR</h2>
        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Rule
        </Button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 group hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-white font-semibold">{rule.title}</h3>
                {rule.description && (
                  <p className="text-slate-400 text-sm mt-1">{rule.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRule(rule.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {isAdding && (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 space-y-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Rule title..."
              className="bg-slate-900 border-slate-600 text-white"
              autoFocus
            />
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description..."
              className="bg-slate-900 border-slate-600 text-white min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button onClick={addRule} className="bg-blue-600 hover:bg-blue-700">
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                  setNewDescription('');
                }}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {rules.length === 0 && !isAdding && (
          <div className="text-center py-8 text-slate-400">
            No rules yet. Define your Code of Honor.
          </div>
        )}
      </div>
    </Card>
  );
}
