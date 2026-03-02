// src/lib/api.ts
import axios from 'axios';
import { handleLogout } from '../utils/logout';

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

// Helper to get tokens. Prefer logged-in user tokens if present, otherwise use frontend tokens.
const getTokens = () => {
  const userAccess = localStorage.getItem('user_access_token');
  const userRefresh = localStorage.getItem('user_refresh_token');
  if (userAccess || userRefresh) {
    return { access: userAccess, refresh: userRefresh, type: 'user' };
  }
  return { access: localStorage.getItem(ACCESS_TOKEN_KEY), refresh: localStorage.getItem(REFRESH_TOKEN_KEY), type: 'frontend' };
};

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
    const tokens = getTokens();
    let access = tokens.access;

    // If no token exists, try to log in with frontend service token
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
// Response Interceptor: FORCE LOGOUT ON 401
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const status = error?.response?.status;

    // 🔥 ALWAYS logout on Unauthorized
    if (status === 401) {
      console.warn("401 detected → logging out");

      handleLogout();

      // prevent further retries
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;