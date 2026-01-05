# Quick Start Guide

## For Local Development

```bash
npm install
npm run dev
```

Visit: `http://localhost:3000`

## For Netlify Deployment

### Critical Step: Set Environment Variables in Netlify

Go to Netlify Dashboard → Site Settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://jbtmetemmdylfroewpcs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidG1ldGVtbWR5bGZyb2V3cGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MTUyODcsImV4cCI6MjA4MzA5MTI4N30.-Cde7tQ_q1Udu1eEluepmpT_tfvojytIZCFwOh2EJjg
```

### Build Settings (Auto-detected)

- Build command: `npm run build`
- Publish directory: `.next`

### After First Deploy

1. **Wait 10-15 minutes** for SSL certificate to provision
2. Update Supabase redirect URLs with your Netlify URL
3. Test authentication and functionality

## Troubleshooting SSL Errors

If you see SSL/security errors:
- Wait for SSL certificate (10-15 minutes after first deploy)
- Clear browser cache
- Verify environment variables are set in Netlify
- Check deploy logs for errors

For detailed instructions, see: `NETLIFY_DEPLOYMENT_GUIDE.md`
