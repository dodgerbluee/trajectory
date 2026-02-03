/**
 * Visit Attachments List Component
 * Displays and manages visit attachments with single-click opening, edit, and download
 */

import { useState } from 'react';
import { HiPencil, HiTrash, HiDownload } from 'react-icons/hi';
import type { VisitAttachment } from '../../types/api';
import { visitsApi } from '../../lib/api-client';
import fu from './FileUpload.module.css';

interface VisitAttachmentsListProps {
  attachments: VisitAttachment[];
  onDelete: (id: number) => void;
  readOnly?: boolean;
  visitId?: number;
  onUpdate?: () => void;
}

function VisitAttachmentsList({ attachments, onDelete, readOnly = false, onUpdate }: VisitAttachmentsListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      setDeletingId(id);
      await visitsApi.deleteAttachment(id);
      onDelete(id);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('Failed to delete attachment');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditStart = (attachment: VisitAttachment) => {
    setEditingId(attachment.id);
    setEditName(attachment.original_filename);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleEditSave = async (id: number) => {
    if (!editName.trim()) {
      alert('Filename cannot be empty');
      return;
    }

    try {
      await visitsApi.updateAttachment(id, editName.trim());
      setEditingId(null);
      setEditName('');
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update attachment:', error);
      alert('Failed to rename attachment');
    }
  };

  const handleDownload = (attachmentId: number, filename: string) => {
    const url = visitsApi.getAttachmentDownloadUrl(attachmentId);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClick = (attachmentId: number) => {
    // Single click opens the document
    window.open(visitsApi.getAttachmentDownloadUrl(attachmentId), '_blank');
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
    return <div className={fu.attachmentsEmpty}>No attachments</div>;
  }

  return (
    <div className={fu.attachmentsListCompact}>
      {attachments.map((attachment) => {
        const isImage = attachment.file_type.startsWith('image/');
        const imageUrl = isImage ? visitsApi.getAttachmentDownloadUrl(attachment.id) : null;
        
        return (
        <div key={attachment.id} className={fu.attachmentItemCompact}>
          {isImage && imageUrl ? (
            <div className={fu.attachmentImagePreview}>
              <img 
                src={imageUrl} 
                alt={attachment.original_filename}
                className={fu.attachmentPreviewImg}
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const iconDiv = document.createElement('div');
                    iconDiv.className = fu.attachmentIconCompact;
                    iconDiv.textContent = getFileIcon(attachment.file_type);
                    parent.appendChild(iconDiv);
                  }
                }}
              />
            </div>
          ) : (
            <div className={fu.attachmentIconCompact}>{getFileIcon(attachment.file_type)}</div>
          )}
          
          {editingId === attachment.id ? (
            <div className={fu.attachmentEditForm}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={fu.attachmentEditInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEditSave(attachment.id);
                  } else if (e.key === 'Escape') {
                    handleEditCancel();
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleEditSave(attachment.id)}
                className={fu.btnIconSmall}
                title="Save"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={handleEditCancel}
                className={fu.btnIconSmall}
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <div className={fu.attachmentInfoCompact}>
                <button
                  type="button"
                  onClick={() => handleClick(attachment.id)}
                  className={fu.attachmentFilenameLinkCompact}
                  title="Click to open document"
                >
                  {attachment.original_filename}
                </button>
                <div className={fu.attachmentMetaCompact}>
                  {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
                </div>
              </div>

              {!readOnly && (
                <div className={fu.attachmentActionsCompact}>
                  <button
                    type="button"
                    onClick={() => handleDownload(attachment.id, attachment.original_filename)}
                    className={fu.btnIconSmall}
                    title="Download"
                  >
                    <HiDownload />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditStart(attachment)}
                    className={fu.btnIconSmall}
                    title="Rename"
                  >
                    <HiPencil />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(attachment.id)}
                    disabled={deletingId === attachment.id}
                    className={`${fu.btnIconSmall} ${fu.btnIconSmallDanger}`}
                    title="Delete"
                  >
                    {deletingId === attachment.id ? '⏳' : <HiTrash />}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        );
      })}
    </div>
  );
}

export default VisitAttachmentsList;
