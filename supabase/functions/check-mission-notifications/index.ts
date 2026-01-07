import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current time in Toronto timezone
    const now = new Date()

    // Calculate time window: 15-16 minutes from now
    // We check for missions starting in this window to catch the 15-minute mark
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)
    const sixteenMinutesFromNow = new Date(now.getTime() + 16 * 60 * 1000)

    console.log('Checking missions between:', fifteenMinutesFromNow.toISOString(), 'and', sixteenMinutesFromNow.toISOString())

    // Query missions that start in the next 15-16 minutes and are not completed
    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .select(`
        id,
        user_id,
        title,
        start_at,
        battlefront:battlefront_id (
          id,
          name
        )
      `)
      .gte('start_at', fifteenMinutesFromNow.toISOString())
      .lte('start_at', sixteenMinutesFromNow.toISOString())
      .is('completed_at', null)

    if (missionsError) {
      console.error('Error fetching missions:', missionsError)
      throw missionsError
    }

    console.log(`Found ${missions?.length || 0} missions in the time window`)

    if (!missions || missions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No missions found in time window', count: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    let notificationsCreated = 0

    // For each mission, check if notification already exists
    for (const mission of missions) {
      // Check if notification already exists for this mission
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('mission_id', mission.id)
        .eq('type', 'mission_reminder')
        .maybeSingle()

      // If notification doesn't exist, create it
      if (!existingNotification) {
        // Calculate scheduled_for as 15 minutes before start
        const scheduledFor = new Date(new Date(mission.start_at).getTime() - 15 * 60 * 1000)

        const battlefrontName = mission.battlefront?.name
        const message = battlefrontName
          ? `${mission.title} • ${battlefrontName}`
          : mission.title

        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: mission.user_id,
            mission_id: mission.id,
            title: '15 min reminder',
            message: message,
            scheduled_for: scheduledFor.toISOString(),
            type: 'mission_reminder'
          })

        if (insertError) {
          console.error(`Error creating notification for mission ${mission.id}:`, insertError)
        } else {
          console.log(`Created notification for mission: ${mission.title}`)
          notificationsCreated++
        }
      } else {
        console.log(`Notification already exists for mission: ${mission.title}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Mission notifications check complete',
        missionsChecked: missions.length,
        notificationsCreated
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in check-mission-notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
