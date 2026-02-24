export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.gtdservice.com';

export const getApiBase = () => {
    if (typeof window === 'undefined') return API_BASE_URL;
    const { hostname, protocol } = window.location;

    // Support local development automatically
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:8000`;
    }

    return API_BASE_URL;
};

export const API_BASE = getApiBase();
