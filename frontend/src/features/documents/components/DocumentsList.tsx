/**
 * Documents List Component
 * Displays all visit attachments for a child with rename and delete functionality
 */

import { useState } from 'react';
import { HiPencil, HiTrash, HiDownload } from 'react-icons/hi';
import { LuFileText, LuImage } from 'react-icons/lu';
import type { VisitAttachment, ChildAttachment, Visit } from '@shared/types/api';
import { visitsApi, childrenApi, ApiClientError } from '@lib/api-client';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';
// formatDate not needed here; document entries show visit type and title instead of date
import LoadingSpinner from '@shared/components/LoadingSpinner';
import DocumentsSummary from './DocumentsSummary';
import loadingStyles from '@shared/components/LoadingSpinner.module.css';
import t from '@shared/components/TimelineItem.module.css';
import tl from '@shared/components/TimelineList.module.css';
import Card from '@shared/components/Card';
import d from './DocumentsList.module.css';

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
  const { canEdit } = useFamilyPermissions();
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <LuImage className={d.documentFileIcon} />;
    if (fileType === 'application/pdf') return <LuFileText className={d.documentFileIcon} />;
    return <LuFileText className={d.documentFileIcon} />;
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
      <Card>
        <p className={tl.empty}>
          No documents found. Documents can be attached to visits or uploaded as vaccine reports.
        </p>
      </Card>
    );
  }

  return (
    <div className={d.list}>
      {showHeader && (
        <DocumentsSummary
          total={totalDocsCount}
          visitDocuments={visitDocsCount}
          childDocuments={childDocsCount}
        />
      )}
      {documents.map((doc) => (
        <div key={`${doc.type}-${doc.id}`} className={`${d.item} ${t.item}`}>
          <div className={`${d.icon} ${t.icon}`}>{getFileIcon(doc.file_type)}</div>

          <div className={`${d.info} ${t.content}`}>
            {editingId === doc.id ? (
              <div className={d.editForm}>
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
                  className={d.editInput}
                  autoFocus
                />
                <div className={d.editActions}>
                  <button
                    type="button"
                    onClick={() => handleEditSave(doc.id, doc.type)}
                    className={`${d.btnIconSmall} ${d.btnSave}`}
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className={`${d.btnIconSmall} ${d.btnCancel}`}
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className={t.headerCompact}>
                <div className={t.main}>
                  <div className={`${t.labelRow} ${t.wellnessSingleLine}`}>
                    <button
                      type="button"
                      onClick={() => handleClick(doc.id, doc.type)}
                      className={d.filenameLink}
                      title="Click to open document"
                    >
                      {doc.original_filename}
                    </button>

                    <div className={`${t.badgesGroup}`}>
                      {doc.type === 'visit' ? (
                        <>
                          <span className={t.badge}>{doc.visit.visit_type === 'wellness' ? 'Wellness' : doc.visit.visit_type === 'sick' ? 'Sick' : doc.visit.visit_type === 'vision' ? 'Vision' : 'Injury'}</span>
                          {doc.visit.visit_type === 'wellness' && doc.visit.title && (
                            <span className={t.wellnessTitleBadge}>{doc.visit.title}</span>
                          )}
                        </>
                      ) : (
                        <span className={t.badge}>Vaccine Report</span>
                      )}

                      <span className={`${t.badge} ${d.fileSizeBadge}`}>{formatFileSize(doc.file_size)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={d.actions}>
            {editingId === doc.id ? null : (
              <>
                <button
                  type="button"
                  onClick={() => handleDownload(doc.id, doc.original_filename, doc.type)}
                  className={`${d.btnIconAction} ${d.btnDownload}`}
                  title="Download document"
                >
                  <HiDownload />
                </button>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEditStart(doc)}
                      className={`${d.btnIconAction} ${d.btnEdit}`}
                      title="Rename document"
                    >
                      <HiPencil />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.type)}
                      disabled={deletingId === doc.id}
                      className={`${d.btnIconAction} ${d.btnDelete}`}
                      title="Delete document"
                    >
                      {deletingId === doc.id ? (
                        <div className={loadingStyles.btnSpinnerWrapper}>
                          <LoadingSpinner message="" />
                        </div>
                      ) : (
                        <HiTrash />
                      )}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DocumentsList;
