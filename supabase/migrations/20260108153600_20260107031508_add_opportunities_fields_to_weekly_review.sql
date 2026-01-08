/*
  # Add Opportunities Fields to Weekly Review

  1. Changes
    - Add `what_to_improve` column to war_room_weekly_reviews
    - Add `new_opportunities` column to war_room_weekly_reviews
    - Add `missed_opportunities` column to war_room_weekly_reviews
  
  2. Notes
    - All new columns are text type and nullable
    - These fields capture improvement areas and opportunities
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'war_room_weekly_reviews' AND column_name = 'what_to_improve'
  ) THEN
    ALTER TABLE war_room_weekly_reviews ADD COLUMN what_to_improve text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'war_room_weekly_reviews' AND column_name = 'new_opportunities'
  ) THEN
    ALTER TABLE war_room_weekly_reviews ADD COLUMN new_opportunities text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'war_room_weekly_reviews' AND column_name = 'missed_opportunities'
  ) THEN
    ALTER TABLE war_room_weekly_reviews ADD COLUMN missed_opportunities text;
  END IF;
END $$;