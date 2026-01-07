# Deployment Guide for dofa.uno

This guide provides step-by-step instructions for deploying the dofa.uno application to production.

## Architecture Overview

- **Frontend**: React + Vite + Tailwind CSS → Deployed on **Vercel**
- **Backend**: Python FastAPI + SQLite → Deployed on **Railway**

---

## Prerequisites

Before you begin, ensure you have:

1. A [Railway](https://railway.app) account
2. A [Vercel](https://vercel.com) account
3. An [OpenAI API key](https://platform.openai.com/api-keys)
4. Git repository with your code pushed to GitHub/GitLab/Bitbucket

---

## Part 1: Deploy Backend to Railway

### Step 1: Create a New Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `dofa.uno` repository
5. Railway will automatically detect the backend configuration

### Step 2: Configure Environment Variables

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add the following environment variables:

```
OPENAI_API_KEY=your_openai_api_key_here
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

**Important**: Replace `your-frontend-domain.vercel.app` with your actual Vercel domain (you'll get this in Part 2).

### Step 3: Configure Build Settings

Railway should automatically detect the configuration from [`backend/railway.json`](backend/railway.json), but verify:

- **Root Directory**: Leave empty (Railway will use the repo root)
- **Build Command**: Auto-detected by Nixpacks
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 4: Deploy

1. Railway will automatically deploy your backend
2. Wait for the deployment to complete (usually 2-3 minutes)
3. Once deployed, copy your **Railway backend URL** (e.g., `https://your-app.railway.app`)
4. Test the backend by visiting: `https://your-app.railway.app/health`

### Step 5: Database Persistence (Important!)

Railway uses ephemeral storage by default. For SQLite persistence:

1. In Railway dashboard, go to your service
2. Click **"Settings"** → **"Volumes"**
3. Add a volume:
   - **Mount Path**: `/app/backend`
   - **Size**: 1GB (or as needed)

This ensures your SQLite database persists across deployments.

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create a New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your `dofa.uno` repository
4. Vercel will automatically detect it as a Vite project

### Step 2: Configure Build Settings

Vercel should automatically use the configuration from [`vercel.json`](vercel.json), but verify:

- **Framework Preset**: Vite
- **Root Directory**: Leave empty (Vercel will use the repo root)
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `cd frontend && npm install`

### Step 3: Configure Environment Variables

In your Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add the following variable:

```
VITE_API_URL=https://your-backend-url.railway.app
```

**Important**: Replace `your-backend-url.railway.app` with your actual Railway backend URL from Part 1, Step 4.

### Step 4: Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy your frontend (usually 1-2 minutes)
3. Once deployed, you'll get your production URL (e.g., `https://your-app.vercel.app`)

### Step 5: Update Backend CORS

Now that you have your Vercel URL, update the Railway backend:

1. Go back to your **Railway project**
2. Update the `ALLOWED_ORIGINS` environment variable:

```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
```

**Note**: The wildcard pattern `your-app-*.vercel.app` allows preview deployments to work.

3. Railway will automatically redeploy with the new settings

---

## Part 3: Verify Deployment

### Test Backend

1. Visit: `https://your-backend-url.railway.app/health`
2. You should see:
   ```json
   {
     "status": "healthy",
     "openai_configured": true
   }
   ```

### Test Frontend

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try the brain dump feature:
   - Enter some tasks in the text area
   - Click "Parse Brain Dump"
   - Verify tasks are created and displayed
3. Complete a task and verify XP/achievements work

### Test Integration

1. Open browser DevTools (F12) → Network tab
2. Perform actions in the frontend
3. Verify API calls are going to your Railway backend URL
4. Check for any CORS errors (there should be none)

---

## Part 4: Custom Domain (Optional)

### For Vercel (Frontend)

1. Go to **Settings** → **Domains**
2. Add your custom domain (e.g., `dofa.uno`)
3. Follow Vercel's DNS configuration instructions
4. Update Railway's `ALLOWED_ORIGINS` to include your custom domain

### For Railway (Backend)

1. Go to **Settings** → **Domains**
2. Add a custom domain for your API (e.g., `api.dofa.uno`)
3. Follow Railway's DNS configuration instructions
4. Update Vercel's `VITE_API_URL` environment variable

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-...` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins | `https://dofa.vercel.app,https://dofa-*.vercel.app` |
| `PORT` | Port to run the server (auto-set by Railway) | `8000` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-app.railway.app` |

---

## Troubleshooting

### CORS Errors

**Problem**: Frontend shows CORS errors in console

**Solution**:
1. Verify `ALLOWED_ORIGINS` in Railway includes your Vercel domain
2. Ensure the domain includes the protocol (`https://`)
3. Check for trailing slashes (should not have them)
4. Redeploy Railway after changing environment variables

### API Connection Failed

**Problem**: Frontend can't connect to backend

**Solution**:
1. Verify `VITE_API_URL` in Vercel is correct
2. Test backend health endpoint directly: `https://your-backend.railway.app/health`
3. Check Railway logs for errors
4. Ensure Railway service is running

### OpenAI API Errors

**Problem**: Task parsing fails

**Solution**:
1. Verify `OPENAI_API_KEY` is set correctly in Railway
2. Check OpenAI API key has sufficient credits
3. Review Railway logs for specific error messages

### Database Not Persisting

**Problem**: Data is lost after Railway redeploys

**Solution**:
1. Ensure you've added a Volume in Railway (see Part 1, Step 5)
2. Verify the mount path is correct: `/app/backend`
3. Check Railway logs for database write errors

### Build Failures

**Backend (Railway)**:
- Check `requirements.txt` is up to date
- Verify Python version in `runtime.txt` is supported
- Review Railway build logs

**Frontend (Vercel)**:
- Ensure `package.json` dependencies are correct
- Check for TypeScript/ESLint errors
- Review Vercel build logs

---

## Monitoring and Maintenance

### Railway

- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: Monitor CPU, memory, and network usage
- **Alerts**: Set up alerts for downtime or errors

### Vercel

- **Analytics**: Enable Vercel Analytics for usage insights
- **Logs**: View deployment and function logs
- **Performance**: Monitor Core Web Vitals

---

## Updating Your Deployment

### Backend Updates

1. Push changes to your Git repository
2. Railway will automatically detect and redeploy
3. Monitor deployment logs for any errors

### Frontend Updates

1. Push changes to your Git repository
2. Vercel will automatically detect and redeploy
3. Preview deployments are created for pull requests

### Environment Variable Updates

**Railway**:
1. Update variables in Railway dashboard
2. Service will automatically restart

**Vercel**:
1. Update variables in Vercel dashboard
2. Trigger a new deployment (or wait for next push)

---

## Security Best Practices

1. **Never commit API keys** to your repository
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS** (automatic on Railway and Vercel)
4. **Restrict CORS origins** to only your frontend domains
5. **Regularly update dependencies** for security patches
6. **Monitor logs** for suspicious activity
7. **Set up rate limiting** if needed (consider Railway's built-in features)

---

## Cost Estimates

### Railway (Backend)

- **Free Tier**: $5 credit/month (sufficient for small projects)
- **Hobby Plan**: $5/month for additional resources
- **Pro Plan**: $20/month for production apps

### Vercel (Frontend)

- **Hobby Plan**: Free (perfect for personal projects)
- **Pro Plan**: $20/month (for commercial use)

### OpenAI API

- **GPT-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Estimated cost: $1-5/month for moderate usage

---

## Support and Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Vite Docs**: https://vitejs.dev

---

## Quick Reference Commands

### Local Development

```bash
# Backend
cd backend
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run dev
```

### Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your OpenAI API key

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your backend URL
```

---

## Checklist

Use this checklist to ensure successful deployment:

### Backend (Railway)
- [ ] Repository connected to Railway
- [ ] `OPENAI_API_KEY` environment variable set
- [ ] `ALLOWED_ORIGINS` environment variable set
- [ ] Volume added for database persistence
- [ ] Health endpoint returns `{"status": "healthy"}`
- [ ] Backend URL copied for frontend configuration

### Frontend (Vercel)
- [ ] Repository connected to Vercel
- [ ] `VITE_API_URL` environment variable set
- [ ] Build completes successfully
- [ ] Frontend loads without errors
- [ ] API calls work correctly
- [ ] No CORS errors in console

### Integration
- [ ] Tasks can be parsed from brain dump
- [ ] Tasks can be completed
- [ ] XP and achievements work
- [ ] Backlog displays completed tasks
- [ ] Stats page shows correct data

---

**Congratulations!** 🎉 Your dofa.uno app is now live in production!
