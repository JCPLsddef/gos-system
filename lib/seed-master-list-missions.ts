import { supabase } from './supabase';

type BattlefrontMapping = {
  [key: string]: string;
};

type SeedMission = {
  title: string;
  battlefront: string;
  due_date: string;
  duration_minutes: number;
};

const SEED_MISSIONS: SeedMission[] = [
  // BUSINESS
  { title: 'Build CRM for leads (Name/City/Phone/Email/Status/Last touch/Next touch)', battlefront: 'BUSINESS', due_date: '2026-01-14', duration_minutes: 20 },
  { title: 'Lock RV Rental ICP sentence (1-line positioning)', battlefront: 'BUSINESS', due_date: '2026-01-14', duration_minutes: 15 },
  { title: 'Write outreach scripts (cold email + follow-up + call opener)', battlefront: 'BUSINESS', due_date: '2026-01-15', duration_minutes: 45 },
  { title: 'Create 1-page RV Offer Doc (sendable link/PDF)', battlefront: 'BUSINESS', due_date: '2026-01-16', duration_minutes: 60 },
  { title: 'Build first 50 RV rental leads (Google Maps)', battlefront: 'BUSINESS', due_date: '2026-01-17', duration_minutes: 90 },
  { title: 'Build lead engine to 200 total RV leads', battlefront: 'BUSINESS', due_date: '2026-01-26', duration_minutes: 180 },
  { title: 'Create follow-up system rules (Day3 + Day7 + close/lost statuses)', battlefront: 'BUSINESS', due_date: '2026-01-20', duration_minutes: 30 },
  { title: 'Book 5 sales calls (after 17:00)', battlefront: 'BUSINESS', due_date: '2026-02-07', duration_minutes: 60 },
  { title: 'Close 1st client (signed + payment terms)', battlefront: 'BUSINESS', due_date: '2026-02-14', duration_minutes: 60 },
  { title: 'Reach $5k/month recurring (contracts sum to 5,000/mo)', battlefront: 'BUSINESS', due_date: '2026-02-28', duration_minutes: 60 },

  // GOD / SPIRITUALITY
  { title: 'Create 12-week prayer + giving tracker (14 prayers/week + 1 service/week)', battlefront: 'GOD', due_date: '2026-01-14', duration_minutes: 20 },
  { title: '12-week completion: 14 prayers/week + 1 act of service/week (streak)', battlefront: 'GOD', due_date: '2026-04-08', duration_minutes: 20 },

  // HEALTH / TRAINING
  { title: 'Confirm/schedule first sparring session with coach', battlefront: 'HEALTH', due_date: '2026-03-15', duration_minutes: 20 },
  { title: 'First sparring session completed', battlefront: 'HEALTH', due_date: '2026-04-01', duration_minutes: 60 },

  // FAMILY
  { title: 'Create chores checklist (daily/weekly)', battlefront: 'FAMILY', due_date: '2026-01-14', duration_minutes: 15 },
  { title: '30-day streak: chores done + 30min family time daily', battlefront: 'FAMILY', due_date: '2026-02-15', duration_minutes: 20 },

  // MENTAL / SYSTEMS
  { title: 'Create Daily Plan template (max 3 missions/day) + EOD review', battlefront: 'MENTAL', due_date: '2026-01-14', duration_minutes: 20 },
  { title: '30-day streak: daily plan + journal + EOD review', battlefront: 'MENTAL', due_date: '2026-02-15', duration_minutes: 20 },

  // ACADEMICS / SCHOOL
  { title: 'Create session tracker (classes + target 80%+ + next exams)', battlefront: 'ACADEMICS', due_date: '2026-01-18', duration_minutes: 20 },
  { title: 'End of session: 80%+ in all classes', battlefront: 'ACADEMICS', due_date: '2026-04-15', duration_minutes: 60 },

  // NETWORKING
  { title: 'Lieutenant role achieved', battlefront: 'NETWORKING', due_date: '2026-02-28', duration_minutes: 60 },

  // SKILLS
  { title: 'Strategic Thinker role achieved', battlefront: 'SKILLS', due_date: '2026-07-28', duration_minutes: 60 },
];

async function getOrCreateBattlefront(userId: string, battlefrontName: string): Promise<string> {
  const { data: existing, error: fetchError } = await supabase
    .from('battlefronts')
    .select('id')
    .eq('user_id', userId)
    .eq('name', battlefrontName)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching battlefront:', fetchError);
    throw fetchError;
  }

  if (existing) {
    return existing.id;
  }

  const colorMap: { [key: string]: string } = {
    BUSINESS: 'green',
    GOD: 'purple',
    HEALTH: 'red',
    FAMILY: 'blue',
    MENTAL: 'yellow',
    ACADEMICS: 'indigo',
    NETWORKING: 'pink',
    SKILLS: 'orange',
  };

  const { data: newBattlefront, error: createError } = await supabase
    .from('battlefronts')
    .insert({
      user_id: userId,
      name: battlefrontName,
      description: `${battlefrontName} battlefront`,
      color: colorMap[battlefrontName] || 'blue',
      status: 'active',
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Error creating battlefront:', createError);
    throw createError;
  }

  return newBattlefront.id;
}

export async function seedMasterListMissions(userId: string): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  const battlefrontMapping: BattlefrontMapping = {};

  for (const mission of SEED_MISSIONS) {
    const { data: existing, error: checkError } = await supabase
      .from('missions')
      .select('id')
      .eq('user_id', userId)
      .eq('title', mission.title)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking mission:', checkError);
      continue;
    }

    if (existing) {
      skipped++;
      continue;
    }

    if (!battlefrontMapping[mission.battlefront]) {
      try {
        battlefrontMapping[mission.battlefront] = await getOrCreateBattlefront(userId, mission.battlefront);
      } catch (error) {
        console.error(`Failed to get/create battlefront ${mission.battlefront}:`, error);
        continue;
      }
    }

    const { error: insertError } = await supabase
      .from('missions')
      .insert({
        user_id: userId,
        title: mission.title,
        battlefront_id: battlefrontMapping[mission.battlefront],
        due_date: mission.due_date,
        duration_minutes: mission.duration_minutes,
        start_at: null,
        completed_at: null,
        is_recurring: false,
      });

    if (insertError) {
      console.error(`Failed to create mission "${mission.title}":`, insertError);
      skipped++;
    } else {
      created++;
    }
  }

  return { created, skipped };
}
