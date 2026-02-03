/**
 * API Client
 * Centralized HTTP client for communicating with the backend
 */

import type {
  ApiResponse,
  ApiError,
  Child,
  CreateChildInput,
  UpdateChildInput,
  Measurement,
  CreateMeasurementInput,
  UpdateMeasurementInput,
  PaginationParams,
  DateRangeParams,
  Visit,
  CreateVisitInput,
  UpdateVisitInput,
  VisitType,
  VisitAttachment,
  ChildAttachment,
  Illness,
  CreateIllnessInput,
  UpdateIllnessInput,
  IllnessType,
  GrowthDataPoint,
  HeatmapData,
  AuditHistoryEvent,
  Family,
  FamilyInvite,
  FamilyMember,
  CreateInviteResponse,
  AdminConfig,
  AdminLogsResponse,
  AdminUser,
  AdminUserDetail,
} from '../types/api';
import { API_BASE_URL } from './env.js';

/**
 * API Error class for structured error handling
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

const ACCESS_TOKEN_KEY = 'trajectory_access_token';
const REFRESH_TOKEN_KEY = 'trajectory_refresh_token';
const USER_KEY = 'trajectory_user';

/**
 * Get access token from localStorage
 */
function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearAuthStorage(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function redirectToLogin(): void {
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

/**
 * Try to refresh the access token. Returns new access token or null if refresh failed.
 */
async function tryRefreshToken(): Promise<string | null> {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });
    const body = await response.json();
    if (!response.ok) return null;
    const data = body?.data ?? body;
    const accessToken = data?.accessToken;
    const newRefreshToken = data?.refreshToken;
    if (accessToken && newRefreshToken) {
      setTokens(accessToken, newRefreshToken);
      return accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Make HTTP request with error handling and authentication.
 * On 401, attempts to refresh the token once and retries the request; only clears auth and redirects if refresh fails.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetryAfterRefresh = false
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return { data: undefined as any } as ApiResponse<T>;
    }

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;

      if (response.status === 401 && accessToken) {
        if (isRetryAfterRefresh) {
          clearAuthStorage();
          redirectToLogin();
        } else {
          const newToken = await tryRefreshToken();
          if (newToken) {
            return request<T>(endpoint, { ...options, headers: { ...headers, Authorization: `Bearer ${newToken}` } }, true);
          }
          clearAuthStorage();
          redirectToLogin();
        }
      }

      throw new ApiClientError(
        error.error.message,
        error.error.statusCode,
        error.error.type,
        error.error.details
      );
    }

    return data as ApiResponse<T>;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    throw new ApiClientError('Failed to communicate with server', 0, 'NetworkError', err);
  }
}

// ============================================================================
// Children API
// ============================================================================

