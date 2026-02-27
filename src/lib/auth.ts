import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_profile';

export interface UserProfile {
    id: number;
    email: string;
    role: string;
    role_level: number;
    tenant_id: number;
}

export const auth = {
    setSession(accessToken: string, refreshToken: string, user: UserProfile) {
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

        // 1. Set Cookies (Existing logic)
        Cookies.set(ACCESS_TOKEN_KEY, accessToken, { expires: 1 / 24, secure: isSecure, sameSite: 'strict' });
        Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 30, secure: isSecure, sameSite: 'strict' });
        Cookies.set(USER_KEY, JSON.stringify(user), { expires: 30, secure: isSecure, sameSite: 'strict' });

        // 2. Set LocalStorage (Enterprise Hardening for Dev/Redundancy)
        if (typeof window !== 'undefined') {
            localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
    },

    clearSession() {
        Cookies.remove(ACCESS_TOKEN_KEY);
        Cookies.remove(REFRESH_TOKEN_KEY);
        Cookies.remove(USER_KEY);

        if (typeof window !== 'undefined') {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    },

    getAccessToken() {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(ACCESS_TOKEN_KEY) || Cookies.get(ACCESS_TOKEN_KEY);
        }
        return Cookies.get(ACCESS_TOKEN_KEY);
    },

    getRefreshToken() {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(REFRESH_TOKEN_KEY) || Cookies.get(REFRESH_TOKEN_KEY);
        }
        return Cookies.get(REFRESH_TOKEN_KEY);
    },

    getUser(): UserProfile | null {
        let userStr: string | undefined | null = Cookies.get(USER_KEY);

        if (!userStr && typeof window !== 'undefined') {
            userStr = localStorage.getItem(USER_KEY);
        }

        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    isAuthenticated() {
        return !!this.getAccessToken();
    },

    isAdmin() {
        const user = this.getUser();
        if (!user) return false;
        return user.role === 'administrator' || (user.role_level !== undefined && user.role_level >= 3);
    }
};
