import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const apiRoot = join(__dirname, '..');

const normalizeEnvironment = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'prod' || normalized === 'production') return 'production';
  if (normalized === 'stage' || normalized === 'staging') return 'staging';
  return 'development';
};

const configuredEnvironment = process.env.APP_ENV || process.env.NODE_ENV || 'development';
export const APP_ENV = normalizeEnvironment(configuredEnvironment);

// Highest-priority first. Lower-priority files only fill missing keys.
const envFiles = [
  `.env.${APP_ENV}.local`,
  `.env.${APP_ENV}`,
  '.env.local',
  '.env'
];

export const loadedEnvFiles = [];

for (const fileName of envFiles) {
  const fullPath = join(apiRoot, fileName);
  if (!existsSync(fullPath)) {
    continue;
  }
  dotenv.config({ path: fullPath });
  loadedEnvFiles.push(fileName);
}

if (!process.env.APP_ENV) {
  process.env.APP_ENV = APP_ENV;
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = APP_ENV === 'development' ? 'development' : 'production';
}

export const getEnv = (key, fallback = undefined) => {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value;
};

export const getRequiredEnv = (key) => {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const isDevelopment = APP_ENV === 'development';
export const isStaging = APP_ENV === 'staging';
export const isProduction = APP_ENV === 'production';
export const isProductionLike = isStaging || isProduction;
