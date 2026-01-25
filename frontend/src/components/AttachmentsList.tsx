/**
 * Attachments List Component
 * Displays and manages measurement attachments
 */

import { useState } from 'react';
import type { MeasurementAttachment } from '../types/api';
import { attachmentsApi } from '../lib/api-client';

interface AttachmentsListProps {
  attachments: MeasurementAttachment[];
  onDelete: (id: number) => void;
  readOnly?: boolean;
}

function AttachmentsList({ attachments, onDelete, readOnly = false }: AttachmentsListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      setDeletingId(id);
      await attachmentsApi.delete(id);
      onDelete(id);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('Failed to delete attachment');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    return '📎';
  };

  if (attachments.length === 0) {
    return <div className="attachments-empty">No attachments</div>;
  }

  return (
    <div className="attachments-list">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="attachment-item">
          <div className="attachment-icon">{getFileIcon(attachment.file_type)}</div>
          
          <div className="attachment-info">
            <a
              href={attachmentsApi.getDownloadUrl(attachment.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="attachment-filename"
            >
              {attachment.original_filename}
            </a>
            <div className="attachment-meta">
              {formatFileSize(attachment.file_size)} • 
              {new Date(attachment.created_at).toLocaleDateString()}
            </div>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => handleDelete(attachment.id)}
              disabled={deletingId === attachment.id}
              className="btn-delete-attachment"
              title="Delete attachment"
            >
              {deletingId === attachment.id ? '⏳' : '🗑️'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default AttachmentsList;
