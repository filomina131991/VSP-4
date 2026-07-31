import axios from 'axios';
import { API_BASE } from '../config/api';

// In-memory access token (NOT in localStorage — prevents XSS token theft)
let _accessToken: string | null = null;

export const getAccessToken = () => _accessToken;
export const setAccessToken = (token: string | null) => { 
  _accessToken = token; 
};

let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        const newToken = res.data.token;
        setAccessToken(newToken);
        return newToken;
      } catch (err) {
        setAccessToken(null);
        throw err;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
};

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the request is an auth checking endpoint (login, refresh, me, logout)
    const isAuthEndpoint = 
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/me') ||
      originalRequest?.url?.includes('/auth/logout');

    if (error.response?.status === 401) {
      // If the 401 comes from an auth endpoint itself, reject cleanly without retry or window redirect
      if (isAuthEndpoint) {
        _accessToken = null;
        return Promise.reject(error);
      }

      // For non-auth protected API calls, try refreshing token once if not retried yet
      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const newToken = await refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          return apiClient(originalRequest);
        } catch (refreshError) {
          _accessToken = null;
          return Promise.reject(refreshError);
        }
      } else {
        _accessToken = null;
      }
    }

    return Promise.reject(error);
  }
);

