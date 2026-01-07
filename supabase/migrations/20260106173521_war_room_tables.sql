/*
  # War Room Tables

  ## Overview
  Creates tables for War Room functionality including Code of Honor,
  Non-Negotiables, Disqualifiers, and Weekly Reviews.

  ## New Tables

  ### `war_room_rules`
  Code of Honor rules and principles.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `title` (text) - Rule title
  - `description` (text, nullable) - Optional description
  - `order_index` (int) - Display order
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `war_room_nonnegotiables`
  Daily commitments and habits.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `title` (text) - Commitment title
  - `order_index` (int) - Display order
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `war_room_nonnegotiable_checks`
  Daily completion tracking.
  - `id` (uuid, primary key)
  - `nonnegotiable_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key)
  - `check_date` (date) - Date of completion
  - `completed` (boolean) - Completion status
  - `created_at` (timestamptz)

  ### `war_room_disqualifiers`
  Behaviors that instantly fail the day.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `title` (text) - Disqualifier title
  - `description` (text, nullable) - Optional description
  - `order_index` (int) - Display order
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `war_room_weekly_reviews`
  Weekly review entries.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `week_start` (date) - Monday of week
  - `week_end` (date) - Sunday of week
  - `what_worked` (text) - What went well
  - `what_failed` (text) - What didn't work
  - `fix_action` (text) - Corrective action
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own data
*/

-- Create war_room_rules table
CREATE TABLE IF NOT EXISTS war_room_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create war_room_nonnegotiables table
CREATE TABLE IF NOT EXISTS war_room_nonnegotiables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create war_room_nonnegotiable_checks table
CREATE TABLE IF NOT EXISTS war_room_nonnegotiable_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonnegotiable_id uuid NOT NULL REFERENCES war_room_nonnegotiables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_date date NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(nonnegotiable_id, check_date)
);

-- Create war_room_disqualifiers table
CREATE TABLE IF NOT EXISTS war_room_disqualifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create war_room_weekly_reviews table
CREATE TABLE IF NOT EXISTS war_room_weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  what_worked text DEFAULT '',
  what_failed text DEFAULT '',
  fix_action text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_war_room_rules_user_id ON war_room_rules(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_war_room_nonnegotiables_user_id ON war_room_nonnegotiables(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_war_room_nonnegotiable_checks_user_date ON war_room_nonnegotiable_checks(user_id, check_date);
CREATE INDEX IF NOT EXISTS idx_war_room_disqualifiers_user_id ON war_room_disqualifiers(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_war_room_weekly_reviews_user_week ON war_room_weekly_reviews(user_id, week_start DESC);

-- Enable RLS
ALTER TABLE war_room_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_room_nonnegotiables ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_room_nonnegotiable_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_room_disqualifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_room_weekly_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for war_room_rules
CREATE POLICY "Users can view own rules"
  ON war_room_rules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rules"
  ON war_room_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
  ON war_room_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
  ON war_room_rules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for war_room_nonnegotiables
CREATE POLICY "Users can view own nonnegotiables"
  ON war_room_nonnegotiables FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own nonnegotiables"
  ON war_room_nonnegotiables FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nonnegotiables"
  ON war_room_nonnegotiables FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own nonnegotiables"
  ON war_room_nonnegotiables FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for war_room_nonnegotiable_checks
CREATE POLICY "Users can view own checks"
  ON war_room_nonnegotiable_checks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own checks"
  ON war_room_nonnegotiable_checks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checks"
  ON war_room_nonnegotiable_checks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own checks"
  ON war_room_nonnegotiable_checks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for war_room_disqualifiers
CREATE POLICY "Users can view own disqualifiers"
  ON war_room_disqualifiers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own disqualifiers"
  ON war_room_disqualifiers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own disqualifiers"
  ON war_room_disqualifiers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own disqualifiers"
  ON war_room_disqualifiers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for war_room_weekly_reviews
CREATE POLICY "Users can view own reviews"
  ON war_room_weekly_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reviews"
  ON war_room_weekly_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON war_room_weekly_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON war_room_weekly_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
