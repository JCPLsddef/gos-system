/*
  # System Thinking Tables

  ## Overview
  Creates tables for System Thinking module with Input/Process/Output structure.

  ## New Tables

  ### `system_thinking_docs`
  Main document container.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `title` (text) - Document title
  - `input_text` (text) - Main input text area
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `system_thinking_inputs`
  Input bullet items.
  - `id` (uuid, primary key)
  - `doc_id` (uuid, foreign key) - Links to system_thinking_docs
  - `user_id` (uuid, foreign key)
  - `content` (text) - Input item content
  - `order_index` (int) - Display order
  - `created_at` (timestamptz)

  ### `system_thinking_steps`
  Process steps.
  - `id` (uuid, primary key)
  - `doc_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key)
  - `title` (text) - Step title
  - `content` (text) - Step description
  - `order_index` (int) - Display order
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `system_thinking_outputs`
  Output/Results (one per doc).
  - `id` (uuid, primary key)
  - `doc_id` (uuid, unique foreign key)
  - `user_id` (uuid, foreign key)
  - `result` (text) - Result/Decision
  - `actions` (text) - Actions to take
  - `expected_outcome` (text) - Expected outcome/gain
  - `notes_risks` (text) - Notes/Risks
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own data
*/

-- Create system_thinking_docs table
CREATE TABLE IF NOT EXISTS system_thinking_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT 'System Thinking',
  input_text text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create system_thinking_inputs table
CREATE TABLE IF NOT EXISTS system_thinking_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES system_thinking_docs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create system_thinking_steps table
CREATE TABLE IF NOT EXISTS system_thinking_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES system_thinking_docs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT '',
  content text DEFAULT '',
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create system_thinking_outputs table
CREATE TABLE IF NOT EXISTS system_thinking_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid UNIQUE NOT NULL REFERENCES system_thinking_docs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result text DEFAULT '',
  actions text DEFAULT '',
  expected_outcome text DEFAULT '',
  notes_risks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_thinking_docs_user_id ON system_thinking_docs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_thinking_inputs_doc_id ON system_thinking_inputs(doc_id, order_index);
CREATE INDEX IF NOT EXISTS idx_system_thinking_steps_doc_id ON system_thinking_steps(doc_id, order_index);
CREATE INDEX IF NOT EXISTS idx_system_thinking_outputs_doc_id ON system_thinking_outputs(doc_id);

-- Enable RLS
ALTER TABLE system_thinking_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_thinking_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_thinking_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_thinking_outputs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_thinking_docs
CREATE POLICY "Users can view own docs"
  ON system_thinking_docs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own docs"
  ON system_thinking_docs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own docs"
  ON system_thinking_docs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own docs"
  ON system_thinking_docs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for system_thinking_inputs
CREATE POLICY "Users can view own inputs"
  ON system_thinking_inputs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own inputs"
  ON system_thinking_inputs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inputs"
  ON system_thinking_inputs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inputs"
  ON system_thinking_inputs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for system_thinking_steps
CREATE POLICY "Users can view own steps"
  ON system_thinking_steps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own steps"
  ON system_thinking_steps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own steps"
  ON system_thinking_steps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own steps"
  ON system_thinking_steps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for system_thinking_outputs
CREATE POLICY "Users can view own outputs"
  ON system_thinking_outputs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own outputs"
  ON system_thinking_outputs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outputs"
  ON system_thinking_outputs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own outputs"
  ON system_thinking_outputs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);