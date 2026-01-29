/**
 * API response types and utilities
 * Provides consistent response shapes across all endpoints
 */

import type { ParsedQs } from 'qs';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  meta?: ResponseMeta;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  timestamp?: string;
  pagination?: PaginationMeta;
  filters?: FilterMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Filter metadata
 */
export interface FilterMeta {
  child_id?: number;
  start_date?: string;
  end_date?: string;
}

/**
 * Change history (audit) event: one row from audit_events with user info.
 * Used by GET .../history for visits and illnesses.
 */
export interface AuditHistoryEvent {
  id: number;
  entity_type: 'visit' | 'illness';
  entity_id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: 'created' | 'updated' | 'deleted';
  changed_at: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  summary: string | null;
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Date range filter parameters
 */
export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from query string
 */
export function parsePaginationParams(query: ParsedQs): PaginationParams {
  const pageRaw = typeof query.page === 'string' ? query.page : undefined;
  const limitRaw = typeof query.limit === 'string' ? query.limit : undefined;

  const page = Math.max(1, parseInt(pageRaw ?? '', 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(limitRaw ?? '', 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build pagination metadata
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Create a successful response with optional metadata
 */
export function createResponse<T>(
  data: T,
  meta?: Omit<ResponseMeta, 'timestamp'>
): ApiResponse<T> {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  pagination: PaginationParams,
  filters?: FilterMeta
): ApiResponse<T[]> {
  return createResponse(items, {
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    filters,
  });
}