export const childrenApi = {
  /**
   * Get all children with pagination
   */
  async getAll(params?: PaginationParams): Promise<ApiResponse<Child[]>> {
    const queryString = buildQueryString(params || {});
    return request<Child[]>(`/api/children${queryString}`);
  },

  /**
   * Get a single child by ID
   */
  async getById(id: number): Promise<ApiResponse<Child>> {
    return request<Child>(`/api/children/${id}`);
  },

  /**
   * Create a new child
   */
  async create(input: CreateChildInput): Promise<ApiResponse<Child>> {
    return request<Child>('/api/children', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /**
   * Update a child
   */
  async update(id: number, input: UpdateChildInput): Promise<ApiResponse<Child>> {
    return request<Child>(`/api/children/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  /**
   * Delete a child
   */
  async delete(id: number): Promise<void> {
    await request<void>(`/api/children/${id}`, { method: 'DELETE' });
  },

  /**
   * Upload avatar for child
   */
  async uploadAvatar(childId: number, file: File): Promise<ApiResponse<{ avatar: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/children/${childId}/avatar`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ApiClientError(
        error.error.message,
        error.error.statusCode,
        error.error.type,
        error.error.details
      );
    }

    return response.json();
  },

  /**
   * Get avatar URL for child (with token in query for img src).
   * Prefer fetchAvatarBlobUrl() for reliable loading across accounts.
   */
  getAvatarUrl(avatar: string): string {
    const base = `${API_BASE_URL}/api/avatars/${avatar}`;
    const token = getAccessToken();
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },

  /**
   * Fetch avatar image with auth and return a blob URL (no token in URL).
   * Caller must revoke the URL when done: URL.revokeObjectURL(url).
   */
  async fetchAvatarBlobUrl(avatar: string): Promise<string | null> {
    const token = getAccessToken();
    if (!token) return null;
    const url = `${API_BASE_URL}/api/avatars/${avatar}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  /**
   * Get default avatar URL based on gender.
   * Uses API_BASE_URL when set so default avatar works when frontend and API are on different origins.
   */
  getDefaultAvatarUrl(gender: string): string {
    const base = API_BASE_URL ? `${API_BASE_URL}/api/avatars` : '/api/avatars';
    const file = gender === 'male' ? 'default-boy.svg' : 'default-girl.svg';
    return `${base}/${file}`;
  },

  /**
   * Delete avatar for child
   */
  async deleteAvatar(childId: number): Promise<void> {
    await request<void>(`/api/children/${childId}/avatar`, { method: 'DELETE' });
  },

  /**
   * Upload a child attachment (e.g., vaccine report)
   */
  async uploadAttachment(
    childId: number,
    file: File,
    documentType: string = 'vaccine_report'
  ): Promise<ApiResponse<ChildAttachment>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    const accessToken = getAccessToken();
    const headers: Record<string, string> = {};
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/children/${childId}/attachments`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      // Handle 401 with token refresh
      if (response.status === 401 && accessToken) {
        const newToken = await tryRefreshToken();
        if (newToken) {
          // Retry with new token
          const retryHeaders: Record<string, string> = {
            'Authorization': `Bearer ${newToken}`,
          };
          const retryResponse = await fetch(`${API_BASE_URL}/api/children/${childId}/attachments`, {
            method: 'POST',
            headers: retryHeaders,
            body: formData,
          });
          
          if (!retryResponse.ok) {
            const error = await retryResponse.json();
            throw new ApiClientError(
              error.error?.message || 'Failed to upload attachment',
              retryResponse.status,
              error.error?.type || 'UploadError'
            );
          }
          
          return retryResponse.json();
        } else {
          clearAuthStorage();
          redirectToLogin();
          throw new ApiClientError('Authentication failed', 401, 'UnauthorizedError');
        }
      }
      
      const error = await response.json();
      throw new ApiClientError(
        error.error?.message || 'Failed to upload attachment',
        response.status,
        error.error?.type || 'UploadError'
      );
    }

    return response.json();
  },

  /**
   * Get all attachments for a child
   */
  async getAttachments(childId: number): Promise<ApiResponse<ChildAttachment[]>> {
    return request<ChildAttachment[]>(`/api/children/${childId}/attachments`);
  },

  /**
   * Get download URL for a child attachment (with token in query for img src/download).
   */
  getAttachmentDownloadUrl(attachmentId: number): string {
    const base = `${API_BASE_URL}/api/attachments/${attachmentId}`;
    const token = getAccessToken();
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },

  /**
   * Delete a child attachment
   */
  async deleteAttachment(attachmentId: number): Promise<void> {
    await request<void>(`/api/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Update attachment filename
   */
  async updateAttachment(attachmentId: number, originalFilename: string): Promise<void> {
    await request<void>(`/api/attachments/${attachmentId}`, {
      method: 'PUT',
      body: JSON.stringify({ original_filename: originalFilename }),
    });
  },
};

// ============================================================================
// Measurements API
// ============================================================================

export const measurementsApi = {
  /**
   * Get all measurements for a child with pagination and filtering
   */
  async getByChild(
    childId: number,
    params?: PaginationParams & DateRangeParams
  ): Promise<ApiResponse<Measurement[]>> {
    const queryString = buildQueryString(params || {});
    return request<Measurement[]>(`/api/children/${childId}/measurements${queryString}`);
  },

  /**
   * Get a single measurement by ID
   */
  async getById(id: number): Promise<ApiResponse<Measurement>> {
    return request<Measurement>(`/api/measurements/${id}`);
  },

  /**
   * Create a new measurement
   */
  async create(
    childId: number,
    input: CreateMeasurementInput
  ): Promise<ApiResponse<Measurement>> {
    return request<Measurement>(`/api/children/${childId}/measurements`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /**
   * Update a measurement
   */
  async update(
    id: number,
    input: UpdateMeasurementInput
  ): Promise<ApiResponse<Measurement>> {
    return request<Measurement>(`/api/measurements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  /**
   * Delete a measurement
   */
  async delete(id: number): Promise<void> {
    await request<void>(`/api/measurements/${id}`, { method: 'DELETE' });
  },
};

// ============================================================================
// Visits API (Unified wellness and sick visits)
// ============================================================================

export const visitsApi = {
  /**
   * Get all visits with filtering.
   * future_only: true returns only visits with visit_date > today, ordered soonest first.
   */
  async getAll(params?: {
    child_id?: number;
    visit_type?: VisitType;
    future_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Visit[]>> {
    const queryString = buildQueryString(params || {});
    return request<Visit[]>(`/api/visits${queryString}`);
  },

  /**
   * Get a single visit by ID
   */
  async getById(id: number): Promise<ApiResponse<Visit>> {
    return request<Visit>(`/api/visits/${id}`);
  },

  /**
   * Get visit history (audit events with field-level changes)
   */
  async getHistory(id: number, params?: { page?: number; limit?: number }): Promise<ApiResponse<AuditHistoryEvent[]>> {
    const query = params?.page != null || params?.limit != null
      ? `?${new URLSearchParams({
          ...(params.page != null && { page: String(params.page) }),
          ...(params.limit != null && { limit: String(params.limit) }),
        }).toString()}`
      : '';
    return request<AuditHistoryEvent[]>(`/api/visits/${id}/history${query}`);
  },

  /**
   * Create a new visit
   */
  async create(input: CreateVisitInput): Promise<ApiResponse<Visit>> {
    return request<Visit>('/api/visits', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /**
   * Update a visit
   */
  async update(id: number, input: UpdateVisitInput): Promise<ApiResponse<Visit>> {
    return request<Visit>(`/api/visits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  /**
   * Delete a visit
   */
  async delete(id: number): Promise<void> {
    await request<void>(`/api/visits/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get attachments for a visit
   */
  async getAttachments(visitId: number): Promise<ApiResponse<VisitAttachment[]>> {
    return request<VisitAttachment[]>(`/api/visits/${visitId}/attachments`);
  },

  /**
   * Upload attachment to a visit
   */
  async uploadAttachment(visitId: number, file: File): Promise<ApiResponse<VisitAttachment>> {
    const formData = new FormData();
    formData.append('file', file);

    const accessToken = getAccessToken();
    const headers: Record<string, string> = {};
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Manually handle FormData upload
    const response = await fetch(`${API_BASE_URL}/api/visits/${visitId}/attachments`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      // Handle 401 with token refresh
      if (response.status === 401 && accessToken) {
        const newToken = await tryRefreshToken();
        if (newToken) {
          // Retry with new token
          const retryHeaders: Record<string, string> = {
            'Authorization': `Bearer ${newToken}`,
          };
          const retryResponse = await fetch(`${API_BASE_URL}/api/visits/${visitId}/attachments`, {
            method: 'POST',
            headers: retryHeaders,
            body: formData,
          });
          
          if (!retryResponse.ok) {
            const error = await retryResponse.json();
            throw new ApiClientError(error.error?.message || 'Upload failed', retryResponse.status, 'UploadError');
          }
          
          const result = await retryResponse.json();
          return result as ApiResponse<VisitAttachment>;
        } else {
          clearAuthStorage();
          redirectToLogin();
          throw new ApiClientError('Authentication failed', 401, 'UnauthorizedError');
        }
      }
      
      const error = await response.json();
      throw new ApiClientError(error.error?.message || 'Upload failed', response.status, 'UploadError');
    }

    const result = await response.json();
    return result as ApiResponse<VisitAttachment>;
  },

  /**
   * Get attachment download URL (with token in query for img src/download).
   */
  getAttachmentDownloadUrl(attachmentId: number): string {
    const base = `${API_BASE_URL}/api/attachments/${attachmentId}`;
    const token = getAccessToken();
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },

  /**
   * Update attachment filename
   */
  async updateAttachment(attachmentId: number, originalFilename: string): Promise<ApiResponse<{ success: boolean }>> {
    return request<{ success: boolean }>(`/api/attachments/${attachmentId}`, {
      method: 'PUT',
      body: JSON.stringify({ original_filename: originalFilename }),
    });
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(attachmentId: number): Promise<void> {
    await request<void>(`/api/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get growth data for charts (age-based)
   */
  async getGrowthData(params?: {
    child_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<GrowthDataPoint[]>> {
    const queryString = buildQueryString(params || {});
    return request<GrowthDataPoint[]>(`/api/visits/growth-data${queryString}`);
  },
};

// ============================================================================
// Illnesses API
// ============================================================================

export const illnessesApi = {
  /**
   * Get all illnesses with filtering
   */
  async getAll(params?: {
    child_id?: number;
    illness_type?: IllnessType;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Illness[]>> {
    const queryString = buildQueryString(params || {});
    return request<Illness[]>(`/api/illnesses${queryString}`);
  },

  /**
   * Get a single illness by ID
   */
  async getById(id: number): Promise<ApiResponse<Illness>> {
    return request<Illness>(`/api/illnesses/${id}`);
  },

  /**
   * Create a new illness
   */
  async create(input: CreateIllnessInput): Promise<ApiResponse<Illness>> {
    return request<Illness>('/api/illnesses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /**
   * Update an illness
   */
  async update(id: number, input: UpdateIllnessInput): Promise<ApiResponse<Illness>> {
    return request<Illness>(`/api/illnesses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  /**
   * Delete an illness
   */
  async delete(id: number): Promise<void> {
    await request<void>(`/api/illnesses/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get heatmap data for a year
   */
  async getHeatmapData(params?: {
    year?: number;
    child_id?: number;
  }): Promise<ApiResponse<HeatmapData>> {
    const queryString = buildQueryString(params || {});
    return request<HeatmapData>(`/api/illnesses/metrics/heatmap${queryString}`);
  },
};

// ============================================================================
// Export API
// ============================================================================

export const exportApi = {
  /**
   * Download full data export as ZIP (JSON + HTML report + attachment files).
   * Triggers a file download in the browser.
   */
  async download(): Promise<void> {
    const url = `${API_BASE_URL}/api/export`;
    const accessToken = getAccessToken();
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      const text = await response.text();
      let message = 'Export failed';
      try {
        const data = JSON.parse(text);
        if (data?.error?.message) message = data.error.message;
      } catch {
        if (text) message = text.slice(0, 100);
      }
      throw new ApiClientError(message, response.status, 'ExportError');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    const match = disposition?.match(/filename="?([^";\n]+)"?/);
    const filename = match ? match[1].trim() : `trajectory-export-${new Date().toISOString().slice(0, 10)}.zip`;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },
};

// ============================================================================
// Auth (unauthenticated registration-code flow)
// ============================================================================

/** Unauthenticated request for registration-code flow (no auth header). */
async function requestPublic<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) },
  };
  const response = await fetch(url, config);
  const data = await response.json();
  if (!response.ok) {
    const err = data as ApiError;
    throw new ApiClientError(
      err.error?.message || 'Request failed',
      err.error?.statusCode ?? response.status,
      err.error?.type ?? 'RequestError',
      err.error?.details
    );
  }
  return data as ApiResponse<T>;
}

export const authApi = {
  /**
   * Check if a registration code is required (no users) and if one is active.
   */
  async getRegistrationCodeRequired(): Promise<
    ApiResponse<{ success: boolean; requiresCode: boolean; codeActive: boolean }>
  > {
    return requestPublic<{ success: boolean; requiresCode: boolean; codeActive: boolean }>(
      '/api/auth/registration-code-required'
    );
  },

  /**
   * Generate a registration code (only when no users exist).
   */
  async generateRegistrationCode(): Promise<ApiResponse<{ message: string }>> {
    return requestPublic<{ message: string }>('/api/auth/generate-registration-code', {
      method: 'POST',
    });
  },

  /**
   * Verify the registration code (so UI can advance to user form).
   */
  async verifyRegistrationCode(registrationCode: string): Promise<ApiResponse<{ success: boolean }>> {
    return requestPublic<{ success: boolean }>('/api/auth/verify-registration-code', {
      method: 'POST',
      body: JSON.stringify({ registrationCode }),
    });
  },
};

// ============================================================================
// User preferences (theme, date_format)
// ============================================================================

export type UserPreferences = { theme: string; date_format: string };

export const preferencesApi = {
  async get(): Promise<ApiResponse<UserPreferences>> {
    return request<UserPreferences>('/api/users/me/preferences');
  },

  async update(body: { theme?: string; date_format?: string }): Promise<ApiResponse<UserPreferences>> {
    return request<UserPreferences>('/api/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
};

// ============================================================================
// Families & Invites
// ============================================================================

// Users "me" onboarding (no dedicated usersApi namespace; used by AuthContext / Welcome)
export async function completeOnboarding(): Promise<ApiResponse<{ onboarding_completed: boolean }>> {
  return request<{ onboarding_completed: boolean }>('/api/users/me/onboarding', {
    method: 'PATCH',
    body: JSON.stringify({ onboarding_completed: true }),
  });
}

export const familiesApi = {
  async getAll(): Promise<ApiResponse<Family[]>> {
    return request<Family[]>('/api/families');
  },

  async create(name: string): Promise<ApiResponse<Family>> {
    return request<Family>('/api/families', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async updateFamily(familyId: number, name: string): Promise<void> {
    await request<void>(`/api/families/${familyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async deleteFamily(familyId: number): Promise<void> {
    await request<void>(`/api/families/${familyId}`, {
      method: 'DELETE',
    });
  },

  async getMembers(familyId: number): Promise<ApiResponse<FamilyMember[]>> {
    return request<FamilyMember[]>(`/api/families/${familyId}/members`);
  },

  async getInvites(familyId: number): Promise<ApiResponse<FamilyInvite[]>> {
    return request<FamilyInvite[]>(`/api/families/${familyId}/invites`);
  },

  async updateMemberRole(
    familyId: number,
    userId: number,
    role: 'parent' | 'read_only'
  ): Promise<ApiResponse<{ user_id: number; role: string }>> {
    return request<{ user_id: number; role: string }>(
      `/api/families/${familyId}/members/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }
    );
  },

  async removeMember(familyId: number, userId: number): Promise<void> {
    await request<void>(`/api/families/${familyId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  async createInvite(
    familyId: number,
    role: 'parent' | 'read_only'
  ): Promise<ApiResponse<CreateInviteResponse>> {
    return request<CreateInviteResponse>(`/api/families/${familyId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async revokeInvite(familyId: number, inviteId: number): Promise<void> {
    await request<void>(`/api/families/${familyId}/invites/${inviteId}`, {
      method: 'DELETE',
    });
  },
};

export const invitesApi = {
  async accept(token: string): Promise<
    ApiResponse<{ success: boolean; family_id: number; family_name: string; role: string }>
  > {
    return request<{ success: boolean; family_id: number; family_name: string; role: string }>(
      '/api/invites/accept',
      {
        method: 'POST',
        body: JSON.stringify({ token }),
      }
    );
  },
};

// ============================================================================
// Admin API (instance admin only)
// ============================================================================

export const adminApi = {
  async getConfig(): Promise<ApiResponse<AdminConfig>> {
    return request<AdminConfig>('/api/admin/config');
  },

  async updateConfig(body: { log_level: 'info' | 'debug' }): Promise<ApiResponse<AdminConfig>> {
    return request<AdminConfig>('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async getLogs(params: {
    level?: ('info' | 'debug' | 'warn' | 'error')[];
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<AdminLogsResponse>> {
    const search = new URLSearchParams();
    if (params.level?.length) {
      params.level.forEach((l) => search.append('level', l));
    }
    if (params.limit != null) search.set('limit', String(params.limit));
    if (params.offset != null) search.set('offset', String(params.offset));
    const q = search.toString();
    return request<AdminLogsResponse>(`/api/admin/logs${q ? `?${q}` : ''}`);
  },
};

export const adminUsersApi = {
  async getAll(): Promise<ApiResponse<AdminUser[]>> {
    return request<AdminUser[]>('/api/users');
  },

  async getById(id: number): Promise<ApiResponse<AdminUserDetail>> {
    return request<AdminUserDetail>(`/api/users/${id}`);
  },

  async setInstanceAdmin(userId: number, isInstanceAdmin: boolean): Promise<ApiResponse<{ success: boolean; is_instance_admin: boolean }>> {
    return request<{ success: boolean; is_instance_admin: boolean }>(`/api/users/${userId}/instance-admin`, {
      method: 'PUT',
      body: JSON.stringify({ is_instance_admin: isInstanceAdmin }),
    });
  },

  async changePassword(userId: number, newPassword: string): Promise<ApiResponse<{ success: boolean }>> {
    return request<{ success: boolean }>(`/api/users/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },
};

// ============================================================================
// Health Check
// ============================================================================

export const healthApi = {
  /**
   * Check API health
   */
  async check(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  },
};
