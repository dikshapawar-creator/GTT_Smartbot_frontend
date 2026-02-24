import api from '@/config/api';

/**
 * Standardized API client re-exporting the centralized Axios instance.
 * Maintains compatibility while providing full enterprise features.
 */
export { api };

// Deprecated: use api.get/post etc directly
export const request = api.request;
