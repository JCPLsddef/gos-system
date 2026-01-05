# 🔧 Production Fetch Errors - Diagnostic & Fix Guide

## ✅ Fixes Applied

### 1️⃣ Diagnostic API Route Created
**File:** `app/api/where-am-i-calling/route.ts`

Test in production:
```bash
curl https://your-site.vercel.app/api/where-am-i-calling
```

Expected response:
```json
{
  "ok": true,
  "supabaseUrlPresent": true,
  "supabaseHost": "yourproject.supabase.co",
  "anonKeyPresent": true,
  "environment": "production",
  "diagnostics": {
    "message": "Supabase URL is configured"
  }
}
```

If `supabaseUrlPresent: false`, the environment variables are not set in Vercel!

---

### 2️⃣ Manifest.json Created
**File:** `public/manifest.json`

✅ Fixed 404 on `/manifest.json`

**Next step:** Add icon files or temporarily comment out the manifest line:

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: 'GOS Command Center',
  description: 'Strategic life operating system',
  // manifest: '/manifest.json',  // ← Comment out if icons not ready
  themeColor: '#2563eb',
};
```

---

### 3️⃣ Supabase Client Enhanced
**File:** `lib/supabase.ts`

Added DEV-only console logs:
- ✅ Never logs actual secrets
- ✅ Only runs in development mode
- ✅ Shows hostname and key length (safe info)

In development, you'll see:
```
✅ Supabase URL configured: yourproject.supabase.co
✅ Supabase Anon Key configured (length: 123)
```

Or if missing:
```
❌ NEXT_PUBLIC_SUPABASE_URL is missing
❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing
```

---

### 4️⃣ Environment Variables Verified

**Client-side (browser):** ✅ SAFE
- Uses: `NEXT_PUBLIC_SUPABASE_URL`
- Uses: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Server-side (API routes only):** ✅ PROTECTED
- Uses: `SUPABASE_SERVICE_ROLE_KEY`
- Protected by `import 'server-only'`

---

## 🚨 Common Issues & Solutions

### Issue 1: `net::ERR_NAME_NOT_RESOLVED` for Supabase domain

**Cause:** Environment variables not set in Vercel

**Fix:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Make sure to add them for **Production**, **Preview**, and **Development** environments
4. Redeploy the app

---

### Issue 2: `TypeError: Failed to fetch` during login

**Possible causes:**

**A) Environment variables not set**
- Check `/api/where-am-i-calling` endpoint
- If `supabaseUrlPresent: false`, variables are missing

**B) CORS issue**
- Check Supabase Dashboard → Authentication → URL Configuration
- Add your Vercel domain to allowed URLs

**C) Invalid Supabase credentials**
- Verify the URL and keys in Supabase Dashboard → Settings → API
- Make sure you're using the correct project

---

### Issue 3: manifest.json 404

**Status:** ✅ FIXED

- Created `/public/manifest.json`
- Icons referenced but not yet added (non-critical)

**Optional:** Add icon files or comment out manifest in layout.tsx

---

## 📋 Deployment Checklist

### Before Deploy to Vercel:

1. **Set Environment Variables** ✅
   ```bash
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Verify Supabase URL Configuration** ✅
   - Supabase Dashboard → Settings → API → URL Configuration
   - Add your Vercel domain to Site URL and Redirect URLs

3. **Test locally first** ✅
   ```bash
   npm run dev
   # Check console for Supabase config logs
   ```

4. **Deploy to Vercel** ✅
   ```bash
   git push
   ```

5. **Test diagnostic endpoint** ✅
   ```bash
   curl https://your-site.vercel.app/api/where-am-i-calling
   ```

6. **Test login** ✅
   - Open your site
   - Try to login
   - Check browser console for errors

---

## 🔍 Debugging Steps

### Step 1: Check Environment Variables

**In production:**
```bash
curl https://your-site.vercel.app/api/where-am-i-calling
```

Expected:
```json
{
  "supabaseUrlPresent": true,
  "supabaseHost": "yourproject.supabase.co",
  "anonKeyPresent": true
}
```

If false → Go to Vercel settings and add variables

---

### Step 2: Check Supabase Configuration

1. Go to Supabase Dashboard
2. Settings → API
3. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 3: Check CORS Configuration

1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL: `https://your-site.vercel.app`
3. Redirect URLs: Add:
   - `https://your-site.vercel.app/**`
   - `http://localhost:3000/**` (for local dev)

---

### Step 4: Check Browser Console

**Good signs:**
```
✅ Supabase URL configured: yourproject.supabase.co
✅ Supabase Anon Key configured (length: 123)
```

**Bad signs:**
```
❌ NEXT_PUBLIC_SUPABASE_URL is missing
net::ERR_NAME_NOT_RESOLVED
TypeError: Failed to fetch
```

---

## 📝 Files Modified

1. ✅ `app/api/where-am-i-calling/route.ts` - NEW diagnostic endpoint
2. ✅ `public/manifest.json` - NEW manifest file
3. ✅ `lib/supabase.ts` - Added dev-only logging
4. ✅ `.env.example` - Updated with comments

---

## 🧪 Testing

### Test Locally:
```bash
npm run dev
```

Open browser console and look for:
- ✅ Supabase config logs
- ❌ Any error messages

### Test in Production:

1. **Diagnostic endpoint:**
   ```bash
   curl https://your-site.vercel.app/api/where-am-i-calling
   ```

2. **Login flow:**
   - Go to `/login`
   - Enter credentials
   - Check browser Network tab
   - Look for requests to Supabase domain

3. **Check API routes:**
   ```bash
   curl https://your-site.vercel.app/api/actions
   # Expected: {"ok":true,"message":"API actions route reachable"}
   ```

---

## 🚀 Summary

**Issues Fixed:**
- ✅ Added diagnostic API to check env vars
- ✅ Created manifest.json (fixed 404)
- ✅ Enhanced Supabase client with dev logging
- ✅ Verified no client-side use of SERVICE_ROLE_KEY
- ✅ Updated .env.example with clear documentation

**Next Steps:**
1. Deploy to Vercel
2. Set environment variables in Vercel dashboard
3. Test `/api/where-am-i-calling` endpoint
4. Test login functionality
5. Check browser console for any remaining errors

**If still having issues:**
- Check the diagnostic endpoint response
- Verify Supabase dashboard configuration
- Check Vercel deployment logs
- Look at browser Network tab during login

All changes are committed and pushed to GitHub! ✅
