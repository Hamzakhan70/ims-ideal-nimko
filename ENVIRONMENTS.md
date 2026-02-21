# Environment Management (Dev / Staging / Production)

This project now supports `development`, `staging`, and `production`.

## Backend (`api`)

### 1. Runtime config file
- Environment loader is now: `api/config/runtimeConfig.js`
- It loads env files in this order (highest priority first):
1. `.env.{APP_ENV}.local`
2. `.env.{APP_ENV}`
3. `.env.local`
4. `.env`

Example:
- If `APP_ENV=staging`, loader checks:
  - `.env.staging.local`
  - `.env.staging`
  - `.env.local`
  - `.env`

### 2. Required backend keys
- `MONGO_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Optional but recommended:
- `APP_ENV` (`development` | `staging` | `production`)
- `NODE_ENV`
- `JWT_EXPIRES_IN_ADMIN`
- `JWT_EXPIRES_IN_USER`
- `CORS_ORIGINS`

### 3. Backend run commands
- Local dev:
  - `cd api`
  - `npm run dev`

- Start with staging file:
  - `cd api`
  - `npm run start:staging`

- Start with production file:
  - `cd api`
  - `npm run start:production`

## Frontend (`app`)

Vite uses mode-based env files:
- `.env.development`
- `.env.staging`
- `.env.production`

Required key:
- `VITE_API_URL`

### Frontend run/build commands
- Dev:
  - `cd app`
  - `npm run dev`

- Staging mode:
  - `cd app`
  - `npm run dev:staging`
  - `npm run build:staging`

- Production build:
  - `cd app`
  - `npm run build`

## What to keep in Git

- Keep only `*.example` env files in Git.
- Never commit real `.env` files.

## Recommended flow for you

1. Develop locally with `development`.
2. Test final behavior in `staging`.
3. Deploy only `production` to live server/domain.
4. Use different MongoDB DB names for each environment.
5. Use a different `JWT_SECRET` per environment.
