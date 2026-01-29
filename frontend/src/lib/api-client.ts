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
  MedicalEvent,
  CreateMedicalEventInput,
  UpdateMedicalEventInput,
  MeasurementAttachment,
  PaginationParams,
  DateRangeParams,
  MedicalEventFilters,
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
} from '../types/api';

// Base API URL - use relative URL in production (served by unified app), absolute for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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

/**
 * Get access token from localStorage
 */
function getAccessToken(): string | null {
  return localStorage.getItem('trajectory_access_token');
}

/**
 * Make HTTP request with error handling and authentication
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add authorization header if token exists
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Handle 204 No Content responses (common for DELETE operations)
    if (response.status === 204) {
      return { data: undefined as any } as ApiResponse<T>;
    }

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      
      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401 && accessToken) {
        // Clear tokens on unauthorized response
        localStorage.removeItem('trajectory_access_token');
        localStorage.removeItem('trajectory_refresh_token');
        localStorage.removeItem('trajectory_user');
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
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
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    
    // Network or parsing errors
    throw new ApiClientError(
      'Failed to communicate with server',
      0,
      'NetworkError',
      error
    );
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
    await fetch(`${API_BASE_URL}/api/children/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Upload avatar for child
   */
  async uploadAvatar(childId: number, file: File): Promise<ApiResponse<{ avatar: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(
      `${API_BASE_URL}/api/children/${childId}/avatar`,
      {
        method: 'POST',
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
   * Get avatar URL for child
   */
  getAvatarUrl(avatar: string): string {
    return `${API_BASE_URL}/api/avatars/${avatar}`;
  },

  /**
   * Get default avatar URL based on gender
   */
  getDefaultAvatarUrl(gender: string): string {
    if (gender === 'male') {
      return '/avatars/default-boy.svg';
    } else {
      return '/avatars/default-girl.svg';
    }
  },

  /**
   * Delete avatar for child
   */
  async deleteAvatar(childId: number): Promise<void> {
    await fetch(`${API_BASE_URL}/api/children/${childId}/avatar`, {
      method: 'DELETE',
    });
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

    const response = await fetch(`${API_BASE_URL}/api/children/${childId}/attachments`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
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
   * Get download URL for a child attachment
   */
  getAttachmentDownloadUrl(attachmentId: number): string {
    return `${API_BASE_URL}/api/attachments/${attachmentId}`;
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
    await fetch(`${API_BASE_URL}/api/measurements/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Medical Events API
// ============================================================================

export const medicalEventsApi = {
  /**
   * Get all medical events for a child with pagination and filtering
   */
  async getByChild(
    childId: number,
    params?: PaginationParams & MedicalEventFilters
  ): Promise<ApiResponse<MedicalEvent[]>> {
    const queryString = buildQueryString(params || {});
    return request<MedicalEvent[]>(`/api/children/${childId}/medical-events${queryString}`);
  },

  /**
   * Get a single medical event by ID
   */
  async getById(id: number): Promise<ApiResponse<MedicalEvent>> {
    return request<MedicalEvent>(`/api/medical-events/${id}`);
  },

  /**
   * Create a new medical event
   */
  async create(
    childId: number,
    input: CreateMedicalEventInput
  ): Promise<ApiResponse<MedicalEvent>> {
    return request<MedicalEvent>(`/api/children/${childId}/medical-events`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /**
   * Update a medical event
   */
  async update(
    id: number,
    input: UpdateMedicalEventInput
  ): Promise<ApiResponse<MedicalEvent>> {
    return request<MedicalEvent>(`/api/medical-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  /**
   * Delete a medical event
   */
  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/api/medical-events/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Measurement Attachments
// ============================================================================

export const attachmentsApi = {
  /**
   * Upload attachment to measurement
   */
  async upload(measurementId: number, file: File): Promise<ApiResponse<MeasurementAttachment>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_BASE_URL}/api/measurements/${measurementId}/attachments`,
      {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - let browser set it with boundary
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
   * Get all attachments for a measurement
   */
  async getByMeasurement(
    measurementId: number
  ): Promise<ApiResponse<MeasurementAttachment[]>> {
    return request<MeasurementAttachment[]>(
      `${API_BASE_URL}/api/measurements/${measurementId}/attachments`
    );
  },

  /**
   * Get attachment download URL
   */
  getDownloadUrl(attachmentId: number): string {
    return `${API_BASE_URL}/api/attachments/${attachmentId}`;
  },

  /**
   * Delete attachment
   */
  async delete(attachmentId: number): Promise<void> {
    await fetch(`${API_BASE_URL}/api/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Visits API (Unified wellness and sick visits)
// ============================================================================

export const visitsApi = {
  /**
   * Get all visits with filtering
   */
  async getAll(params?: {
    child_id?: number;
    visit_type?: VisitType;
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

    // Manually handle FormData upload
    const response = await fetch(`${API_BASE_URL}/api/visits/${visitId}/attachments`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiClientError(error.error?.message || 'Upload failed', response.status, 'UploadError');
    }

    const result = await response.json();
    return result as ApiResponse<VisitAttachment>;
  },

  /**
   * Get attachment download URL
   */
  getAttachmentDownloadUrl(attachmentId: number): string {
    return `${API_BASE_URL}/api/attachments/${attachmentId}`;
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
