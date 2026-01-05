# Netlify Deployment Guide

## Step-by-Step Instructions to Deploy Your Next.js App

### 1. Push Your Code to GitHub

Make sure all your code is committed and pushed to a GitHub repository.

### 2. Connect to Netlify

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **GitHub** and authorize Netlify
4. Choose your repository

### 3. Configure Build Settings

Netlify should auto-detect Next.js. Verify these settings:

- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** 18 or higher

### 4. Set Environment Variables (CRITICAL)

**This is the most important step to avoid SSL/security errors!**

In Netlify dashboard:
1. Go to **Site settings** → **Environment variables**
2. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://jbtmetemmdylfroewpcs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidG1ldGVtbWR5bGZyb2V3cGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MTUyODcsImV4cCI6MjA4MzA5MTI4N30.-Cde7tQ_q1Udu1eEluepmpT_tfvojytIZCFwOh2EJjg
```

**Important:** Make sure these are set for **all contexts** (Production, Deploy Previews, and Branch deploys)

### 5. Deploy

Click **"Deploy site"** and wait for the build to complete.

### 6. Configure Custom Domain (Optional but Recommended)

1. Go to **Site settings** → **Domain management**
2. Add your custom domain or use the provided `.netlify.app` subdomain
3. Netlify automatically provisions SSL certificate

### 7. Update Supabase Settings

In your Supabase dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Add your Netlify URL to **Site URL**
3. Add to **Redirect URLs**:
   - `https://your-site.netlify.app/`
   - `https://your-site.netlify.app/dashboard`
   - `https://your-site.netlify.app/**` (wildcard)

## Troubleshooting SSL/Security Errors

If you're getting SSL or security errors:

### Issue: "Your connection is not private" or SSL errors

**Solution:**
1. Wait 10-15 minutes after first deployment for SSL certificate to provision
2. Clear browser cache and try again
3. Try accessing in incognito/private mode
4. Check Netlify dashboard for deployment errors

### Issue: "Failed to fetch" or CORS errors

**Solution:**
1. Verify environment variables are set in Netlify (Step 4)
2. Make sure Supabase URL is HTTPS
3. Check Supabase dashboard → API settings
4. Verify your Netlify URL is in Supabase redirect URLs

### Issue: Authentication not working

**Solution:**
1. Update Supabase redirect URLs (Step 7)
2. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
3. Check browser console for specific errors

### Issue: Page shows "This site can't be reached"

**Solution:**
1. Check Netlify build logs for errors
2. Verify build completed successfully
3. Check if environment variables are set
4. Try triggering a new deploy

## Verify Deployment

After deployment:
1. Visit your site URL
2. Check browser console (F12) for errors
3. Test authentication (login/signup)
4. Navigate through different pages
5. Verify data loads from Supabase

## Continuous Deployment

Netlify will automatically redeploy when you:
- Push to your main/master branch
- Merge a pull request
- Manually trigger a deploy

## Performance Tips

1. **Enable Netlify CDN** - Automatically enabled
2. **Image optimization** - Already configured in `next.config.js`
3. **Analytics** - Enable in Netlify dashboard
4. **Form handling** - Use Netlify Forms if needed

## Need Help?

- Check Netlify build logs: Site → Deploys → Click on deploy → View logs
- Check browser console for client-side errors
- Verify all environment variables are set correctly
- Ensure Supabase is configured with your Netlify URL

## Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Site connected to Netlify
- [ ] Environment variables set in Netlify
- [ ] Build completed successfully
- [ ] SSL certificate provisioned (wait 10-15 minutes)
- [ ] Supabase redirect URLs updated
- [ ] Site accessible via HTTPS
- [ ] Authentication working
- [ ] No console errors

---

**Your Netlify URL structure:**
- Production: `https://your-site-name.netlify.app`
- Deploy Previews: `https://deploy-preview-{pr-number}--your-site-name.netlify.app`
- Branch deploys: `https://{branch-name}--your-site-name.netlify.app`
