# ctiportal

CTI workspace with:

- Intelligence Harvester
- Domain Monitoring
- Website Screenshot
- Mail Header Analyzer
- Text Formatter
- URL Decoder
- ThreatStream search

Live demo:

- Frontend: https://ctiportal.vercel.app
- Backend: https://ctiportal-backend.onrender.com

## Stack

- Frontend: React, Vite, TypeScript, shadcn/ui
- Backend: Django, DRF, PostgreSQL
- Auth: cookie-based JWT

## Env files

Use one template and one real env file per app:

- `backend/.env.example` -> copy to `backend/.env`
- `frontend/.env.example` -> copy to `frontend/.env`

## Local development

Backend:

```bash
cp backend/.env.example backend/.env
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Frontend:

```bash
cp frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

Default local auth cookie settings:

```env
AUTH_COOKIE_SECURE=False
AUTH_COOKIE_SAMESITE=Lax
```

## Docker Compose

```bash
docker-compose up
```

Notes:

- Docker Compose reads the same `backend/.env` and `frontend/.env` files
- Docker-specific values are overridden in `docker-compose.yml`
- Postgres container credentials are defined in `docker-compose.yml`

Default Docker auth cookie settings:

```env
AUTH_COOKIE_SECURE=False
AUTH_COOKIE_SAMESITE=Lax
```

## Production: Render + Vercel

Do not deploy with local `.env` files. Set env vars in the hosting dashboards.

Backend on Render must use:

```env
AUTH_COOKIE_SECURE=True
AUTH_COOKIE_SAMESITE=None
CORS_ALLOWED_ORIGINS=https://ctiportal.vercel.app
CSRF_TRUSTED_ORIGINS=https://ctiportal.vercel.app
ALLOWED_HOSTS=ctiportal-backend.onrender.com
```

Frontend on Vercel must use:

```env
VITE_API_BASE_URL=https://ctiportal-backend.onrender.com/api/v1
```

Why:

- frontend and backend are on different domains
- auth is cookie-based
- cross-site cookies require `Secure=True` and `SameSite=None`

## Important notes

- `AUTH_COOKIE_SAMESITE` must be one of `Lax`, `Strict`, `None`
- `AUTH_COOKIE_SAMESITE=None` requires `AUTH_COOKIE_SECURE=True`
- provider API keys are backend-only
- keep real secrets out of the repo
- rotate any secret that was ever committed
