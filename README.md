# IMS Ideal Nimko

Inventory and order management application with:
- `app` (React + Vite frontend)
- `api` (Node.js + Express + MongoDB backend)

## Environments

- Development: local coding and testing
- Staging: pre-production testing
- Production: live users

## Branch Mapping

- `main` -> production
- `stage` -> staging
- `feature/*` -> task branches

## Environment Files

### Backend (`api`)

Use these templates:
- `api/.env.development.example`
- `api/.env.staging.example`
- `api/.env.production.example`

Create real files (do not commit):
- `api/.env.development`
- `api/.env.staging`
- `api/.env.production`

Required backend keys:
- `MONGO_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Frontend (`app`)

Use these templates:
- `app/.env.development.example`
- `app/.env.staging.example`
- `app/.env.production.example`

Create real files (do not commit):
- `app/.env.development`
- `app/.env.staging`
- `app/.env.production`

Required frontend key:
- `VITE_API_URL`

## Run Commands

### Backend

```bash
cd api
npm install
npm run dev
```

Staging / production:

```bash
cd api
npm run start:staging
npm run start:production
```

### Frontend

```bash
cd app
npm install
npm run dev
```

Staging / production builds:

```bash
cd app
npm run build:staging
npm run build
```

## Git Workflow

1. Create feature branch from `stage`:

```bash
git checkout stage
git pull origin stage
git checkout -b feature/your-task-name
```

2. Commit and push feature:

```bash
git add -A
git commit -m "feat: your change"
git push -u origin feature/your-task-name
```

3. Merge flow:
- `feature/*` -> `stage`
- test on staging
- `stage` -> `main`
- deploy production

