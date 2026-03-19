# GitHub Secrets Setup Guide

This guide explains how to configure GitHub repository secrets for CI/CD integration.

## Why GitHub Secrets?

GitHub secrets securely store sensitive information like API keys. They are:
- Encrypted at rest
- Masked in logs
- Never exposed in public repositories
- Automatically available to GitHub Actions workflows

## Required Secrets

### For Supabase Integration

**`NEXT_PUBLIC_SUPABASE_URL`**
- Your Supabase project URL
- Format: `https://your-project.supabase.co`
- Get from: Supabase Dashboard → Settings → API → Project URL

**`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
- Your Supabase anonymous key (public, but should still be in secrets)
- Get from: Supabase Dashboard → Settings → API → Anon public key
- Used by frontend to connect to Supabase

### For Vercel Deployment (Optional, but Recommended)

**`VERCEL_TOKEN`**
- Your personal Vercel API token for authentication
- Get from: vercel.com → Account → Settings → Tokens
- Allows GitHub Actions to deploy to Vercel

**`VERCEL_ORG_ID`**
- Your Vercel organization/team ID
- Get from: vercel.com → Project Settings → General → Project ID (copy the first part)
- Usually a 20-character alphanumeric string

**`VERCEL_PROJECT_ID`**
- Your Vercel project ID
- Get from: vercel.com → Project Settings → General → Project ID
- The full project identifier

## Step-by-Step Setup

### 1. Get Your Supabase Credentials

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **API** (left sidebar)
4. You'll see:
   - **Project URL** → Copy this
   - **Anon public key** → Copy this

### 2. Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

### 3. Add Each Secret

**For `NEXT_PUBLIC_SUPABASE_URL`:**
- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Secret: Paste your Supabase Project URL
- Click **Add secret**

**For `NEXT_PUBLIC_SUPABASE_ANON_KEY`:**
- Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Secret: Paste your Supabase Anon public key
- Click **Add secret**

**For `VERCEL_TOKEN` (optional):**
- Name: `VERCEL_TOKEN`
- Secret: Your Vercel personal access token
- Click **Add secret**

**For `VERCEL_ORG_ID` (optional):**
- Name: `VERCEL_ORG_ID`
- Secret: Your Vercel organization ID
- Click **Add secret**

**For `VERCEL_PROJECT_ID` (optional):**
- Name: `VERCEL_PROJECT_ID`
- Secret: Your Vercel project ID
- Click **Add secret**

## Verification

### Check Secrets Are Configured

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. You should see your secrets listed (values hidden)
3. All secrets should show as "Added"

### Test the Workflow

1. Make a small change to your code (e.g., update a comment)
2. Push to GitHub: `git push origin main`
3. Go to GitHub repo → **Actions** tab
4. Watch the workflow run

Workflow will:
- ✅ Validate code (TypeScript, linting)
- ✅ Build the Next.js app
- ✅ Deploy to Vercel (if all checks pass)

### Monitor Workflow Execution

1. Click the workflow run in the **Actions** tab
2. Each job shows status: ✅ passed, ❌ failed, ⏭️ skipped
3. Click any job to see detailed logs

Example workflow steps:
```
✅ Validate Code and Schema
   ├─ Checkout code
   ├─ Setup Node.js
   ├─ Install dependencies
   ├─ Check TypeScript compilation
   ├─ Run linting
   └─ Validate SQL schema files exist

✅ Build Next.js Application
   ├─ Checkout code
   ├─ Setup Node.js
   ├─ Install dependencies
   └─ Build application

✅ Deploy to Vercel (only on main branch)
   └─ Deploy to Vercel

✅ Deployment Status
   └─ Check deployment status
```

## What Happens When Workflow Runs?

### On Pull Requests:
- Code validation only (no deployment)
- Ensures code quality before merge

### On Push to Main:
- Full validation
- Build app
- Deploy to Vercel automatically
- Show deployment status

### On Push to Other Branches:
- Validation only
- Build only
- No deployment

## Troubleshooting

### "Secret not found" error?
- Make sure secret name matches exactly (case-sensitive)
- `NEXT_PUBLIC_SUPABASE_URL` ≠ `next_public_supabase_url`

### "Deployment failed" error?
- Check Vercel token is valid (not expired)
- Verify Vercel project ID is correct
- Check Vercel project settings

### "Build failed" error?
- Check TypeScript compilation: `npm run type-check`
- Check linting: `npm run lint`
- Check environment variables are set in Vercel dashboard

### Secrets not available in workflow?
- Wait 1-2 minutes after adding secret
- Secrets only available to new workflow runs
- Previously running jobs won't see new secrets

## Security Best Practices

1. **Rotate tokens periodically** — Regenerate Vercel/Supabase tokens every 3-6 months
2. **Use environment-specific keys** — Don't use production keys in dev environments
3. **Never commit secrets** — `.gitignore` includes `.env` and `.env.local`
4. **Audit secret access** — GitHub logs who accessed secrets
5. **Limit secret scope** — Only add secrets your workflows actually need

## Next Steps

After setting up GitHub secrets:
1. Push a test commit to verify workflow runs
2. Proceed to **Phase 4: Vercel deployment config**
3. Configure Vercel environment variables (mirrors GitHub secrets)
4. Test end-to-end: GitHub → Vercel → Supabase

## References

- [GitHub Documentation: Using secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Vercel Documentation: Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Documentation: API Keys](https://supabase.com/docs/guides/api#api-keys)
