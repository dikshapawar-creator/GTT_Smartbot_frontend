import { API_BASE_URL } from '@/config/api';

/**
 * Centralized API Base URL configuration.
 * Derived from Environment Variables.
 */
export const API_BASE = API_BASE_URL;

// Helper for WebSocket protocols
export const WS_BASE = (typeof API_BASE === 'string' ? API_BASE : '').replace(/^http/, 'ws');
