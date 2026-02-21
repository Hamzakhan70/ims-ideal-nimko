const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim();
const normalizedApiUrl = rawApiUrl.replace(/\/$/, '');

export const API_BASE_URL = normalizedApiUrl.startsWith('/')
  ? normalizedApiUrl
  : (/\/api$/i.test(normalizedApiUrl) ? normalizedApiUrl : `${normalizedApiUrl}/api`);

export const AUTH_TOKEN_STORAGE_KEY = 'adminToken';
export const AUTH_USER_ID_STORAGE_KEY = 'userId';
export const REQUEST_TIMEOUT_MS = 10000;
export const NOTIFICATION_POLL_INTERVAL_MS = 30000;
