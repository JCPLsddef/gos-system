import { supabase } from './supabase';

export type MissionTemplate = {
  id: string;
  user_id: string;
  title: string;
  battlefront_id: string | null;
  duration_minutes: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  battlefront?: {
    id: string;
    name: string;
    color?: string;
  } | null;
};

export async function getMissionTemplates(userId: string): Promise<MissionTemplate[]> {
  const { data, error } = await supabase
    .from('mission_templates')
    .select(`
      *,
      battlefront:battlefronts(id, name, color)
    `)
    .eq('user_id', userId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createMissionTemplate(
  userId: string,
  data: {
    title: string;
    battlefront_id?: string;
    duration_minutes?: number;
  }
): Promise<MissionTemplate> {
  // Get the next order_index
  const { data: existingTemplates } = await supabase
    .from('mission_templates')
    .select('order_index')
    .eq('user_id', userId)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrderIndex = existingTemplates && existingTemplates.length > 0
    ? existingTemplates[0].order_index + 1
    : 0;

  const { data: newTemplate, error } = await supabase
    .from('mission_templates')
    .insert({
      user_id: userId,
      title: data.title,
      battlefront_id: data.battlefront_id || null,
      duration_minutes: data.duration_minutes || 60,
      order_index: nextOrderIndex,
    })
    .select(`
      *,
      battlefront:battlefronts(id, name, color)
    `)
    .single();

  if (error) throw error;
  return newTemplate;
}

export async function updateMissionTemplate(
  templateId: string,
  data: Partial<{
    title: string;
    battlefront_id: string | null;
    duration_minutes: number;
    order_index: number;
  }>
): Promise<MissionTemplate> {
  const { data: updated, error } = await supabase
    .from('mission_templates')
    .update(data)
    .eq('id', templateId)
    .select(`
      *,
      battlefront:battlefronts(id, name, color)
    `)
    .single();

  if (error) throw error;
  return updated;
}

export async function deleteMissionTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('mission_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

export async function reorderMissionTemplates(
  userId: string,
  templateIds: string[]
): Promise<void> {
  // Update each template with its new order_index
  const updates = templateIds.map((id, index) =>
    supabase
      .from('mission_templates')
      .update({ order_index: index })
      .eq('id', id)
      .eq('user_id', userId)
  );

  await Promise.all(updates);
}
