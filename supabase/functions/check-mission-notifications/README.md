# Mission Notification Checker Edge Function

This Edge Function checks for missions that are about to start (in 15-16 minutes) and creates notifications for them in real-time.

## How It Works

1. Runs every minute via cron job (configured in Supabase Dashboard)
2. Queries missions that start in the next 15-16 minutes
3. For each mission found, checks if a notification already exists
4. If no notification exists, creates one with `scheduled_for` = mission start time - 15 minutes
5. The client-side polling picks up these notifications and displays them

## Deployment

1. Deploy the function:
```bash
supabase functions deploy check-mission-notifications
```

2. Set up the cron job in Supabase Dashboard:
   - Go to Database → Cron Jobs (pg_cron extension must be enabled)
   - Create a new cron job:
     - Name: `check-mission-notifications`
     - Schedule: `* * * * *` (every minute)
     - Command:
     ```sql
     SELECT
       net.http_post(
           url:='YOUR_SUPABASE_URL/functions/v1/check-mission-notifications',
           headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
       ) as request_id;
     ```

## Alternative: Using Supabase CLI

You can also invoke the function manually for testing:
```bash
supabase functions invoke check-mission-notifications --no-verify-jwt
```

## Environment Variables Required

- `SUPABASE_URL`: Automatically provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Automatically provided by Supabase

## Monitoring

Check the function logs:
```bash
supabase functions logs check-mission-notifications
```
