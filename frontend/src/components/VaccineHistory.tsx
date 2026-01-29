import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiPencil, HiTrash, HiDownload } from 'react-icons/hi';
import type { Visit, ChildAttachment } from '../types/api';
import { formatDate } from '../lib/date-utils';
import { childrenApi, ApiClientError } from '../lib/api-client';
import FileUpload from './FileUpload';
import LoadingSpinner from './LoadingSpinner';
import VaccineSidebar from './VaccineSidebar';

interface VaccineHistoryProps {
  visits: Visit[];
  childId: number;
  onUploadSuccess?: () => void;
}

interface VaccineRecord {
  name: string;
  dates: Array<{
    date: string;
    visitId: number;
    visitDate: string;
  }>;
}

function VaccineHistory({ visits, childId, onUploadSuccess }: VaccineHistoryProps) {
  const [uploading, setUploading] = useState(false);
  const [vaccineReports, setVaccineReports] = useState<ChildAttachment[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadVaccineReports();
  }, [childId]);

  const loadVaccineReports = async () => {
    try {
      setLoadingReports(true);
      const response = await childrenApi.getAttachments(childId);
      // Filter only vaccine_report documents
      const reports = response.data.filter(att => att.document_type === 'vaccine_report');
      setVaccineReports(reports);
    } catch (error) {
      console.error('Failed to load vaccine reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      await childrenApi.uploadAttachment(childId, file, 'vaccine_report');
      await loadVaccineReports(); // Reload reports after upload
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        alert(`Failed to upload: ${error.message}`);
      } else {
        alert('Failed to upload vaccine report');
      }
      throw error; // Re-throw so FileUpload can handle it
    } finally {
      setUploading(false);
    }
  };

  const handleEditStart = (doc: ChildAttachment) => {
    setEditingId(doc.id);
    setEditValue(doc.original_filename);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditSave = async (id: number) => {
    if (!editValue.trim()) {
      alert('Filename cannot be empty');
      return;
    }

    try {
      await childrenApi.updateAttachment(id, editValue.trim());
      setEditingId(null);
      setEditValue('');
      await loadVaccineReports();
    } catch (error) {
      if (error instanceof ApiClientError) {
        alert(`Failed to rename: ${error.message}`);
      } else {
        alert('Failed to rename document');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this vaccine report?')) {
      return;
    }

    try {
      setDeletingId(id);
      await childrenApi.deleteAttachment(id);
      await loadVaccineReports();
      if (onUploadSuccess) {
        onUploadSuccess(); // Refresh documents tab too
      }
    } catch (error) {
      console.error('Failed to delete vaccine report:', error);
      if (error instanceof ApiClientError) {
        alert(`Failed to delete: ${error.message}`);
      } else {
        alert('Failed to delete vaccine report');
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

  const handleClick = (attachmentId: number) => {
    window.open(childrenApi.getAttachmentDownloadUrl(attachmentId), '_blank');
  };

  const handleDownload = (attachmentId: number, filename: string) => {
    const url = childrenApi.getAttachmentDownloadUrl(attachmentId);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Group vaccines by name and collect all dates
  const vaccineRecords = useMemo(() => {
    const vaccineMap = new Map<string, VaccineRecord['dates']>();

    visits.forEach(visit => {
      if (visit.vaccines_administered && visit.vaccines_administered.length > 0) {
        visit.vaccines_administered.forEach(vaccine => {
          if (!vaccineMap.has(vaccine)) {
            vaccineMap.set(vaccine, []);
          }
          vaccineMap.get(vaccine)!.push({
            date: visit.visit_date,
            visitId: visit.id,
            visitDate: visit.visit_date,
          });
        });
      }
    });

    // Convert to array and sort by vaccine name
    const records: VaccineRecord[] = Array.from(vaccineMap.entries())
      .map(([name, dates]) => ({
        name,
        dates: dates.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return records;
  }, [visits]);

  if (vaccineRecords.length === 0) {
    return (
      <div className="empty-state">
        <p>No vaccines recorded yet. Vaccines will appear here when added to wellness visits.</p>
      </div>
    );
  }

  const totalDoses = vaccineRecords.reduce((sum, record) => sum + record.dates.length, 0);

  return (
    <div className="visits-page-layout">
      <VaccineSidebar
        vaccineTypesCount={vaccineRecords.length}
        totalDosesCount={totalDoses}
        reportsCount={vaccineReports.length}
      />
      <main className="visits-main">
        <div className="vaccine-history-container">
          <div className="vaccine-history-list">
        {vaccineRecords.map((record) => (
          <div key={record.name} className="vaccine-history-item">
            <div className="vaccine-history-header">
              <div className="vaccine-history-name">
                <span className="vaccine-icon">💉</span>
                <span className="vaccine-name-text">{record.name}</span>
              </div>
              <div className="vaccine-history-count">
                {record.dates.length} {record.dates.length === 1 ? 'dose' : 'doses'}
              </div>
            </div>
            <div className="vaccine-history-dates">
              {record.dates.map((dose, index) => (
                <Link
                  key={`${dose.visitId}-${index}`}
                  to={`/visits/${dose.visitId}`}
                  className="vaccine-dose-item"
                >
                  <span className="vaccine-dose-number">#{index + 1}</span>
                  <span className="vaccine-dose-date">{formatDate(dose.date)}</span>
                  <span className="vaccine-dose-arrow">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loadingReports ? (
        <div className="vaccine-reports-loading">
          <LoadingSpinner message="Loading vaccine reports..." />
        </div>
      ) : vaccineReports.length > 0 ? (
        <div className="vaccine-reports-section">
          <h4 className="vaccine-reports-title">Vaccine Report Documents</h4>
          <div className="vaccine-reports-list">
            {vaccineReports.map((doc) => (
              <div key={doc.id} className="vaccine-report-item">
                <div className="vaccine-report-icon">{getFileIcon(doc.file_type)}</div>
                
                <div className="vaccine-report-info">
                  {editingId === doc.id ? (
                    <div className="vaccine-report-edit-form">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditSave(doc.id);
                          } else if (e.key === 'Escape') {
                            handleEditCancel();
                          }
                        }}
                        className="vaccine-report-edit-input"
                        autoFocus
                      />
                      <div className="vaccine-report-edit-actions">
                        <button
                          type="button"
                          onClick={() => handleEditSave(doc.id)}
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
                        onClick={() => handleClick(doc.id)}
                        className="vaccine-report-filename-link"
                        title="Click to open document"
                      >
                        {doc.original_filename}
                      </button>
                      <div className="vaccine-report-meta">
                        <span className="vaccine-report-meta-item">{formatFileSize(doc.file_size)}</span>
                        <span className="vaccine-report-meta-separator">•</span>
                        <span className="vaccine-report-meta-item">{formatDate(doc.created_at)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="vaccine-report-actions">
                  {editingId === doc.id ? null : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc.id, doc.original_filename)}
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
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="btn-icon-action btn-delete"
                        title="Delete document"
                      >
                        {deletingId === doc.id ? (
                          <div className="btn-spinner-wrapper">
                            <div className="spinner"></div>
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
        </div>
      ) : null}

      <div className="vaccine-history-upload-section">
        <h4 className="vaccine-history-upload-title">Upload Vaccine Report</h4>
        <p className="vaccine-history-upload-description">
          Upload vaccine report documents (PDFs or images) to keep track of official vaccination records.
        </p>
        <FileUpload onUpload={handleFileUpload} disabled={uploading} />
      </div>
        </div>
      </main>
    </div>
  );
}

export default VaccineHistory;
