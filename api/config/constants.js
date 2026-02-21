import { getEnv } from './runtimeConfig.js';

export const DEFAULT_PORT = 5000;
export const JWT_EXPIRES_IN_ADMIN = getEnv('JWT_EXPIRES_IN_ADMIN', '24h');
export const JWT_EXPIRES_IN_USER = getEnv('JWT_EXPIRES_IN_USER', '1h');

export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000'
];
