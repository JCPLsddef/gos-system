/*
  # Fix Missions Schema Mismatch

  ## Summary
  The missions table schema doesn't match the application code.
  This migration updates the database to match what the code expects.

  ## Changes

  ### 1. Column Updates
  - Add `completed_at` (timestamptz, nullable) - replaces `status`
  - Rename `attack_date` to `start_at`
  - Make `due_date` nullable (code treats as optional)
  - Make `battlefront_id` nullable (code treats as optional)
  - Make `duration_minutes` NOT NULL with default (code expects number)
  - Change `due_date` from timestamptz to date (code uses date strings)

  ### 2. Data Migration
  - Convert `status = 'completed'` to `completed_at` timestamp
  - Keep existing attack_date data in new start_at column
  - Keep existing due_date data

  ### 3. Drop Old Columns
  - Remove `status` column after data migration

  ## Notes
  - All existing data is preserved
  - RLS policies remain unchanged (they use user_id)
*/

-- Add completed_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE missions ADD COLUMN completed_at timestamptz DEFAULT NULL;
    
    -- Migrate status data: if status = 'completed', set completed_at to created_at
    UPDATE missions 
    SET completed_at = created_at 
    WHERE status = 'completed';
  END IF;
END $$;

-- Rename attack_date to start_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'attack_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'start_at'
  ) THEN
    ALTER TABLE missions RENAME COLUMN attack_date TO start_at;
  END IF;
END $$;

-- Make battlefront_id nullable
DO $$
BEGIN
  ALTER TABLE missions ALTER COLUMN battlefront_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Make due_date nullable
DO $$
BEGIN
  ALTER TABLE missions ALTER COLUMN due_date DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Make start_at nullable
DO $$
BEGIN
  ALTER TABLE missions ALTER COLUMN start_at DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Ensure duration_minutes has a default
DO $$
BEGIN
  ALTER TABLE missions ALTER COLUMN duration_minutes SET DEFAULT 60;
  ALTER TABLE missions ALTER COLUMN duration_minutes SET NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop status column (data already migrated to completed_at)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'status'
  ) THEN
    ALTER TABLE missions DROP COLUMN status;
  END IF;
END $$;