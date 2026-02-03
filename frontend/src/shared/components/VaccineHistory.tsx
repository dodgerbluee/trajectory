import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiPencil, HiTrash, HiDownload } from 'react-icons/hi';
import type { Visit, ChildAttachment } from '../../types/api';
import { formatDate } from '../../lib/date-utils';
import { childrenApi, ApiClientError } from '../../lib/api-client';
import FileUpload from './FileUpload';
import { useFamilyPermissions } from '../../contexts/FamilyPermissionsContext';
import LoadingSpinner from './LoadingSpinner';
import loadingStyles from './LoadingSpinner.module.css';
import VaccineSidebar from './VaccineSidebar';
import styles from './VaccineHistory.module.css';
import visitsLayout from '../styles/VisitsLayout.module.css';

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
  const { canEdit } = useFamilyPermissions();
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
      <div className={visitsLayout.emptyState}>
        <p>No vaccines recorded yet. Vaccines will appear here when added to wellness visits.</p>
      </div>
    );
  }

  const totalDoses = vaccineRecords.reduce((sum, record) => sum + record.dates.length, 0);

  return (
    <div className={visitsLayout.pageLayout}>
      <VaccineSidebar
        vaccineTypesCount={vaccineRecords.length}
        totalDosesCount={totalDoses}
        reportsCount={vaccineReports.length}
      />
      <main className={visitsLayout.main}>
        <div className={styles.container}>
          <div className={styles.list}>
        {vaccineRecords.map((record) => (
          <div key={record.name} className={styles.item}>
            <div className={styles.header}>
              <div className={styles.name}>
                <span className={styles.icon}>💉</span>
                <span className={styles.nameText}>{record.name}</span>
              </div>
              <div className={styles.count}>
                {record.dates.length} {record.dates.length === 1 ? 'dose' : 'doses'}
              </div>
            </div>
            <div className={styles.dates}>
              {record.dates.map((dose, index) => (
                <Link
                  key={`${dose.visitId}-${index}`}
                  to={`/visits/${dose.visitId}`}
                  className={styles.doseItem}
                >
                  <span className={styles.doseNumber}>#{index + 1}</span>
                  <span className={styles.doseDate}>{formatDate(dose.date)}</span>
                  <span className={styles.doseArrow}>→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loadingReports ? (
        <div className={styles.reportsLoading}>
          <LoadingSpinner message="Loading vaccine reports..." />
        </div>
      ) : vaccineReports.length > 0 ? (
        <div className={styles.reportsSection}>
          <h4 className={styles.reportsTitle}>Vaccine Report Documents</h4>
          <div className={styles.reportsList}>
            {vaccineReports.map((doc) => (
              <div key={doc.id} className={styles.reportItem}>
                <div className={styles.reportIcon}>{getFileIcon(doc.file_type)}</div>
                
                <div className={styles.reportInfo}>
                  {editingId === doc.id ? (
                    <div className={styles.reportEditForm}>
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
                        className={styles.reportEditInput}
                        autoFocus
                      />
                      <div className={styles.reportEditActions}>
                        <button
                          type="button"
                          onClick={() => handleEditSave(doc.id)}
                          className={`${styles.btnIconSmall} ${styles.btnSave}`}
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={handleEditCancel}
                          className={`${styles.btnIconSmall} ${styles.btnCancel}`}
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
                        className={styles.reportFilenameLink}
                        title="Click to open document"
                      >
                        {doc.original_filename}
                      </button>
                      <div className={styles.reportMeta}>
                        <span className={styles.reportMetaItem}>{formatFileSize(doc.file_size)}</span>
                        <span className={styles.reportMetaSeparator}>•</span>
                        <span className={styles.reportMetaItem}>{formatDate(doc.created_at)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className={styles.reportActions}>
                  {editingId === doc.id ? null : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc.id, doc.original_filename)}
                        className={`${styles.btnIconAction} ${styles.btnDownload}`}
                        title="Download document"
                      >
                        <HiDownload />
                      </button>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditStart(doc)}
                            className={`${styles.btnIconAction} ${styles.btnEdit}`}
                            title="Rename document"
                          >
                            <HiPencil />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className={`${styles.btnIconAction} ${styles.btnDelete}`}
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
        </div>
      ) : null}

      {canEdit && (
      <div className={styles.uploadSection}>
        <h4 className={styles.uploadTitle}>Upload Vaccine Report</h4>
        <p className={styles.uploadDescription}>
          Upload vaccine report documents (PDFs or images) to keep track of official vaccination records.
        </p>
        <FileUpload onUpload={handleFileUpload} disabled={uploading} />
      </div>
      )}
        </div>
      </main>
    </div>
  );
}

export default VaccineHistory;
