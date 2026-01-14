/*
  # Create Initial Tables and Mission Templates

  1. New Tables
    - `battlefronts` - Strategic areas of focus
    - `missions` - Tasks/activities to complete
    - `checkpoints` - Milestones within missions
    - `calendar_events` - Calendar view of missions
    - `mission_templates` - Reusable mission templates

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users only
    
  3. Features
    - Auto-set user_id from auth.uid()
    - Cascading deletes
    - Timestamp tracking
*/

-- =====================================================
-- STEP 1: Create battlefronts table
-- =====================================================
CREATE TABLE IF NOT EXISTS battlefronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_battlefronts_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- STEP 2: Create missions table
-- =====================================================
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  battlefront_id uuid REFERENCES battlefronts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'pending',
  priority text DEFAULT 'medium',
  start_at timestamptz,
  due_at timestamptz,
  duration_minutes integer DEFAULT 60,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  color text DEFAULT '#3b82f6',
  CONSTRAINT fk_missions_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- STEP 3: Create checkpoints table
-- =====================================================
CREATE TABLE IF NOT EXISTS checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_checkpoints_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- STEP 4: Create calendar_events table
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_calendar_events_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- STEP 5: Create mission_templates table
-- =====================================================
CREATE TABLE IF NOT EXISTS mission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  battlefront_id uuid REFERENCES battlefronts(id) ON DELETE SET NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_mission_templates_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- STEP 6: Create trigger function to auto-set user_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required: Cannot insert row without authenticated user';
    END IF;
    NEW.user_id = auth.uid();
  END IF;

  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Authorization error: user_id must match authenticated user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: Create trigger function to auto-update timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 8: Enable RLS on all tables
-- =====================================================
ALTER TABLE battlefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 9: Create RLS Policies for battlefronts
-- =====================================================
DROP POLICY IF EXISTS "Users can view own battlefronts" ON battlefronts;
DROP POLICY IF EXISTS "Users can insert own battlefronts" ON battlefronts;
DROP POLICY IF EXISTS "Users can update own battlefronts" ON battlefronts;
DROP POLICY IF EXISTS "Users can delete own battlefronts" ON battlefronts;

CREATE POLICY "Users can view own battlefronts"
  ON battlefronts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own battlefronts"
  ON battlefronts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own battlefronts"
  ON battlefronts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own battlefronts"
  ON battlefronts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 10: Create RLS Policies for missions
-- =====================================================
DROP POLICY IF EXISTS "Users can view own missions" ON missions;
DROP POLICY IF EXISTS "Users can insert own missions" ON missions;
DROP POLICY IF EXISTS "Users can update own missions" ON missions;
DROP POLICY IF EXISTS "Users can delete own missions" ON missions;

CREATE POLICY "Users can view own missions"
  ON missions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own missions"
  ON missions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own missions"
  ON missions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own missions"
  ON missions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 11: Create RLS Policies for checkpoints
-- =====================================================
DROP POLICY IF EXISTS "Users can view own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can insert own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can update own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can delete own checkpoints" ON checkpoints;

CREATE POLICY "Users can view own checkpoints"
  ON checkpoints FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own checkpoints"
  ON checkpoints FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own checkpoints"
  ON checkpoints FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own checkpoints"
  ON checkpoints FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 12: Create RLS Policies for calendar_events
-- =====================================================
DROP POLICY IF EXISTS "Users can view own calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "Users can insert own calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar_events" ON calendar_events;

CREATE POLICY "Users can view own calendar_events"
  ON calendar_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar_events"
  ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar_events"
  ON calendar_events FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar_events"
  ON calendar_events FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 13: Create RLS Policies for mission_templates
-- =====================================================
DROP POLICY IF EXISTS "Users can view own mission templates" ON mission_templates;
DROP POLICY IF EXISTS "Users can insert own mission templates" ON mission_templates;
DROP POLICY IF EXISTS "Users can update own mission templates" ON mission_templates;
DROP POLICY IF EXISTS "Users can delete own mission templates" ON mission_templates;

CREATE POLICY "Users can view own mission templates"
  ON mission_templates FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mission templates"
  ON mission_templates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own mission templates"
  ON mission_templates FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own mission templates"
  ON mission_templates FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 14: Create triggers for all tables
-- =====================================================
DROP TRIGGER IF EXISTS set_user_id_battlefronts ON battlefronts;
DROP TRIGGER IF EXISTS set_user_id_missions ON missions;
DROP TRIGGER IF EXISTS set_user_id_checkpoints ON checkpoints;
DROP TRIGGER IF EXISTS set_user_id_calendar_events ON calendar_events;
DROP TRIGGER IF EXISTS set_user_id_mission_templates ON mission_templates;
DROP TRIGGER IF EXISTS update_mission_templates_updated_at ON mission_templates;

CREATE TRIGGER set_user_id_battlefronts
  BEFORE INSERT ON battlefronts
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_missions
  BEFORE INSERT ON missions
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_checkpoints
  BEFORE INSERT ON checkpoints
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_calendar_events
  BEFORE INSERT ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_mission_templates
  BEFORE INSERT ON mission_templates
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER update_mission_templates_updated_at
  BEFORE UPDATE ON mission_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();