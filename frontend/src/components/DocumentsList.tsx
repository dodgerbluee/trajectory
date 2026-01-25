/**
 * Documents List Component
 * Displays all visit attachments for a child with rename and delete functionality
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiPencil, HiTrash, HiDownload } from 'react-icons/hi';
import type { VisitAttachment, ChildAttachment, Visit } from '../types/api';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import { formatDate } from '../lib/date-utils';
import LoadingSpinner from './LoadingSpinner';

interface DocumentWithVisit extends VisitAttachment {
  visit: Visit;
  type: 'visit';
}

interface DocumentChildAttachment extends ChildAttachment {
  type: 'child';
}

type Document = DocumentWithVisit | DocumentChildAttachment;

interface DocumentsListProps {
  documents: Document[];
  onUpdate: () => void;
  showHeader?: boolean;
}

function DocumentsList({ documents, onUpdate, showHeader = false }: DocumentsListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleEditStart = (doc: Document) => {
    setEditingId(doc.id);
    setEditValue(doc.original_filename);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditSave = async (id: number, docType: 'visit' | 'child') => {
    if (!editValue.trim()) {
      alert('Filename cannot be empty');
      return;
    }

    try {
      if (docType === 'visit') {
        await visitsApi.updateAttachment(id, editValue.trim());
      } else {
        await childrenApi.updateAttachment(id, editValue.trim());
      }
      setEditingId(null);
      setEditValue('');
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) {
        alert(`Failed to rename: ${error.message}`);
      } else {
        alert('Failed to rename document');
      }
    }
  };

  const handleDelete = async (id: number, docType: 'visit' | 'child') => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeletingId(id);
      if (docType === 'visit') {
        await visitsApi.deleteAttachment(id);
      } else {
        await childrenApi.deleteAttachment(id);
      }
      onUpdate();
    } catch (error) {
      console.error('Failed to delete document:', error);
      if (error instanceof ApiClientError) {
        alert(`Failed to delete document: ${error.message}`);
      } else {
        alert('Failed to delete document');
      }
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

  const handleClick = (attachmentId: number, docType: 'visit' | 'child') => {
    const url = docType === 'visit' 
      ? visitsApi.getAttachmentDownloadUrl(attachmentId)
      : childrenApi.getAttachmentDownloadUrl(attachmentId);
    window.open(url, '_blank');
  };

  const handleDownload = (attachmentId: number, filename: string, docType: 'visit' | 'child') => {
    const url = docType === 'visit'
      ? visitsApi.getAttachmentDownloadUrl(attachmentId)
      : childrenApi.getAttachmentDownloadUrl(attachmentId);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visitDocsCount = documents.filter(d => d.type === 'visit').length;
  const childDocsCount = documents.filter(d => d.type === 'child').length;
  const totalDocsCount = documents.length;

  if (documents.length === 0) {
    return (
      <div className="documents-empty">
        <p>No documents found. Documents can be attached to visits or uploaded as vaccine reports.</p>
      </div>
    );
  }

  return (
    <div className="documents-list">
      {showHeader && (
        <div className="document-history-summary">
          <div className="document-history-stat">
            <span className="document-history-label">Total Documents:</span>
            <span className="document-history-value">{totalDocsCount}</span>
          </div>
          <div className="document-history-stat">
            <span className="document-history-label">Visit Documents:</span>
            <span className="document-history-value">{visitDocsCount}</span>
          </div>
          <div className="document-history-stat">
            <span className="document-history-label">Child Documents:</span>
            <span className="document-history-value">{childDocsCount}</span>
          </div>
        </div>
      )}
      {documents.map((doc) => (
        <div key={`${doc.type}-${doc.id}`} className="document-item">
          <div className="document-icon">{getFileIcon(doc.file_type)}</div>
          
          <div className="document-info">
            {editingId === doc.id ? (
              <div className="document-edit-form">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEditSave(doc.id, doc.type);
                    } else if (e.key === 'Escape') {
                      handleEditCancel();
                    }
                  }}
                  className="document-edit-input"
                  autoFocus
                />
                <div className="document-edit-actions">
                  <button
                    type="button"
                    onClick={() => handleEditSave(doc.id, doc.type)}
                    className="btn-icon-small btn-save"
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="btn-icon-small btn-cancel"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleClick(doc.id, doc.type)}
                  className="document-filename-link"
                  title="Click to open document"
                >
                  {doc.original_filename}
                </button>
                <div className="document-meta">
                  <span className="document-meta-item">{formatFileSize(doc.file_size)}</span>
                  <span className="document-meta-separator">•</span>
                  {doc.type === 'visit' ? (
                    <>
                      <Link 
                        to={`/visits/${doc.visit.id}`}
                        className="document-visit-link"
                      >
                        {formatDate(doc.visit.visit_date)}
                      </Link>
                      <span className="document-meta-separator">•</span>
                      <span className="document-meta-item">
                        {doc.visit.visit_type === 'wellness' ? 'Wellness Visit' : 
                         doc.visit.visit_type === 'sick' ? 'Sick Visit' : 
                         doc.visit.visit_type === 'vision' ? 'Vision Visit' :
                         'Injury Visit'}
                      </span>
                      {doc.visit.visit_type === 'wellness' && doc.visit.title && (
                        <>
                          <span className="document-meta-separator">•</span>
                          <span className="wellness-title-badge">{doc.visit.title}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="document-meta-item">Vaccine Report</span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="document-actions">
            {editingId === doc.id ? null : (
              <>
                <button
                  type="button"
                  onClick={() => handleDownload(doc.id, doc.original_filename, doc.type)}
                  className="btn-icon-action btn-download"
                  title="Download document"
                >
                  <HiDownload />
                </button>
                <button
                  type="button"
                  onClick={() => handleEditStart(doc)}
                  className="btn-icon-action btn-edit"
                  title="Rename document"
                >
                  <HiPencil />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id, doc.type)}
                  disabled={deletingId === doc.id}
                  className="btn-icon-action btn-delete"
                  title="Delete document"
                >
                  {deletingId === doc.id ? (
                    <div className="btn-spinner-wrapper">
                      <LoadingSpinner message="" />
                    </div>
                  ) : (
                    <HiTrash />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DocumentsList;
