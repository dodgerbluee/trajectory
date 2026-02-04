import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import type { AuditHistoryEvent } from '@shared/types/api';
import { formatDate, formatTime, safeFormatDateTime } from '@lib/date-utils';
import { getGoogleCalendarAddEventUrl } from '@lib/calendar-export';
import { getVisitTypeLabel } from '@shared/lib/visit-labels';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Notification from '@shared/components/Notification';
import { VisitAttachmentsList } from '@features/visits';
import Tabs from '@shared/components/Tabs';
import { useAuth } from '../../../contexts/AuthContext';
import { useFamilyPermissions } from '../../../contexts/FamilyPermissionsContext';
import { VisionRefractionCard } from '@features/medical';
import { AuditDiffView } from '@features/documents';
// Import the new helpers for cognitive load reduction
import { useVisitDetail } from '../hooks';
import { isUpcomingVisit, getVisitTypeTitle, getCalendarExportTitle } from '../lib';
import layoutStyles from '@shared/styles/visit-detail-layout.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';
import styles from './VisitDetailPage.module.css';

function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { canEdit } = useFamilyPermissions();

  // Use the new hook that handles all visit detail data and state
  const visitDetail = useVisitDetail(id ? parseInt(id) : undefined);
  const { visit, child, attachments, history, loading, error, deleting, notification, deleteVisit, deleteAttachment, setNotification } = visitDetail;

  // UI state (local to this component)
  const [activeTab, setActiveTab] = useState<'visit' | 'history' | 'attachments'>('visit');

  // Auto-switch to visit tab if no attachments
  useEffect(() => {
    if (activeTab === 'attachments' && attachments.length === 0) {
      setActiveTab('visit');
    }
  }, [attachments.length, activeTab]);

  /**
   * Handle user request to delete the visit
   * Shows confirmation dialog, then calls the deleteVisit hook
   */
  const handleDeleteClick = async () => {
    if (!window.confirm('Are you sure you want to delete this visit? This action cannot be undone.')) {
      return;
    }

    const success = await deleteVisit();
    if (success && visit?.child_id) {
      setTimeout(() => {
        navigate(`/children/${visit.child_id}`);
      }, 1000);
    }
  };

  /**
   * Handle exporting visit to Google Calendar
   */
  const handleExportToCalendar = () => {
    if (!visit || !child) return;

    const typeLabel = getVisitTypeLabel(visit.visit_type);
    const title = getCalendarExportTitle(child.name, typeLabel);
    const url = getGoogleCalendarAddEventUrl({
      title,
      date: visit.visit_date,
      time: visit.visit_time ?? null,
      location: visit.location ?? null,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <LoadingSpinner message="Loading visit..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => visitDetail.loadVisitDetails()} />;
  }

  if (!visit || !child) {
    return <ErrorMessage message="Visit not found" />;
  }

  // Determine if this is an upcoming visit (shows limited form)
  const isFuture = isUpcomingVisit(visit);

  return (
    <div className={pageLayout.pageContainer}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Card>
        <div className={layoutStyles.detailBody}>
          {/* Header with Back button and Actions */}
          <div className={layoutStyles.detailHeader}>
            <Link to={`/children/${visit.child_id}`} className={pageLayout.breadcrumb}>
              ← Back to {child.name}
            </Link>
            <div className={layoutStyles.detailActions}>
              <Button variant="secondary" size="sm" onClick={handleExportToCalendar}>
                Export to Calendar
              </Button>
              {canEdit && (
                <>
                  <Link 
                    to={`/visits/${visit.id}/edit`}
                    state={{ childId: visit.child_id, fromChild: (location.state as { fromChild?: boolean })?.fromChild || false }}
                  >
                    <Button variant="secondary" size="sm">{isFuture ? 'Edit appointment' : 'Edit Visit'}</Button>
                  </Link>
                  <Button variant="danger" size="sm" onClick={handleDeleteClick} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete Visit'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Visit Header */}
          <div>
            <h2 className={styles.headerTitle}>
              {getVisitTypeTitle(visit.visit_type)}
              {isFuture && <span className={styles.headerBadge}>Upcoming</span>}
            </h2>
            <p className={styles.headerDate}>
              {formatDate(visit.visit_date)}
              {visit.visit_time && <span className={styles.visitHeaderTime}> at {formatTime(visit.visit_time)}</span>}
            </p>
          </div>

          <Tabs
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'visit' | 'history' | 'attachments')}
            tabs={[
              {
                id: 'visit',
                label: 'Visit',
                content: (
                  <div className={styles.tabContent}>
                    {/* Basic Information - Stacked Vertically */}
                    <div className={styles.infoStacked}>
                      {visit.visit_type === 'wellness' && visit.title && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Title:</span>
                          <span className={styles.titleBadge}>{visit.title}</span>
                        </div>
                      )}
                      {visit.location && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Location:</span>
                          <span className={styles.infoValue}>{visit.location}</span>
                        </div>
                      )}
                      {visit.doctor_name && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Doctor:</span>
                          <span className={styles.infoValue}>{visit.doctor_name}</span>
                        </div>
                      )}
                    </div>
                    {visit.tags && visit.tags.length > 0 && (
                      <div className={styles.visitTags}>
                        {visit.tags.map((tag, index) => (
                          <span key={index} className={styles.tagBadge}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pre-appointment notes always visible */}
                    {visit.notes && (
                      <div className={styles.notesSection}>
                        <h3 className={styles.sectionHeader}>Notes</h3>
                        <p className={styles.notesText}>{visit.notes}</p>
                      </div>
                    )}

                    {/* Outcome sections only when not a future visit */}
                    {!isFuture && visit.visit_type === 'sick' && (
                      <div className={styles.infoStacked}>
                        {'illnesses' in visit && visit.illnesses && visit.illnesses.length > 0 && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Illnesses:</span>
                            <span className={styles.infoValue}>{visit.illnesses.map(i => i.replace('_', ' ')).join(', ')}</span>
                          </div>
                        )}
                        {visit.temperature && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Temperature:</span>
                            <span className={styles.infoValue}>{visit.temperature}°F</span>
                          </div>
                        )}
                        {visit.illness_start_date && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Illness start:</span>
                            <span className={styles.infoValue}>{formatDate(visit.illness_start_date)}</span>
                          </div>
                        )}
                        {visit.end_date && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Resolved:</span>
                            <span className={styles.infoValue}>{formatDate(visit.end_date)}</span>
                          </div>
                        )}
                        {visit.symptoms && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Symptoms:</span>
                            <span className={styles.infoValue}>{visit.symptoms}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!isFuture && visit.visit_type === 'injury' && (
                      <div className={styles.infoStacked}>
                        {visit.injury_type && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Injury Type:</span>
                            <span className={styles.infoValue}>{visit.injury_type}</span>
                          </div>
                        )}
                        {visit.injury_location && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Injury Location:</span>
                            <span className={styles.infoValue}>{visit.injury_location}</span>
                          </div>
                        )}
                        {visit.treatment && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Treatment:</span>
                            <span className={styles.infoValue}>{visit.treatment}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!isFuture && visit.visit_type === 'vision' && (
                      <div className={styles.infoStacked}>
                        {'vision_refraction' in visit && visit.vision_refraction ? (
                          <div className={styles.infoItem}>
                            <VisionRefractionCard value={visit.vision_refraction} onChange={() => {}} readOnly />
                          </div>
                        ) : visit.vision_prescription ? (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>👁️ Prescription:</span>
                            <span className={styles.infoValue}>{visit.vision_prescription}</span>
                          </div>
                        ) : null}
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Ordered Glasses:</span>
                          <span className={styles.infoValue}>{'ordered_glasses' in visit && visit.ordered_glasses ? 'Yes' : 'No'}</span>
                        </div>
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Ordered Contacts:</span>
                          <span className={styles.infoValue}>{'ordered_contacts' in visit && visit.ordered_contacts ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    )}

                    {!isFuture && visit.visit_type === 'dental' && (
                      <div className={styles.infoStacked}>
                        {'dental_procedure_type' in visit && visit.dental_procedure_type && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Dental Visit Type:</span>
                            <span className={styles.infoValue}>{visit.dental_procedure_type}</span>
                          </div>
                        )}
                        {'cleaning_type' in visit && visit.cleaning_type && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Cleaning Type:</span>
                            <span className={styles.infoValue}>{visit.cleaning_type}</span>
                          </div>
                        )}
                        {'cavities_found' in visit && visit.cavities_found !== null && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Cavities Found:</span>
                            <span className={styles.infoValue}>{visit.cavities_found}</span>
                          </div>
                        )}
                        {'cavities_filled' in visit && visit.cavities_filled !== null && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Cavities Filled:</span>
                            <span className={styles.infoValue}>{visit.cavities_filled}</span>
                          </div>
                        )}
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>X-Rays Taken:</span>
                          <span className={styles.infoValue}>{'xrays_taken' in visit && visit.xrays_taken ? 'Yes' : 'No'}</span>
                        </div>
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Fluoride Treatment:</span>
                          <span className={styles.infoValue}>{'fluoride_treatment' in visit && visit.fluoride_treatment ? 'Yes' : 'No'}</span>
                        </div>
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Sealants Applied:</span>
                          <span className={styles.infoValue}>{'sealants_applied' in visit && visit.sealants_applied ? 'Yes' : 'No'}</span>
                        </div>
                        {'next_appointment_date' in visit && visit.next_appointment_date && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Next Appointment:</span>
                            <span className={styles.infoValue}>{formatDate(visit.next_appointment_date)}</span>
                          </div>
                        )}
                        {'dental_notes' in visit && visit.dental_notes && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Notes:</span>
                            <span className={styles.infoValue}>{visit.dental_notes}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Measurements Section - only for past/today visits */}
                    {!isFuture && (visit.weight_value || visit.height_value || visit.head_circumference_value || visit.bmi_value || visit.blood_pressure || visit.heart_rate) && (
                      <div className={styles.measurementsSection}>
                        <h3 className={styles.sectionHeader}>Measurements</h3>
                        <div className={styles.measurementsGrid}>
                          {visit.weight_value && (
                            <div className={styles.measurementCard}>
                              <div className={styles.measurementCardLabel}>Weight</div>
                              <div className={styles.measurementCardValue}>
                                {visit.weight_value}{visit.weight_ounces ? ` + ${visit.weight_ounces}oz` : 'lbs'}
                              </div>
                              {visit.weight_percentile && (
                                <div className={styles.measurementCardPercentile}>{visit.weight_percentile}th %ile</div>
                              )}
                            </div>
                          )}
                          {visit.height_value && (
                            <div className={styles.measurementCard}>
                              <div className={styles.measurementCardLabel}>Height</div>
                              <div className={styles.measurementCardValue}>{visit.height_value}"</div>
                              {visit.height_percentile && (
                                <div className={styles.measurementCardPercentile}>{visit.height_percentile}th %ile</div>
                              )}
                            </div>
                          )}
                          {visit.head_circumference_value && (
                            <div className={styles.measurementCard}>
                              <div className={styles.measurementCardLabel}>Head Circ</div>
                              <div className={styles.measurementCardValue}>{visit.head_circumference_value}"</div>
                              {visit.head_circumference_percentile && (
                                <div className={styles.measurementCardPercentile}>{visit.head_circumference_percentile}th %ile</div>
                              )}
                            </div>
                          )}
                          {visit.bmi_value && (
                            <div className={styles.measurementCard}>
                              <div className={styles.measurementCardLabel}>BMI</div>
                              <div className={styles.measurementCardValue}>{visit.bmi_value}</div>
                              {visit.bmi_percentile && (
                                <div className={styles.measurementCardPercentile}>{visit.bmi_percentile}th %ile</div>
                              )}
                            </div>
                          )}
                          {visit.blood_pressure && (
                            <div className={styles.measurementCard}>
                              <div className={styles.measurementCardLabel}>Blood Pressure</div>
                              <div className={styles.measurementCardValue}>{visit.blood_pressure}</div>
                            </div>
                          )}
                          {visit.heart_rate && (
                            <div className={styles.measurementCard}>
                              <div className={styles.measurementCardLabel}>Heart Rate</div>
                              <div className={styles.measurementCardValue}>{visit.heart_rate} bpm</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Compact Vaccines - only for past/today visits */}
                    {!isFuture && visit.vaccines_administered && visit.vaccines_administered.length > 0 && (
                      <div className={styles.vaccinesCompact}>
                        <span className={styles.vaccinesLabel}>Vaccines:</span>
                        <div className={styles.vaccinesBadges}>
                          {visit.vaccines_administered.map((vaccine, index) => (
                            <span key={index} className={styles.vaccineBadgeCompact}>
                              {vaccine}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescriptions - only for past/today visits */}
                    {!isFuture && visit.prescriptions && visit.prescriptions.length > 0 && (
                      <div className={styles.prescriptionsCompact}>
                        {visit.prescriptions.map((rx, index) => (
                          <div key={index} className={styles.prescriptionCompact}>
                            <strong>{rx.medication}</strong> - {rx.dosage} for {rx.duration}
                            {rx.notes && <span className={styles.prescriptionNotes}> ({rx.notes})</span>}
                          </div>
                        ))}
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
                    <VisitHistory history={history} loading={visitDetail.loadingHistory} user={user} />
                  </div>
                ),
              },
              ...(attachments.length > 0 ? [{
                id: 'attachments',
                label: 'Attachments',
                content: (
                  <div className={styles.attachmentsTab}>
                    {visitDetail.loadingAttachments ? (
                      <div>Loading attachments...</div>
                    ) : (
                      <VisitAttachmentsList
                        attachments={attachments}
                        onDelete={deleteAttachment}
                        readOnly={false}
                        visitId={visit.id}
                        onUpdate={() => visitDetail.loadVisitDetails()}
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
  user: { username: string } | null;
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
    return <div className={styles.historyListCompact}>Loading history...</div>;
  }

  if (history.length === 0) {
    return <div className={styles.historyListCompact}>No history available</div>;
  }

  return (
    <>
      <div className={styles.historyListCompact} role="list">
        {history.map((entry) => {
          const dateDisplay = safeFormatDateTime(entry.changed_at);
          const summaryDisplay = entry.summary ?? (entry.action === 'created' ? 'Visit created' : entry.action === 'updated' ? 'Updated' : entry.action === 'deleted' ? 'Deleted' : entry.action);
          return (
            <button
              key={entry.id}
              type="button"
              className={`${styles.historyEntryCompact} ${styles.historyEntryClickable}`}
              onClick={() => setSelectedEntry(entry)}
              role="listitem"
            >
              <span className={styles.historyIconCompact} aria-hidden>
                {entry.action === 'created' ? '➕' : entry.action === 'updated' ? '✏️' : entry.action === 'deleted' ? '🗑️' : '📎'}
              </span>
              <span className={styles.historyDescriptionCompact}>{summaryDisplay}</span>
              <span className={styles.historyDateCompact}>{dateDisplay}</span>
              <span className={styles.historyUserCompact}>{entry.user_name || user?.username || 'Unknown'}</span>
              <span className={styles.historyChevron} aria-hidden>›</span>
            </button>
          );
        })}
      </div>

      {selectedEntry && (
        <div
          className={styles.historyDetailOverlay}
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-detail-title"
        >
          <div
            className={styles.historyDetailModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.historyDetailHeader}>
              <h2 id="history-detail-title" className={styles.historyDetailTitle}>
                {selectedEntry.summary ?? (selectedEntry.action === 'created' ? 'Visit created' : selectedEntry.action === 'updated' ? 'Updated' : selectedEntry.action === 'deleted' ? 'Deleted' : selectedEntry.action)}
              </h2>
              <button
                type="button"
                className={styles.historyDetailClose}
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.historyDetailMeta}>
              <span className={styles.historyDetailDate}>{safeFormatDateTime(selectedEntry.changed_at)}</span>
              <span className={styles.historyDetailSep}>·</span>
              <span>{selectedEntry.user_name || user?.username || 'Unknown'}</span>
            </div>
            <div className={styles.historyDetailBody}>
              {selectedEntry.changes && Object.keys(selectedEntry.changes).length > 0 ? (
                <AuditDiffView
                  changes={selectedEntry.changes}
                  fieldLabels={{ _legacy: 'Note' }}
                />
              ) : (
                <p className={styles.historyDetailEmpty}>No field-level changes recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VisitDetailPage;
