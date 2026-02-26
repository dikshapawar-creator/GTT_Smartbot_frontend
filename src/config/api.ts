import axios from 'axios';
import Cookies from 'js-cookie';

/**
 * Centralized API Base URL configuration
 * Works for both local development and production (Vercel)
 */
export const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// WebSocket base URL helper
export const WS_BASE = API_BASE.replace(/^http/, 'ws');

/**
 * Centralized Axios instance for Enterprise API communication.
 * - Handles base URL from environment
 * - Enables credential sharing (cookies/JWT)
 * - Standardizes error handling
 */
const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Request interceptor for injecting JWT token (Auth Hardening)
api.interceptors.request.use((config) => {
    const token = Cookies.get('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.detail || error.message || 'Network Error';
        return Promise.reject(new Error(message));
    }
);

export default api;
export { API_BASE, WS_BASE };
