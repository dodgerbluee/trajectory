/**
 * Build-time env (Vite). Empty = relative URLs (unified app or dev proxy).
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
