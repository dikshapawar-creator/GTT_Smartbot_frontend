import axios from 'axios';


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
// NOTE: Chat and public lead endpoints use session UUID auth — never inject Admin JWT
api.interceptors.request.use((config) => {
    try {
        const isChatOrPublic =
            config.url?.includes('/chat/') ||
            config.url?.includes('/leads/submit');

        if (!isChatOrPublic) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { auth } = require('@/lib/auth');
            const token = auth.getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
    } catch (e) {
        console.warn('Auth injection failed:', e);
    }
    return config;
});

// Response interceptor for consistent error handling and 401 refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying, attempt refresh
        // Skip auto-refresh for chat/public endpoints — they use session UUID, not JWT
        const isChatOrPublic =
            originalRequest.url?.includes('/chat/') ||
            originalRequest.url?.includes('/leads/submit');

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login') && !isChatOrPublic) {
            originalRequest._retry = true;
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { auth } = require('@/lib/auth');
                const refreshToken = auth.getRefreshToken();

                if (refreshToken) {
                    const response = await axios.post(`${API_BASE}/auth/refresh`, {
                        refresh_token: refreshToken
                    });

                    const { access_token, refresh_token } = response.data;
                    const user = auth.getUser();

                    if (user) {
                        auth.setSession(access_token, refresh_token, user);
                        originalRequest.headers.Authorization = `Bearer ${access_token}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error('Refresh token failed:', refreshError);
                // Redirect to signin if refresh fails
                if (typeof window !== 'undefined') {
                    window.location.href = '/signin';
                }
            }
        }

        const message = error.response?.data?.detail || error.message || 'Network Error';
        return Promise.reject(new Error(message));
    }
);

export default api;
