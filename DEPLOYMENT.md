# Deployment Guide

This repository is configured for:
- Backend + Postgres on Render
- Frontend on Vercel (recommended)
- Optional all-in-Render deployment

## 1) Deploy Backend on Render

### Option A: Blueprint (recommended)
1. In Render, click **New +** -> **Blueprint**.
2. Select this repository.
3. Render will detect [`render.yaml`](render.yaml) and propose services.
4. Set these env vars for the backend service:
   - `CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>`
   - `CSRF_TRUSTED_ORIGINS=https://<your-frontend-domain>`
5. Deploy.

### Option B: Manual service setup
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `python manage.py migrate --noinput ; gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT`
- Required env vars:
  - `SECRET_KEY` (strong random value)
  - `DEBUG=False`
  - `ALLOWED_HOSTS=<your-backend-domain>`
  - `CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>`
  - `CSRF_TRUSTED_ORIGINS=https://<your-frontend-domain>`
  - `DB_ENGINE=django.db.backends.postgresql`
  - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`

> `RENDER_EXTERNAL_HOSTNAME` is auto-added to `ALLOWED_HOSTS` by settings, so Render hostnames work without extra code edits.

## 2) Deploy Frontend on Vercel (recommended)

1. In Vercel, import this repository.
2. Set **Root Directory** to `frontend`.
3. Framework preset: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add environment variable:
   - `VITE_API_BASE_URL=https://<your-render-backend-domain>/api/v1`
7. Deploy.

Notes:
- [`frontend/vercel.json`](frontend/vercel.json) is included for SPA routing fallback (`BrowserRouter`).
- Frontend API calls now read `VITE_API_BASE_URL` and default to `/api/v1` if unset.

## 3) Optional: Deploy Frontend on Render instead of Vercel

The included [`render.yaml`](render.yaml) also defines a static frontend service.
If you use it, set in frontend env:
- `VITE_API_BASE_URL=https://<your-render-backend-domain>/api/v1`

## 4) Post-deploy verification

- Open frontend and confirm login works.
- Verify API docs load at `https://<backend-domain>/api/docs/`.
- Run one action in each major module (Harvester, Domain Monitoring, Threatstream).
- If CORS fails, re-check `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` values (must include protocol and exact domain).
