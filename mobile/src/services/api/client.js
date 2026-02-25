import axios from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../../constants/appConfig';
import { authStorage } from '../auth/authStorage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS
});

apiClient.interceptors.request.use(async (config) => {
  const token = await authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
