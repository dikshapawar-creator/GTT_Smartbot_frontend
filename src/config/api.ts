import axios, { InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/lib/auth';

/**
 * Centralized API Base URL configuration
 */
export const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const WS_BASE = API_BASE.replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws');

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

interface ChatbotConfig {
    apiKey?: string;
    api_key?: string;
    api_Key?: string;
    tenantId?: string | number;
    tenant_id?: string | number;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    try {
        const isChatOrPublic =
            (config.url?.includes('/chat/') ||
                config.url?.includes('/leads/submit') ||
                config.url?.includes('/bot-config')) &&
            !config.url?.includes('/admin/');

        if (isChatOrPublic) {
            if (typeof window !== 'undefined') {
                const win = window as unknown as {
                    GTT_CHATBOT_CONFIG?: ChatbotConfig;
                    CHATBOT_CONFIG?: ChatbotConfig
                };
                const globalConfig = win.GTT_CHATBOT_CONFIG || win.CHATBOT_CONFIG;

                const apiKey = globalConfig?.apiKey || globalConfig?.api_key || globalConfig?.api_Key || 'key_local_1';
                if (apiKey) {
                    config.headers['x-api-key'] = apiKey;
                }

                const tid = globalConfig?.tenantId || globalConfig?.tenant_id;
                if (tid) {
                    config.params = { ...config.params, tenant_id: tid };
                }
            }
        } else {
            const token = auth.getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            const isLogin = config.url?.includes('/auth/login');
            const user = auth.getUser();
            if (user && !isLogin) {
                const selectedTenantId = typeof window !== 'undefined'
                    ? localStorage.getItem('selected_tenant_id')
                    : null;
                const activeTenantId = selectedTenantId || user.primary_tenant_id || user.tenant_id;
                if (activeTenantId) {
                    config.headers['X-Tenant-ID'] = String(activeTenantId);
                }
            }
        }
    } catch (e) {
        console.warn('Request interceptor failed:', e);
    }
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isChatOrPublic =
            originalRequest.url?.includes('/chat/') ||
            originalRequest.url?.includes('/leads/submit');

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login') && !isChatOrPublic) {
            originalRequest._retry = true;
            try {
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
            } catch {
                if (typeof window !== 'undefined') {
                    window.location.href = '/signin';
                }
            }
        }

        let message = 'Network Error';
        if (error.response?.data?.detail) {
            const detail = error.response.data.detail;
            if (typeof detail === 'string') message = detail;
            else if (Array.isArray(detail)) {
                message = detail.map((d: { msg?: string } | string) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join(', ');
            }
            else message = JSON.stringify(detail);
        } else if (error.message) {
            message = error.message;
        }
        return Promise.reject(new Error(message));
    }
);

export default api;
