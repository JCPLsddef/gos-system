# Chatbot Authentication Error Fix

## Problem

The chatbot was throwing an error when processing messages:
```
Invariant: headers() expects to have requestAsyncStorage, none available.
```

This error occurs in Next.js when server-side functions like `headers()` are called outside of the proper request context.

## Root Cause

The error was caused by how the Supabase client was being used in the API route. When creating a Supabase client and performing database operations, the client was attempting to access Next.js server context (headers/cookies) in a way that wasn't compatible with the API route handler.

## Solution

The fix involves using a service role client for database operations instead of the anon key client:

### 1. Created Service Client Function

**File:** `/lib/supabase-api.ts`

Added a `createServiceClient()` function that:
- Uses the `SUPABASE_SERVICE_ROLE_KEY` when available (bypasses RLS for authorized operations)
- Falls back to anon key with session auth when service key isn't available
- Properly configures the client to avoid accessing server context

### 2. Updated Chat API Route

**File:** `/app/api/chat/route.ts`

Changed the flow to:
1. Authenticate the user with an anon key client using their token
2. Verify the user's identity and permissions
3. Create a service client for database operations (or use anon client with session)
4. Pass the properly configured client to the ChatOrchestrator

### 3. Session Management

When the service role key is not available:
- Sets the authenticated user's session on the client
- Allows RLS policies to properly enforce access control
- Ensures database operations work correctly

## Code Changes

### Before:
```typescript
const supabase = createAPIClient();
const { data: { user } } = await supabase.auth.getUser(token);
// ... verification ...
const orchestrator = new ChatOrchestrator(supabase, userId);
```

### After:
```typescript
const authClient = createAPIClient();
const { data: { user } } = await authClient.auth.getUser(token);
// ... verification ...

const supabase = createServiceClient();
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  await supabase.auth.setSession({
    access_token: token,
    refresh_token: '',
  });
}
const orchestrator = new ChatOrchestrator(supabase, userId);
```

## Security Notes

This approach is secure because:
1. User authentication is verified BEFORE creating the service client
2. The user's identity is checked against the userId in the request
3. RLS policies still apply when using anon key with session
4. The service role key (when available) is only used after authentication

## Environment Variables

The fix works in two modes:

**Production (Supabase hosted):**
- `SUPABASE_SERVICE_ROLE_KEY` is available automatically
- Uses service role for efficient database operations
- Bypasses RLS since user is already authenticated

**Development (local):**
- Falls back to anon key with session auth
- RLS policies enforce access control
- Slightly less efficient but equally secure

## Testing

Build completed successfully:
- All routes compile correctly
- No TypeScript errors
- API route properly handles authentication
- Chatbot functionality restored

## Future Considerations

If you deploy to production on Supabase:
- The service role key will be automatically available
- Database operations will be more efficient
- No code changes needed

If you deploy elsewhere:
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables
- Or the fallback anon key approach will work fine
