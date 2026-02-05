// src/lib/api.ts
import axios from 'axios';

// Environment variables
const API_URL = import.meta.env.VITE_BASE_URL; // Adjust to your backend URL
const FRONTEND_USERNAME = import.meta.env.VITE_FRONTEND_USERNAME;
const FRONTEND_PASSWORD = import.meta.env.VITE_FRONTEND_PASSWORD;

// Token storage keys
const ACCESS_TOKEN_KEY = 'fe_access_token';
const REFRESH_TOKEN_KEY = 'fe_refresh_token';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get tokens
const getTokens = () => ({
  access: localStorage.getItem(ACCESS_TOKEN_KEY),
  refresh: localStorage.getItem(REFRESH_TOKEN_KEY),
});

// Helper to set tokens
const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};

// Function to perform the initial login
const frontendLogin = async () => {
  try {
    const response = await axios.post(`${API_URL}/api/frontend/login`, {
      username: FRONTEND_USERNAME,
      password: FRONTEND_PASSWORD,
    });
    const { access_token, refresh_token } = response.data;
    setTokens(access_token, refresh_token);
    return access_token;
  } catch (error) {
    console.error("Frontend Login Failed", error);
    throw error;
  }
};

// Request Interceptor: Attach Token
api.interceptors.request.use(
  async (config) => {
    let { access } = getTokens();

    // If no token exists, try to log in first
    if (!access) {
      access = await frontendLogin();
    }

    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { refresh } = getTokens();

      if (refresh) {
        try {
          const response = await axios.post(`${API_URL}/api/frontend/refresh`, {
            refresh_token: refresh,
          });
          
          const { access_token, refresh_token } = response.data;
          setTokens(access_token, refresh_token);

          // Update header and retry
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, try full login again
          try {
             const newAccess = await frontendLogin();
             originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
             return api(originalRequest);
          } catch (loginError) {
             return Promise.reject(loginError);
          }
        }
      } else {
         // No refresh token, try login
         const newAccess = await frontendLogin();
         originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
         return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default api;