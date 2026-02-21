# One-Click Deployment Checklist

Your project is **production-ready**. Follow this checklist to deploy to Render + Vercel.

## Pre-Deployment (Local Setup)

- [ ] Clone repo and install dependencies
  ```bash
  git clone https://github.com/shreyansjaindev/ctiportal.git
  cd ctiportal
  ```

## 1. Deploy Backend (Render) — ~5 minutes

1. **Sign up/log in to [Render](https://render.com)**

2. **Click "New +" → "Blueprint"**

3. **Connect GitHub repo**
   - Select `shreyansjaindev/ctiportal`

4. **Render auto-detects `render.yaml`** and shows:
   - `ctiportal-backend` (Web Service)
   - `ctiportal-postgres` (PostgreSQL database)
   - Note: Frontend is deployed separately to Vercel (see Step 2)

5. **Set required environment variables** (in Render UI):
   - `CORS_ALLOWED_ORIGINS` = `https://ctiportal-frontend.vercel.app` (or your Vercel domain)
   - `CSRF_TRUSTED_ORIGINS` = `https://ctiportal-frontend.vercel.app`
   - (Optional) Add API keys if using integrations (Virustotal, Screenshotmachine, etc.)

6. **Click "Deploy"** — Render builds and starts services

7. **Wait for deployment** (~2-3 minutes)
   - Backend will be live at `https://ctiportal-backend-xxxxx.onrender.com`
   - Copy this URL for step 2

## 2. Deploy Frontend (Vercel) — ~5 minutes

1. **Sign up/log in to [Vercel](https://vercel.com)**

2. **Click "Add New..." → "Project"**

3. **Select GitHub repo** → `shreyansjaindev/ctiportal`

4. **Configure build settings:**
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

5. **Add environment variable:**
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://ctiportal-backend-xxxxx.onrender.com/api/v1`
   - (Replace `ctiportal-backend-xxxxx` with your actual Render backend domain)

6. **Click "Deploy"**

7. **Wait for deployment** (~1-2 minutes)
   - Frontend will be live at `https://ctiportal-frontend.vercel.app` (or custom domain)

## 3. Verify Deployment — ~2 minutes

1. **Open frontend URL** (Vercel)
   - You should see the CTI Portal login page

2. **Try to log in**
   - If CORS error: Double-check `CORS_ALLOWED_ORIGINS` in Render (must include `https://` and exact domain)

3. **Run one feature test**
   - Domain Monitoring → Lookalike Domains (to verify backend API works)

4. **Check API docs** (optional)
   - Visit `https://ctiportal-backend-xxxxx.onrender.com/api/docs/`

## Post-Deployment

### If CORS fails after deployment:
1. Go to Render dashboard
2. Select `ctiportal-backend` service
3. Edit environment variables
4. Verify `CORS_ALLOWED_ORIGINS` is:
   - Exact domain with `https://` (no trailing slash)
   - Example: `https://ctiportal-frontend.vercel.app`
5. Redeploy service

### To add API keys later:
1. Render → `ctiportal-backend` → Environment
2. Add/edit any API key variable (VIRUSTOTAL, SCREENSHOTMACHINE, etc.)
3. Click "Save"
4. Service auto-redeploys

### To update code:
1. Push git commit to `main` branch
2. Render and Vercel auto-deploy on push

## Key Files Reference

- **Deployment automation**: [`render.yaml`](render.yaml) (Render blueprint)
- **Frontend routing**: [`frontend/vercel.json`](frontend/vercel.json) (SPA fallback)
- **Environment guide**: [`ENV_SETUP.md`](ENV_SETUP.md) (dev/docker/production setups)
- **Full deployment docs**: [`DEPLOYMENT.md`](DEPLOYMENT.md)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "CORS error" on frontend | Update `CORS_ALLOWED_ORIGINS` in Render env with exact Vercel domain |
| "API unreachable" | Verify `VITE_API_BASE_URL` in Vercel uses correct Render domain |
| "Database connection failed" | Wait 30s for Postgres to start; auto-linked in `render.yaml` |
| "Build fails on Render" | Check logs in Render dashboard; usually missing API key or env var |
| "Build fails on Vercel" | Check logs in Vercel dashboard; ensure `frontend/` root is set |

---

**Expected result after deployment:**
- ✅ Backend API running on Render
- ✅ PostgreSQL auto-created and linked
- ✅ Frontend SPA running on Vercel
- ✅ All requests proxied from frontend → backend
- ✅ Hot deployments on future git pushes
