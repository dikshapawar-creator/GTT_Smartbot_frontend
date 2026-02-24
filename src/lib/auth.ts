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
        // Access token usually expires in 1 hour
        Cookies.set(ACCESS_TOKEN_KEY, accessToken, { expires: 1 / 24, secure: isSecure, sameSite: 'strict' });
        // Refresh token usually expires in 30 days
        Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 30, secure: isSecure, sameSite: 'strict' });
        Cookies.set(USER_KEY, JSON.stringify(user), { expires: 30, secure: isSecure, sameSite: 'strict' });
    },

    clearSession() {
        Cookies.remove(ACCESS_TOKEN_KEY);
        Cookies.remove(REFRESH_TOKEN_KEY);
        Cookies.remove(USER_KEY);
    },

    getAccessToken() {
        return Cookies.get(ACCESS_TOKEN_KEY);
    },

    getRefreshToken() {
        return Cookies.get(REFRESH_TOKEN_KEY);
    },

    getUser(): UserProfile | null {
        const userStr = Cookies.get(USER_KEY);
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
