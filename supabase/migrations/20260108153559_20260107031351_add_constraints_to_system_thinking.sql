/*
  # Add Constraints Section to System Thinking

  1. New Tables
    - `system_thinking_constraints` - Stores constraints for system thinking docs
      - `id` (uuid, primary key)
      - `doc_id` (uuid, foreign key to system_thinking_docs)
      - `user_id` (uuid, foreign key to auth.users)
      - `content` (text)
      - `checked` (boolean, default false)
      - `order_index` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `system_thinking_constraints` table
    - Add policies for authenticated users to manage their own constraints
*/

CREATE TABLE IF NOT EXISTS system_thinking_constraints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES system_thinking_docs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  checked boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_thinking_constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own constraints"
  ON system_thinking_constraints FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own constraints"
  ON system_thinking_constraints FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own constraints"
  ON system_thinking_constraints FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own constraints"
  ON system_thinking_constraints FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_system_thinking_constraints_doc_id ON system_thinking_constraints(doc_id);
CREATE INDEX IF NOT EXISTS idx_system_thinking_constraints_user_id ON system_thinking_constraints(user_id);