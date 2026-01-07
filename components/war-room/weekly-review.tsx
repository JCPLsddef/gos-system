'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { Save } from 'lucide-react';

type Review = {
  id: string;
  what_worked: string;
  what_failed: string;
  fix_action: string;
  what_to_improve: string;
  new_opportunities: string;
  missed_opportunities: string;
  updated_at: string;
};

type WeeklyReviewProps = {
  userId: string;
};

export function WeeklyReview({ userId }: WeeklyReviewProps) {
  const [review, setReview] = useState<Review | null>(null);
  const [whatWorked, setWhatWorked] = useState('');
  const [whatFailed, setWhatFailed] = useState('');
  const [fixAction, setFixAction] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [newOpportunities, setNewOpportunities] = useState('');
  const [missedOpportunities, setMissedOpportunities] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => {
    loadReview();
  }, [userId]);

  const loadReview = async () => {
    const { data, error } = await supabase
      .from('war_room_weekly_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (data) {
      setReview(data as Review);
      setWhatWorked(data.what_worked || '');
      setWhatFailed(data.what_failed || '');
      setFixAction(data.fix_action || '');
      setWhatToImprove(data.what_to_improve || '');
      setNewOpportunities(data.new_opportunities || '');
      setMissedOpportunities(data.missed_opportunities || '');
    }
  };

  const saveReview = async () => {
    setIsSaving(true);
    try {
      const payload = {
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        what_worked: whatWorked,
        what_failed: whatFailed,
        fix_action: fixAction,
        what_to_improve: whatToImprove,
        new_opportunities: newOpportunities,
        missed_opportunities: missedOpportunities,
      };

      if (review) {
        const { error } = await supabase
          .from('war_room_weekly_reviews')
          .update(payload)
          .eq('id', review.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('war_room_weekly_reviews')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setReview(data as Review);
      }

      toast.success('Review saved');
    } catch (error: any) {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">WEEKLY REVIEW</h2>
          <p className="text-slate-400 text-sm">
            Week of {format(new Date(weekStart), 'MMM d')} - {format(new Date(weekEnd), 'MMM d, yyyy')}
          </p>
        </div>
        <Button
          size="sm"
          onClick={saveReview}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="w-4 h-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="what-worked" className="text-slate-300 text-sm">
            What Worked
          </Label>
          <Textarea
            id="what-worked"
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            placeholder="What strategies, habits, or decisions led to wins this week?"
            className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="what-failed" className="text-slate-300 text-sm">
            What Failed
          </Label>
          <Textarea
            id="what-failed"
            value={whatFailed}
            onChange={(e) => setWhatFailed(e.target.value)}
            placeholder="What went wrong? What patterns need to change?"
            className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="fix-action" className="text-slate-300 text-sm">
            Fix Action
          </Label>
          <Textarea
            id="fix-action"
            value={fixAction}
            onChange={(e) => setFixAction(e.target.value)}
            placeholder="What specific action will you take to improve next week?"
            className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="what-to-improve" className="text-slate-300 text-sm">
            What to Improve From Now On
          </Label>
          <Textarea
            id="what-to-improve"
            value={whatToImprove}
            onChange={(e) => setWhatToImprove(e.target.value)}
            placeholder="What areas need continuous improvement going forward?"
            className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="new-opportunities" className="text-slate-300 text-sm">
            New Opportunities
          </Label>
          <Textarea
            id="new-opportunities"
            value={newOpportunities}
            onChange={(e) => setNewOpportunities(e.target.value)}
            placeholder="What new opportunities have emerged or been identified?"
            className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="missed-opportunities" className="text-slate-300 text-sm">
            Missed Opportunities
          </Label>
          <Textarea
            id="missed-opportunities"
            value={missedOpportunities}
            onChange={(e) => setMissedOpportunities(e.target.value)}
            placeholder="What opportunities were missed this week?"
            className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[100px]"
          />
        </div>

        {review && (
          <p className="text-xs text-slate-500 text-right">
            Last updated: {format(new Date(review.updated_at), 'MMM d, h:mm a')}
          </p>
        )}
      </div>
    </Card>
  );
}
