# 🔍 LOGIN/SIGNUP DEBUG GUIDE

## Diagnostic Steps to Run RIGHT NOW

### Step 1: Check Console Logs in Browser

Open your browser DevTools (F12) and check for:

**Expected in console (good signs):**
```
✅ Supabase URL configured: yourproject.supabase.co
✅ Supabase Anon Key configured (length: 200+)
```

**Bad signs (fix immediately):**
```
❌ NEXT_PUBLIC_SUPABASE_URL is missing
❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing
net::ERR_NAME_NOT_RESOLVED
TypeError: Failed to fetch
```

---

### Step 2: Test API Diagnostic Route

**Local:**
```bash
curl http://localhost:3000/api/where-am-i-calling
```

**Expected response:**
```json
{
  "ok": true,
  "supabaseUrlPresent": true,
  "supabaseHost": "yourproject.supabase.co",
  "anonKeyPresent": true,
  "environment": "development"
}
```

**If `supabaseUrlPresent: false`:**
- Your `.env` file is not being loaded
- Restart dev server: `npm run dev`

---

### Step 3: Check Network Tab

1. Open DevTools → Network tab
2. Try to login
3. Look for requests to Supabase

**What to check:**
- Is there a request to `https://yourproject.supabase.co/auth/v1/token?grant_type=password`?
- What's the status code? (200 = good, 400 = bad credentials, 0 = network error)
- Any CORS errors?

---

### Step 4: Common Login Issues

#### Issue A: "Invalid login credentials"
**Symptoms:** Login form shows error message
**Cause:** Wrong email/password
**Fix:** 
1. Go to Supabase Dashboard → Authentication → Users
2. Check if user exists
3. Try password reset
4. Or create new account first

#### Issue B: "Failed to fetch"
**Symptoms:** Network error in console
**Causes:**
1. Environment variables not set
2. Supabase URL is wrong
3. Network/CORS issue

**Fix:**
```bash
# Check env vars
cat .env | grep NEXT_PUBLIC

# Should show:
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

#### Issue C: CORS Error
**Symptoms:** "Access-Control-Allow-Origin" error
**Fix:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Add to allowed URLs:
   - `http://localhost:3000`
   - `https://your-production-domain.com`

#### Issue D: "Invalid API key"
**Symptoms:** 401 Unauthorized
**Fix:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the **anon/public** key (NOT service_role!)
3. Update `.env`:
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
4. Restart dev server

---

### Step 5: Test Supabase Connection Directly

Create a test file: `test-supabase.ts`

```typescript
import { supabase } from './lib/supabase';

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Test 1: Check if client exists
  console.log('Client exists:', !!supabase);
  
  // Test 2: Try to get session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  console.log('Session:', sessionData, sessionError);
  
  // Test 3: Try to sign in with test credentials
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  });
  
  console.log('Login result:', data, error);
}

testConnection();
```

Run it:
```bash
npx tsx test-supabase.ts
```

---

### Step 6: Check Supabase Dashboard

1. **Go to:** https://app.supabase.com
2. **Select your project**
3. **Check:**
   - ✅ Project is active (not paused)
   - ✅ Authentication is enabled
   - ✅ Email auth is enabled (Settings → Authentication → Providers)
   - ✅ No RLS policies blocking user creation

---

### Step 7: Enable Debug Logging

Add this to `lib/auth-context.tsx`:

```typescript
const signIn = async (email: string, password: string) => {
  console.log('🔐 Attempting login for:', email);
  
  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log('📊 Login response:', { data, error });

  if (error) {
    console.error('❌ Login failed:', error.message);
  } else {
    console.log('✅ Login successful, user:', data.user?.id);
  }

  if (!error) {
    router.push('/dashboard');
  }

  return { error };
};
```

---

## Quick Fixes Checklist

### Fix 1: Restart Everything
```bash
# Kill dev server
# Ctrl+C

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Fix 2: Verify Environment Variables
```bash
# Check if vars are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# If empty, source the .env file
source .env
npm run dev
```

### Fix 3: Recreate .env File
```bash
# Backup old one
cp .env .env.backup

# Create fresh .env from example
cp .env.example .env

# Edit with correct values from Supabase Dashboard
nano .env
```

### Fix 4: Check Supabase Project Status
1. Go to Supabase Dashboard
2. Check if project shows "Paused" or "Inactive"
3. If paused, restart it
4. Wait 2-3 minutes for it to come online

---

## Error Messages & Solutions

### "supabase is not defined"
**Fix:** Import issue
```typescript
import { supabase } from '@/lib/supabase';
```

### "Cannot read property 'auth' of undefined"
**Fix:** Supabase client failed to initialize
- Check env vars
- Check for syntax errors in `lib/supabase.ts`

### "Invalid JWT"
**Fix:** Token expired or malformed
- Clear browser localStorage
- Try logging in again

### "Email not confirmed"
**Fix:** 
- Check email for confirmation link
- Or disable email confirmation in Supabase Dashboard

---

## What to Send Me

If still not working, send me:

1. **Console output** (copy from browser DevTools)
2. **Network tab** (screenshot of failed requests)
3. **Result from:**
   ```bash
   curl http://localhost:3000/api/where-am-i-calling
   ```
4. **Any error messages** from the login form

---

## Production-Specific Issues

If login works locally but NOT in production:

1. **Environment variables not set in Vercel/Netlify**
   - Go to Dashboard → Settings → Environment Variables
   - Add all NEXT_PUBLIC_* vars
   - Redeploy

2. **CORS not configured for production domain**
   - Supabase Dashboard → Authentication → URL Configuration
   - Add production URL

3. **Middleware blocking requests**
   - Already fixed with strict matcher
   - Redeploy to apply changes

---

## Next Steps

1. ✅ Run Step 1-3 above
2. ✅ Send me the results
3. ✅ I'll identify the exact issue
4. ✅ We'll fix it together

The diagnostic route `/api/where-am-i-calling` will tell us EXACTLY what's wrong!
