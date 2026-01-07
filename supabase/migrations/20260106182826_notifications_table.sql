/*
  # Notifications Table

  ## Overview
  Creates table for storing in-app notifications for mission reminders.

  ## New Tables

  ### `notifications`
  In-app notification history.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `mission_id` (uuid, foreign key) - Links to missions
  - `title` (text) - Notification title
  - `message` (text) - Notification message
  - `scheduled_for` (timestamptz) - When notification should fire
  - `sent_at` (timestamptz, nullable) - When notification was sent
  - `read_at` (timestamptz, nullable) - When user read notification
  - `type` (text) - Notification type (e.g., 'mission_reminder')
  - `created_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access their own notifications
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  read_at timestamptz,
  type text DEFAULT 'mission_reminder',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_mission_id ON notifications(mission_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE sent_at IS NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
