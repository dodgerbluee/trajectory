import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Visit, Child, VisitAttachment } from '../types/api';
import { formatDate, safeFormatDateTime } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import Notification from '../components/Notification';
import VisitAttachmentsList from '../components/VisitAttachmentsList';
import Tabs from '../components/Tabs';
import { useAuth } from '../contexts/AuthContext';
import { useFamilyPermissions } from '../contexts/FamilyPermissionsContext';
import { VisionRefractionCard } from '../components/VisionRefractionCard';
import AuditDiffView from '../components/AuditDiffView';
import type { AuditHistoryEvent } from '../types/api';

function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { canEdit } = useFamilyPermissions();
  
  const [visit, setVisit] = useState<Visit | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [attachments, setAttachments] = useState<VisitAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [activeTab, setActiveTab] = useState<'visit' | 'history' | 'attachments'>('visit');

  // Reset active tab if attachments tab is removed and we're on it
  useEffect(() => {
    if (activeTab === 'attachments' && attachments.length === 0) {
      setActiveTab('visit');
    }
  }, [attachments.length, activeTab]);
  const [history, setHistory] = useState<AuditHistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (id) {
      loadVisit();
    }
  }, [id, location.key]);

  const loadVisit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const visitResponse = await visitsApi.getById(parseInt(id!));
      setVisit(visitResponse.data);

      const childResponse = await childrenApi.getById(visitResponse.data.child_id);
      setChild(childResponse.data);
      
      // Load attachments and history
      await Promise.all([
        loadAttachments(parseInt(id!)),
        loadHistory(parseInt(id!))
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
  };

  const loadAttachments = async (visitId: number) => {
    try {
      setLoadingAttachments(true);
      const response = await visitsApi.getAttachments(visitId);
      setAttachments(response.data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const loadHistory = async (visitId: number) => {
    try {
      setLoadingHistory(true);
      const response = await visitsApi.getHistory(visitId);
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load history:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAttachmentDelete = (attachmentId: number) => {
    const updatedAttachments = attachments.filter(a => a.id !== attachmentId);
    setAttachments(updatedAttachments);
    
    // If we deleted the last attachment and we're on the attachments tab, switch to visit tab
    if (updatedAttachments.length === 0 && activeTab === 'attachments') {
      setActiveTab('visit');
    }
    
    // Reload history to reflect attachment deletion
    if (id) {
      loadHistory(parseInt(id));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this visit? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await visitsApi.delete(parseInt(id!));
      setNotification({ message: 'Visit deleted successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/children/${visit?.child_id}`);
      }, 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to delete visit', type: 'error' });
      }
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading visit..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadVisit} />;
  }

  if (!visit || !child) {
    return <ErrorMessage message="Visit not found" />;
  }

  return (
    <div className="page-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Card>
        <div className="visit-detail-body">
          {/* Header with Back button and Actions */}
          <div className="visit-detail-header">
            <Link to={`/children/${visit.child_id}`} className="breadcrumb">
              ← Back to {child.name}
            </Link>
            {canEdit && (
            <div className="visit-detail-actions">
              <Link 
                to={`/visits/${visit.id}/edit`}
                state={{ childId: visit.child_id, fromChild: (location.state as any)?.fromChild || false }}
              >
                <Button variant="secondary" size="sm">Edit Visit</Button>
              </Link>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Visit'}
              </Button>
            </div>
            )}
          </div>

          {/* Visit Header */}
          <div>
            <h2 className="visit-header-title">
              {visit.visit_type === 'wellness' ? 'Wellness Visit' : 
               visit.visit_type === 'sick' ? 'Sick Visit' : 
               visit.visit_type === 'injury' ? 'Injury Visit' :
               'Vision Visit'}
            </h2>
            <p className="visit-header-date">{formatDate(visit.visit_date)}</p>
          </div>

          <Tabs
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'visit' | 'history' | 'attachments')}
            tabs={[
              {
                id: 'visit',
                label: 'Visit',
                content: (
                  <div className="visit-tab-content">
                    {/* Basic Information - Stacked Vertically */}
                    <div className="visit-info-stacked">
                      {visit.visit_type === 'wellness' && visit.title && (
                        <div className="visit-info-item">
                          <span className="visit-info-label">Title:</span>
                          <span className="visit-title-badge">{visit.title}</span>
                        </div>
                      )}
                      {visit.location && (
                        <div className="visit-info-item">
                          <span className="visit-info-label">Location:</span>
                          <span className="visit-info-value">{visit.location}</span>
                        </div>
                      )}
                      {visit.doctor_name && (
                        <div className="visit-info-item">
                          <span className="visit-info-label">Doctor:</span>
                          <span className="visit-info-value">{visit.doctor_name}</span>
                        </div>
                      )}
                    </div>
                    {visit.tags && visit.tags.length > 0 && (
                      <div className="visit-tags">
                        {visit.tags.map((tag, index) => (
                          <span key={index} className="tag-badge">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Illness/Injury/Vision Information */}
                    {visit.visit_type === 'sick' && (
                      <div className="visit-info-stacked">
                        {visit.illnesses && visit.illnesses.length > 0 && (
                          <div className="visit-info-item">
                            <span className="visit-info-label">Illnesses:</span>
                            <span className="visit-info-value">{visit.illnesses.map(i => i.replace('_', ' ')).join(', ')}</span>
                          </div>
                        )}
                        {visit.temperature && (
                          <div className="visit-info-item">
                            <span className="visit-info-label">Temperature:</span>
                            <span className="visit-info-value">{visit.temperature}°F</span>
                          </div>
                        )}
                        {visit.illness_start_date && (
                          <div className="visit-info-item">
                            <span className="visit-info-label">Illness start:</span>
                            <span className="visit-info-value">{formatDate(visit.illness_start_date)}</span>
                          </div>
                        )}
                        {visit.end_date && (
                          <div className="visit-info-item">
                            <span className="visit-info-label">Resolved:</span>
                            <span className="visit-info-value">{formatDate(visit.end_date)}</span>
                          </div>
                        )}
                        {visit.symptoms && (
                          <div className="visit-info-item">
                            <span className="visit-info-label">Symptoms:</span>
                            <span className="visit-info-value">{visit.symptoms}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {visit.visit_type === 'injury' && (
                      <div className="visit-info-stacked">
                        {visit.injury_type && (
                          <div className="visit-info-item">
                            <span className="visit-info-label">Injury Type:</span>
                            <span className="visit-info-value">{visit.injury_type}</span>
                          </div>
                        )}
                        {visit.injury_location && (
                          <div className="visit-info-item">
                            <span className="visit-info-label">Injury Location:</span>
                            <span className="visit-info-value">{visit.injury_location}</span>
                          </div>
                        )}
                        {visit.treatment && (
                          <div className="visit-info-item">
                            <span className="visit-info-label">Treatment:</span>
                            <span className="visit-info-value">{visit.treatment}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {visit.visit_type === 'vision' && (
                      <div className="visit-info-stacked">
                        {(visit as any).vision_refraction ? (
                          <div className="visit-info-item">
                            <VisionRefractionCard value={(visit as any).vision_refraction} onChange={() => {}} readOnly />
                          </div>
                        ) : visit.vision_prescription ? (
                          <div className="visit-info-item">
                            <span className="visit-info-label">👁️ Prescription:</span>
                            <span className="visit-info-value">{visit.vision_prescription}</span>
                          </div>
                        ) : null}
                        <div className="visit-info-item">
                          <span className="visit-info-label">Ordered Glasses:</span>
                          <span className="visit-info-value">{(visit as any).ordered_glasses ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="visit-info-item">
                          <span className="visit-info-label">Ordered Contacts:</span>
                          <span className="visit-info-value">{(visit as any).ordered_contacts ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    )}

                    {/* Measurements Section */}
                    {(visit.weight_value || visit.height_value || visit.head_circumference_value || visit.bmi_value || visit.blood_pressure || visit.heart_rate) && (
                      <div className="visit-measurements-section">
                        <h3 className="visit-section-header">Measurements</h3>
                        <div className="visit-measurements-grid">
                          {visit.weight_value && (
                            <div className="measurement-card">
                              <div className="measurement-card-label">Weight</div>
                              <div className="measurement-card-value">
                                {visit.weight_value}{visit.weight_ounces ? ` + ${visit.weight_ounces}oz` : 'lbs'}
                              </div>
                              {visit.weight_percentile && (
                                <div className="measurement-card-percentile">{visit.weight_percentile}th %ile</div>
                              )}
                            </div>
                          )}
                          {visit.height_value && (
                            <div className="measurement-card">
                              <div className="measurement-card-label">Height</div>
                              <div className="measurement-card-value">{visit.height_value}"</div>
                              {visit.height_percentile && (
                                <div className="measurement-card-percentile">{visit.height_percentile}th %ile</div>
                              )}
                            </div>
                          )}
                          {visit.head_circumference_value && (
                            <div className="measurement-card">
                              <div className="measurement-card-label">Head Circ</div>
                              <div className="measurement-card-value">{visit.head_circumference_value}"</div>
                              {visit.head_circumference_percentile && (
                                <div className="measurement-card-percentile">{visit.head_circumference_percentile}th %ile</div>
                              )}
                            </div>
                          )}
                          {visit.bmi_value && (
                            <div className="measurement-card">
                              <div className="measurement-card-label">BMI</div>
                              <div className="measurement-card-value">{visit.bmi_value}</div>
                              {visit.bmi_percentile && (
                                <div className="measurement-card-percentile">{visit.bmi_percentile}th %ile</div>
                              )}
                            </div>
                          )}
                          {visit.blood_pressure && (
                            <div className="measurement-card">
                              <div className="measurement-card-label">Blood Pressure</div>
                              <div className="measurement-card-value">{visit.blood_pressure}</div>
                            </div>
                          )}
                          {visit.heart_rate && (
                            <div className="measurement-card">
                              <div className="measurement-card-label">Heart Rate</div>
                              <div className="measurement-card-value">{visit.heart_rate} bpm</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Compact Vaccines */}
                    {visit.vaccines_administered && visit.vaccines_administered.length > 0 && (
                      <div className="visit-vaccines-compact">
                        <span className="visit-vaccines-label">Vaccines:</span>
                        <div className="visit-vaccines-badges">
                          {visit.vaccines_administered.map((vaccine, index) => (
                            <span key={index} className="vaccine-badge-compact">
                              {vaccine}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescriptions */}
                    {visit.prescriptions && visit.prescriptions.length > 0 && (
                      <div className="visit-prescriptions-compact">
                        {visit.prescriptions.map((rx, index) => (
                          <div key={index} className="prescription-compact">
                            <strong>{rx.medication}</strong> - {rx.dosage} for {rx.duration}
                            {rx.notes && <span className="prescription-notes"> ({rx.notes})</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    {visit.notes && (
                      <div className="visit-notes-section">
                        <h3 className="visit-section-header">Notes</h3>
                        <p className="visit-notes-text">{visit.notes}</p>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: 'history',
                label: 'History',
                content: (
                  <div>
                    <VisitHistory history={history} loading={loadingHistory} user={user} />
                  </div>
                ),
              },
              ...(attachments.length > 0 ? [{
                id: 'attachments',
                label: 'Attachments',
                content: (
                  <div className="visit-attachments-tab">
                    {loadingAttachments ? (
                      <div className="attachments-loading">Loading attachments...</div>
                    ) : (
                      <VisitAttachmentsList
                        attachments={attachments}
                        onDelete={handleAttachmentDelete}
                        readOnly={false}
                        visitId={visit.id}
                        onUpdate={() => loadAttachments(visit.id)}
                      />
                    )}
                  </div>
                ),
              }] : []),
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

interface VisitHistoryProps {
  history: AuditHistoryEvent[];
  loading: boolean;
  user: { name: string } | null;
}

function VisitHistory({ history, loading, user }: VisitHistoryProps) {
  const [selectedEntry, setSelectedEntry] = useState<AuditHistoryEvent | null>(null);

  const handleCloseModal = () => setSelectedEntry(null);

  useEffect(() => {
    if (!selectedEntry) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [selectedEntry]);

  if (loading) {
    return <div className="visit-history-loading">Loading history...</div>;
  }

  if (history.length === 0) {
    return <div className="visit-history-empty">No history available</div>;
  }

  return (
    <>
      <div className="visit-history-list-compact" role="list">
        {history.map((entry) => {
          const dateDisplay = safeFormatDateTime(entry.changed_at);
          const summaryDisplay = entry.summary ?? (entry.action === 'created' ? 'Visit created' : entry.action === 'updated' ? 'Updated' : entry.action === 'deleted' ? 'Deleted' : entry.action);
          return (
            <button
              key={entry.id}
              type="button"
              className="visit-history-entry-compact visit-history-entry-clickable"
              onClick={() => setSelectedEntry(entry)}
              role="listitem"
            >
              <span className="visit-history-icon-compact" aria-hidden>
                {entry.action === 'created' ? '➕' : entry.action === 'updated' ? '✏️' : entry.action === 'deleted' ? '🗑️' : '📎'}
              </span>
              <span className="visit-history-description-compact">{summaryDisplay}</span>
              <span className="visit-history-date-compact">{dateDisplay}</span>
              <span className="visit-history-user-compact">{entry.user_name || user?.name || 'Unknown'}</span>
              <span className="visit-history-chevron" aria-hidden>›</span>
            </button>
          );
        })}
      </div>

      {selectedEntry && (
        <div
          className="history-detail-overlay"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-detail-title"
        >
          <div
            className="history-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-detail-header">
              <h2 id="history-detail-title" className="history-detail-title">
                {selectedEntry.summary ?? (selectedEntry.action === 'created' ? 'Visit created' : selectedEntry.action === 'updated' ? 'Updated' : selectedEntry.action === 'deleted' ? 'Deleted' : selectedEntry.action)}
              </h2>
              <button
                type="button"
                className="history-detail-close"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="history-detail-meta">
              <span className="history-detail-date">{safeFormatDateTime(selectedEntry.changed_at)}</span>
              <span className="history-detail-sep">·</span>
              <span className="history-detail-user">{selectedEntry.user_name || user?.name || 'Unknown'}</span>
            </div>
            <div className="history-detail-body">
              {selectedEntry.changes && Object.keys(selectedEntry.changes).length > 0 ? (
                <AuditDiffView
                  changes={selectedEntry.changes}
                  fieldLabels={{ _legacy: 'Note' }}
                />
              ) : (
                <p className="history-detail-empty">No field-level changes recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VisitDetailPage;
