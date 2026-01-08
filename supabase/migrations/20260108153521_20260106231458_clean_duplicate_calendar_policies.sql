/*
  # Clean Up Duplicate Calendar Event RLS Policies
  
  1. Changes
    - Drop all existing calendar_events RLS policies
    - Create clean, non-duplicate policies for all operations
    
  2. Security
    - Maintain same security level
    - Users can only access their own calendar events
    - All operations (SELECT, INSERT, UPDATE, DELETE) properly secured
*/

-- Drop all existing policies for calendar_events
DROP POLICY IF EXISTS "Users can view own calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can insert own calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "Users can insert own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON calendar_events;

-- Create clean policies (one per operation)
CREATE POLICY "calendar_events_select_own"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "calendar_events_insert_own"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_events_update_own"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_events_delete_own"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);