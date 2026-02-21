# Environment Setup Guide

This project uses multiple environment files for different deployment scenarios. Choose the right file for your use case.

## Quick Reference

| Scenario | Backend | Frontend | How to Use |
|----------|---------|----------|-----------|
| **Local development** | `.env.development` | `.env.development` | `python manage.py runserver` + `npm run dev` |
| **Docker compose** | `.env.docker` | `.env.docker` | `docker-compose up` |
| **Render production** | Render UI only | Vercel UI only | Use `render.yaml` blueprint + set env vars in dashboards |
| **Vercel only** | (separate Render) | `.env.production` via Vercel UI | Import repo to Vercel + set `VITE_API_BASE_URL` |

## Backend Environment Files

### `.env.development`
For running locally with `python manage.py runserver`:
- `DEBUG=True`
- `DB_HOST=localhost` (requires local PostgreSQL running)
- `ALLOWED_HOSTS=localhost,127.0.0.1`
- Frontend CORS origin: `http://localhost:5173`

**Setup:**
```bash
cp backend/.env.development backend/.env
# Update DB credentials if your local PostgreSQL uses different username/password
python manage.py migrate
python manage.py runserver
```

### `.env.docker`
For running in Docker containers with `docker-compose up`:
- `DEBUG=True`
- `DB_HOST=postgres` (service name in docker-compose)
- `ALLOWED_HOSTS=localhost,127.0.0.1,backend`
- Frontend container: `http://frontend:5173`

**Setup:**
```bash
cp backend/.env.docker backend/.env
docker-compose up
```

### `.env.production` (template only)
Template showing vars needed for production on Render.

**CRITICAL:** Do NOT commit `.env.production` with real secrets. Instead:
1. Use Render's native environment variable UI to set each variable.
2. Render auto-generates `SECRET_KEY` via `render.yaml`.
3. Render auto-fills `DB_*` from the linked Postgres service.
4. You only manually enter `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, and any third-party API keys.

See [DEPLOYMENT.md](DEPLOYMENT.md) for exact Render setup steps.

## Frontend Environment Files

### `.env.development`
For local dev with `npm run dev`:
- Dev server proxies `/api/*` requests to Vite's proxy target.
- `VITE_API_PROXY_TARGET=http://localhost:8000` (backend dev server).
- This file is NOT pushed; it's your local config.

**Setup:**
```bash
cd frontend
npm run dev
# Dev server runs on http://localhost:5173
# API calls to /api/v1/* proxy to http://localhost:8000/api/v1/*
```

### `.env.docker`
For Docker compose:
- Container frontend talks to container backend via service name.
- `VITE_API_PROXY_TARGET=http://backend:8000`
- Committed to repo for reproducible container builds.

### `.env.production`
For production on Vercel:
- `VITE_API_BASE_URL=https://<your-render-backend-domain>/api/v1`
- Set this in Vercel environment variable UI, NOT a local file.
- Frontend at build time bakes this URL into `/api/v1` requests.

## How API URLs Work

### Development / Docker (proxy mode)
Frontend makes requests to relative `/api/v1/*` paths.
Dev server or Vite proxy rewrites them to `http://backend:8000/api/v1/*`.

```
Frontend request: GET /api/v1/domain-monitoring/lookalike-domains/
↓ (Vite proxy via VITE_API_PROXY_TARGET)
Backend: GET http://localhost:8000/api/v1/domain-monitoring/lookalike-domains/
```

### Production (explicit API base)
Frontend requests use absolute `VITE_API_BASE_URL` at build time.

```
Frontend request: GET https://ctiportal-backend.onrender.com/api/v1/domain-monitoring/lookalike-domains/
↓ (no proxy needed, direct HTTPS)
Backend: GET https://ctiportal-backend.onrender.com/api/v1/...
```

## Step-by-Step: Local Development

1. **Copy development env files:**
   ```bash
   cp backend/.env.development backend/.env
   cd frontend && cp .env.example .env.development
   ```

2. **Start PostgreSQL** (use your own or Docker):
   ```bash
   # Option A: Docker
   docker run -d --name ctiportal-postgres \
     -e POSTGRES_DB=ctiportal_db \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 postgres:16

   # Option B: Your own PostgreSQL instance
   # Just ensure `localhost:5432` matches `.env.development` settings
   ```

3. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   . venv/Scripts/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

4. **Frontend setup (new terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Open http://localhost:5173
   ```

## Step-by-Step: Docker Compose

1. **Copy Docker env files:**
   ```bash
   cp backend/.env.docker backend/.env
   # frontend/.env.docker already exists
   ```

2. **Start services:**
   ```bash
   docker-compose up
   # Backend: http://localhost:8000
   # Frontend: http://localhost:5173
   ```

## Step-by-Step: Production (Render + Vercel)

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions. Key points:
- Use Render blueprint (`render.yaml`) for backend + Postgres.
- Use Vercel import for frontend.
- Set env vars in each platform's UI, not local files.
- Frontend needs `VITE_API_BASE_URL` pointing to deployed backend.
- Backend needs `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` pointing to deployed frontend.

## Troubleshooting

### "Connection refused" / Backend unreachable
- Development: Ensure `DB_HOST=localhost` and PostgreSQL is running on `:5432`.
- Docker: Ensure `docker-compose up` completed successfully and `backend` service is healthy.
- Production: Verify `CORS_ALLOWED_ORIGINS` in Render includes your Vercel domain WITH `https://` prefix.

### "Unexpected response type" / CORS errors
- Check `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in backend env.
- Verify frontend URL is exact (e.g., `https://your-site.vercel.app` not `https://your-site.vercel.app/`).

### API requests return 401
- Ensure JWT tokens are stored in browser localStorage.
- Check token refresh endpoint at `<backend>/api/v1/auth/token/refresh/`.
- Verify `JWT_ACCESS_MINUTES` and `JWT_REFRESH_DAYS` in backend env.

## Git & Secrets

- **Committed:** `.env.development`, `.env.docker`, `.env.production` (as templates).
- **NOT committed** (in `.gitignore`): `.env` (local runtime override), instance-specific secrets.
- **Render/Vercel secrets:** Set directly in dashboard UI, never in committed files.
- **Third-party API keys:** Set in appropriate env vars (backend only, frontend cannot securely hold API keys).

