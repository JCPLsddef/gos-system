/*
  # Secrets Management Table

  ## Overview
  Creates a secure table for managing environment secrets and API keys.
  This table allows users to store and manage their sensitive configuration
  values securely with proper encryption and access control.

  ## New Tables

  ### `user_secrets`
  Stores encrypted environment secrets per user.
  - `id` (uuid, primary key) - Unique secret identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `key` (text) - Secret key/name (e.g., 'OPENAI_API_KEY')
  - `value` (text) - Secret value (should be encrypted client-side)
  - `description` (text) - Optional description of what this secret is for
  - `is_active` (boolean) - Whether this secret is currently active
  - `created_at` (timestamptz) - When secret was created
  - `updated_at` (timestamptz) - Last update timestamp
  - UNIQUE constraint on (user_id, key) - One key per user

  ## Security
  - Row Level Security (RLS) enabled
  - Users can ONLY access their own secrets
  - No service role bypass - secrets are user-scoped only
  - Indexed for fast lookups by user and key

  ## Important Notes
  1. Values should be encrypted on the client side before storage
  2. This table is for user-managed secrets, not system secrets
  3. Secrets are isolated per user with no cross-user access
*/

-- Create user_secrets table
CREATE TABLE IF NOT EXISTS user_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_secrets_user_id ON user_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_secrets_user_key ON user_secrets(user_id, key) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own secrets
CREATE POLICY "Users can view own secrets"
  ON user_secrets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only create their own secrets
CREATE POLICY "Users can create own secrets"
  ON user_secrets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own secrets
CREATE POLICY "Users can update own secrets"
  ON user_secrets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own secrets
CREATE POLICY "Users can delete own secrets"
  ON user_secrets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to auto-set user_id on insert
CREATE TRIGGER set_user_id_user_secrets
  BEFORE INSERT ON user_secrets
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Trigger to update updated_at timestamp
CREATE TRIGGER set_updated_at_user_secrets
  BEFORE UPDATE ON user_secrets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Add table comment for documentation
COMMENT ON TABLE user_secrets IS 'Stores user-managed environment secrets and API keys with full RLS isolation';