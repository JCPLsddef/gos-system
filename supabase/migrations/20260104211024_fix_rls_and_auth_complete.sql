/*
  # Complete RLS and Authentication Fix

  ## Summary
  This migration fixes all authentication and RLS issues for the GOS Commander app.
  It ensures that all data operations are properly secured and tied to authenticated users.

  ## Changes

  ### 1. Tables Affected
  - battlefronts (has user_id)
  - missions (has user_id)
  - checkpoints (needs user_id added)
  - calendar_events (has user_id)

  ### 2. Schema Updates
  - Add user_id to checkpoints table (currently missing)

  ### 3. Security Implementation
  - Enable RLS on all tables
  - Create comprehensive policies for authenticated users only
  - Add trigger to auto-set user_id from auth.uid()
  - Block anonymous inserts completely

  ### 4. Policies Created
  For each table:
  - SELECT: Users can only read their own rows
  - INSERT: Users can only insert rows with their own user_id
  - UPDATE: Users can only update their own rows
  - DELETE: Users can only delete their own rows

  ### 5. Triggers
  - set_user_id(): Automatically sets user_id to auth.uid() on INSERT
  - Raises exception if auth.uid() is NULL (prevents anonymous inserts)

  ### 6. Defaults
  - created_at: now()
  - user_id: set by trigger
*/

-- =====================================================
-- STEP 1: Add user_id to checkpoints table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'checkpoints'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE checkpoints ADD COLUMN user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    
    -- Add foreign key constraint
    ALTER TABLE checkpoints ADD CONSTRAINT checkpoints_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Remove the temporary default
    ALTER TABLE checkpoints ALTER COLUMN user_id DROP DEFAULT;
  END IF;
END $$;

-- =====================================================
-- STEP 2: Enable RLS on all tables
-- =====================================================

ALTER TABLE battlefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Drop existing policies if any
-- =====================================================

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own battlefronts" ON battlefronts;
    DROP POLICY IF EXISTS "Users can insert own battlefronts" ON battlefronts;
    DROP POLICY IF EXISTS "Users can update own battlefronts" ON battlefronts;
    DROP POLICY IF EXISTS "Users can delete own battlefronts" ON battlefronts;

    DROP POLICY IF EXISTS "Users can view own missions" ON missions;
    DROP POLICY IF EXISTS "Users can insert own missions" ON missions;
    DROP POLICY IF EXISTS "Users can update own missions" ON missions;
    DROP POLICY IF EXISTS "Users can delete own missions" ON missions;

    DROP POLICY IF EXISTS "Users can view own checkpoints" ON checkpoints;
    DROP POLICY IF EXISTS "Users can insert own checkpoints" ON checkpoints;
    DROP POLICY IF EXISTS "Users can update own checkpoints" ON checkpoints;
    DROP POLICY IF EXISTS "Users can delete own checkpoints" ON checkpoints;

    DROP POLICY IF EXISTS "Users can view own calendar_events" ON calendar_events;
    DROP POLICY IF EXISTS "Users can insert own calendar_events" ON calendar_events;
    DROP POLICY IF EXISTS "Users can update own calendar_events" ON calendar_events;
    DROP POLICY IF EXISTS "Users can delete own calendar_events" ON calendar_events;
END $$;

-- =====================================================
-- STEP 4: Create RLS Policies for BATTLEFRONTS
-- =====================================================

CREATE POLICY "Users can view own battlefronts"
  ON battlefronts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own battlefronts"
  ON battlefronts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own battlefronts"
  ON battlefronts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own battlefronts"
  ON battlefronts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 5: Create RLS Policies for MISSIONS
-- =====================================================

CREATE POLICY "Users can view own missions"
  ON missions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own missions"
  ON missions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own missions"
  ON missions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own missions"
  ON missions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 6: Create RLS Policies for CHECKPOINTS
-- =====================================================

CREATE POLICY "Users can view own checkpoints"
  ON checkpoints
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own checkpoints"
  ON checkpoints
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own checkpoints"
  ON checkpoints
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own checkpoints"
  ON checkpoints
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 7: Create RLS Policies for CALENDAR_EVENTS
-- =====================================================

CREATE POLICY "Users can view own calendar_events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar_events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar_events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar_events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 8: Create trigger function to auto-set user_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is not provided, try to set it from auth.uid()
  IF NEW.user_id IS NULL THEN
    -- Check if auth.uid() exists (user is authenticated)
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required: Cannot insert row without authenticated user';
    END IF;
    
    -- Set user_id to the authenticated user's ID
    NEW.user_id = auth.uid();
  END IF;

  -- Verify that the provided/set user_id matches auth.uid()
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Authorization error: user_id must match authenticated user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 9: Drop existing triggers if any
-- =====================================================

DROP TRIGGER IF EXISTS set_user_id_battlefronts ON battlefronts;
DROP TRIGGER IF EXISTS set_user_id_missions ON missions;
DROP TRIGGER IF EXISTS set_user_id_checkpoints ON checkpoints;
DROP TRIGGER IF EXISTS set_user_id_calendar_events ON calendar_events;

-- =====================================================
-- STEP 10: Attach triggers to all tables
-- =====================================================

CREATE TRIGGER set_user_id_battlefronts
  BEFORE INSERT ON battlefronts
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_missions
  BEFORE INSERT ON missions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_checkpoints
  BEFORE INSERT ON checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_calendar_events
  BEFORE INSERT ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();