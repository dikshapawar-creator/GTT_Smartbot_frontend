const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            "Content-Type": "application/json",
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Something went wrong");
        }

        return response.json();
    },

    get<T>(endpoint: string, options: RequestInit = {}) {
        return this.request<T>(endpoint, { ...options, method: "GET" });
    },

    post<T>(endpoint: string, data?: unknown, options: RequestInit = {}) {
        return this.request<T>(endpoint, {
            ...options,
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    put<T>(endpoint: string, data?: unknown, options: RequestInit = {}) {
        return this.request<T>(endpoint, {
            ...options,
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    delete<T>(endpoint: string, options: RequestInit = {}) {
        return this.request<T>(endpoint, { ...options, method: "DELETE" });
    },
};
