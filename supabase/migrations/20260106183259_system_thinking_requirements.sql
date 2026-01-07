/*
  # System Thinking Requirements Table

  ## Overview
  Adds REQUIREMENTS section to System Thinking between PROCESS and OUTPUT.

  ## New Tables

  ### `system_thinking_requirements`
  Requirement items for the REQUIREMENTS section.
  - `id` (uuid, primary key)
  - `doc_id` (uuid, foreign key) - Links to system_thinking_docs
  - `user_id` (uuid, foreign key)
  - `content` (text) - Requirement text
  - `checked` (boolean) - Checkbox state (tracking only)
  - `order_index` (int) - Display order
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access their own requirements
*/

-- Create system_thinking_requirements table
CREATE TABLE IF NOT EXISTS system_thinking_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES system_thinking_docs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  checked boolean DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_thinking_requirements_doc_id ON system_thinking_requirements(doc_id, order_index);

-- Enable RLS
ALTER TABLE system_thinking_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own requirements"
  ON system_thinking_requirements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requirements"
  ON system_thinking_requirements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requirements"
  ON system_thinking_requirements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own requirements"
  ON system_thinking_requirements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
