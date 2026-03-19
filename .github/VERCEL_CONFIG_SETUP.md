# Vercel Deployment Configuration Guide

This guide explains how to configure Vercel for automatic deployment with proper environment variables.

## Prerequisites

- Project linked to GitHub (should already be done)
- GitHub secrets configured (Phase 3 completed)
- Supabase credentials ready

## Environment Variables Setup

Your app needs two environment variables to connect to Supabase:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

These should mirror your GitHub secrets but are configured in Vercel Dashboard.

## Step-by-Step Setup

### 1. Open Vercel Project Settings

1. Go to [vercel.com](https://vercel.com)
2. Click on your **Farm Management App** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)

### 2. Add Supabase Credentials

**Environment Variable 1: `NEXT_PUBLIC_SUPABASE_URL`**

1. Click **Add New**
2. Name: `NEXT_PUBLIC_SUPABASE_URL`
3. Value: Paste your Supabase Project URL (e.g., `https://your-project.supabase.co`)
4. Select environments: Check all (Production, Preview, Development)
5. Click **Save**

**Environment Variable 2: `NEXT_PUBLIC_SUPABASE_ANON_KEY`**

1. Click **Add New**
2. Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Value: Paste your Supabase Anon public key (long string starting with `eyJhbGc...`)
4. Select environments: Check all (Production, Preview, Development)
5. Click **Save**

### 3. Trigger Redeploy

After adding environment variables, redeploy your app to use them:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **...** menu → **Redeploy**
4. Wait for deployment to complete

### 4. Verify Environment Variables

Once deployed, verify the variables are available:

1. Click the successful deployment
2. Scroll to **Environment Variables** section
3. You should see both variables listed

## Automatic Deployments

Your app is now set to auto-deploy when you push to GitHub:

**When you do:** `git push origin main`

**What happens:**
1. GitHub Actions workflow triggers
2. Code validation (TypeScript, linting)
3. Build Next.js app
4. Vercel auto-deploys (if build succeeds)
5. App goes live with new changes

**Status:**
- Check Progress: GitHub repo → **Actions** tab
- Check Deployment: Vercel → **Deployments** tab

## Preview Deployments

Every pull request creates a preview deployment:

**When you do:** Create a pull request to main

**What happens:**
1. GitHub Actions runs validation only (no deploy)
2. Vercel creates preview environment
3. You can test changes before merging
4. Each PR gets unique preview URL

## Environment Variable Environments

The `NEXT_PUBLIC_SUPABASE_*` variables should be available in:

- **Production** — Main deployment (vercel app domain)
- **Preview** — PR preview deployments
- **Development** — Local `vercel env pull` (optional)

### Pull Preview Environment Variables (Optional)

For local development with production secrets:

```bash
vercel env pull .env.local
```

This downloads environment variables into `.env.local` for local testing.

⚠️ **Warning:** Never commit `.env.local` to git!

## Connectivity Verification

To verify Supabase is connected after deployment:

1. Open your Vercel deployment URL
2. Open browser DevTools → **Console**
3. Try adding an inventory item
4. Check console for logs like:
   ```
   [API] /api/sync/inventoryItems - Syncing to Supabase
   [API] ✅ Successfully synced to inventory_items
   ```

5. Go to [Supabase Dashboard](https://app.supabase.com)
6. Open **inventory_items** table
7. New items should appear within minutes

## Troubleshooting

### Build fails with "Environment variable not found"?

**Solution:**
1. Verify both `NEXT_PUBLIC_SUPABASE_*` variables are in Vercel Settings
2. Wait 30 seconds after adding before redeploying
3. Click **Redeploy** on the latest failed deployment
4. Check build logs for which variable is missing

### App loads but Supabase connection fails?

**Solution:**
1. Check console errors (browser DevTools)
2. Verify environment variables are accessible:
   - In Vercel logs: `console.log` shows "✅ URL configured: true"
3. Run local verification:
   ```bash
   vercel env pull .env.local
   npm run dev
   ```
4. Try adding item locally to verify it works

### "Sync failed" errors when saving data?

**Solution:**
1. Verify Supabase credentials are correct in Vercel
2. Verify Supabase tables have `sync_status` column (Phase 2)
3. Check Supabase is online: Go to supabase.com Dashboard
4. Try again from browser (clear cache if needed)

### Network timeout?

**Solution:**
1. Check Supabase project is active (not paused)
2. Verify network request shows in DevTools Network tab
3. Wait 1-2 minutes (Vercel may still be deploying)
4. Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Advanced Configuration

### Custom Domain

To use your own domain instead of vercel app domain:

1. Vercel Project → **Settings** → **Domains**
2. Click **Add**
3. Enter your domain name
4. Follow DNS setup instructions

### Environment-Specific Variables

For different databases per environment:

1. When adding variable, uncheck environments you don't want it in
2. E.g., use staging Supabase in Preview only

### Rollback Deployment

To revert to a previous deployment:

1. Go to **Deployments** tab
2. Find previous verified deployment
3. Click **...** menu → **Promote to Production**

## Next Steps

1. ✅ Add environment variables to Vercel Settings
2. ✅ Redeploy to apply changes
3. ✅ Verify Supabase connectivity
4. Proceed to **Phase 5: Code Verification**

## References

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase JavaScript Library](https://supabase.com/docs/reference/javascript/initializing)
