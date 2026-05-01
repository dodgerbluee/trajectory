import { useState, useEffect, useCallback } from 'react';
import { visitsApi, peopleApi, ApiClientError } from '@lib/api-client';
import type { Visit, Person, VisitAttachment } from '@shared/types/api';
import type { AuditHistoryEvent } from '@shared/types/api';

/**
 * Hook to manage the full state of a visit detail page.
 * Handles loading visit, person, attachments, and audit history.
 */
export function useVisitDetail(visitId: number | undefined) {
  // Core data state
  const [visit, setVisit] = useState<Visit | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [attachments, setAttachments] = useState<VisitAttachment[]>([]);
  const [history, setHistory] = useState<AuditHistoryEvent[]>([]);

  // Loading/error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // UI state
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  /**
   * Load visit details, person info, attachments, and history
   */
  const loadVisitDetails = useCallback(async () => {
    if (!visitId) return;

    try {
      setLoading(true);
      setError(null);

      // Load visit first to get person ID
      const visitResponse = await visitsApi.getById(visitId);
      const visitData = visitResponse.data;
      setVisit(visitData);

      // Then load person data
      const personResponse = await peopleApi.getById(visitData.person_id);
      setPerson(personResponse.data);

      // Load attachments and history in parallel
      await Promise.all([
        loadAttachmentsList(visitId),
        loadHistoryList(visitId),
      ]);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load visit');
      }
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  /**
   * Load attachments for this visit
   */
  const loadAttachmentsList = useCallback(async (id: number) => {
    try {
      setLoadingAttachments(true);
      const response = await visitsApi.getAttachments(id);
      setAttachments(response.data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  }, []);

  /**
   * Load audit history for this visit
   */
  const loadHistoryList = useCallback(async (id: number) => {
    try {
      setLoadingHistory(true);
      const response = await visitsApi.getHistory(id);
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load history:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  /**
   * Delete an attachment and update history
   */
  const deleteAttachment = useCallback(
    (attachmentId: number) => {
      const updated = attachments.filter((a) => a.id !== attachmentId);
      setAttachments(updated);

      // Reload history to reflect the deletion
      if (visitId) {
        loadHistoryList(visitId);
      }
    },
    [attachments, visitId, loadHistoryList]
  );

  /**
   * Delete the visit entirely
   */
  const deleteVisit = useCallback(async () => {
    if (!visitId) return;

    setDeleting(true);
    try {
      await visitsApi.delete(visitId);
      setNotification({
        message: 'Visit deleted successfully',
        type: 'success',
      });
      return true; // Signal success to caller
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to delete visit', type: 'error' });
      }
      return false; // Signal failure
    } finally {
      setDeleting(false);
    }
  }, [visitId]);

  // Load visit details on mount or when ID changes
  useEffect(() => {
    loadVisitDetails();
  }, [loadVisitDetails]);

  return {
    // Data
    visit,
    person,
    attachments,
    history,
    // Loading states
    loading,
    error,
    loadingAttachments,
    loadingHistory,
    deleting,
    notification,
    // Actions
    loadVisitDetails,
    deleteAttachment,
    deleteVisit,
    setNotification,
  };
}
