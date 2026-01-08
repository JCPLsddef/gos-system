# Apply User Settings Migration

The Grand Strategy save feature requires a `user_settings` table that doesn't exist yet.

## Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to: **SQL Editor**
3. Create a new query
4. Copy and paste the contents of: `supabase/migrations/20260107140000_create_user_settings_table.sql`
5. Click **Run**

## Option 2: Apply via Supabase CLI

```bash
# If you have a linked Supabase project
cd "/Users/jcpl/Downloads/GOS SYSTEM"
supabase db push

# Or apply the migration directly
supabase db reset
```

## Option 3: Run SQL Directly

If you prefer, you can also run this SQL directly in your Supabase SQL Editor:

```sql
-- See the full SQL in: supabase/migrations/20260107140000_create_user_settings_table.sql
```

## After Migration

Once applied, the Grand Strategy page will be able to save your strategy successfully!

The migration creates:
- `user_settings` table with `grand_strategy` field
- Row Level Security policies
- Auto user_id triggers
- Proper indexes for performance
