/*
  # Fix Missions Schema Mismatch (Corrected)

  ## Summary
  Updates missions table to add completed_at field.

  ## Changes

  ### 1. Column Updates
  - Add `completed_at` (timestamptz, nullable) - for tracking completion

  ## Notes
  - All existing data is preserved
  - RLS policies remain unchanged (they use user_id)
*/

-- Add completed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE missions ADD COLUMN completed_at timestamptz DEFAULT NULL;
  END IF;
END $$;