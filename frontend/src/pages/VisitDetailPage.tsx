import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Visit, Child, VisitAttachment } from '../types/api';
import { formatDate, formatDateTime } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import Notification from '../components/Notification';
import VisitAttachmentsList from '../components/VisitAttachmentsList';

function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [visit, setVisit] = useState<Visit | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [attachments, setAttachments] = useState<VisitAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  useEffect(() => {
    if (id) {
      loadVisit();
    }
  }, [id]);

  const loadVisit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const visitResponse = await visitsApi.getById(parseInt(id!));
      setVisit(visitResponse.data);

      const childResponse = await childrenApi.getById(visitResponse.data.child_id);
      setChild(childResponse.data);
      
      // Load attachments
      await loadAttachments(parseInt(id!));
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

  const handleAttachmentDelete = (attachmentId: number) => {
    setAttachments(attachments.filter(a => a.id !== attachmentId));
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
      <div className="page-header">
        <div>
          <Link to={`/children/${visit.child_id}`} className="breadcrumb">
            ← Back to {child.name}
          </Link>
          <h1>
            {visit.visit_type === 'wellness' ? '📋 Wellness' : 
             visit.visit_type === 'sick' ? '🤒 Sick' : 
             visit.visit_type === 'injury' ? '🩹 Injury' :
             visit.visit_type === 'vision' ? '👁️ Vision' :
             'Visit'} Visit
          </h1>
          <p className="page-subtitle">{formatDate(visit.visit_date)}</p>
        </div>
        <div className="page-actions">
          <Link 
            to={`/visits/${visit.id}/edit`}
            state={{ childId: visit.child_id, fromChild: (location.state as any)?.fromChild || false }}
          >
            <Button variant="secondary">Edit Visit</Button>
          </Link>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Visit'}
          </Button>
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Card title="Visit Details">
        <div className="visit-detail-body">
          {/* Basic Information Section */}
          <div className="visit-detail-section">
            <h3 className="visit-detail-section-title">Basic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Date:</strong>
                <span>{formatDate(visit.visit_date)}</span>
              </div>
              <div className="detail-item">
                <strong>Type:</strong>
                <span>
                  {visit.visit_type === 'wellness' ? 'Wellness Visit' : 
                   visit.visit_type === 'sick' ? 'Sick Visit' : 
                   visit.visit_type === 'injury' ? 'Injury Visit' :
                   'Vision Visit'}
                </span>
              </div>
              {visit.visit_type === 'wellness' && visit.title && (
                <div className="detail-item">
                  <strong>Title:</strong>
                  <span className="wellness-title-badge">{visit.title}</span>
                </div>
              )}
              {visit.location && (
                <div className="detail-item">
                  <strong>Location:</strong>
                  <span>{visit.location}</span>
                </div>
              )}
              {visit.doctor_name && (
                <div className="detail-item">
                  <strong>Doctor:</strong>
                  <span>{visit.doctor_name}</span>
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
          </div>

          {/* Illness/Injury Information Section */}
          {visit.visit_type === 'sick' && (
            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Illness Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <strong>Illness Type:</strong>
                  <span>{visit.illness_type?.replace('_', ' ')}</span>
                </div>
                {visit.temperature && (
                  <div className="detail-item">
                    <strong>Temperature:</strong>
                    <span>{visit.temperature}°F</span>
                  </div>
                )}
                {visit.end_date && (
                  <div className="detail-item">
                    <strong>Resolved:</strong>
                    <span>{formatDate(visit.end_date)}</span>
                  </div>
                )}
              </div>
              {visit.symptoms && (
                <div className="detail-item">
                  <strong>Symptoms:</strong>
                  <p>{visit.symptoms}</p>
                </div>
              )}
            </div>
          )}

          {visit.visit_type === 'injury' && (
            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Injury Information</h3>
              <div className="detail-grid">
                {visit.injury_type && (
                  <div className="detail-item">
                    <strong>Injury Type:</strong>
                    <span>{visit.injury_type}</span>
                  </div>
                )}
                {visit.injury_location && (
                  <div className="detail-item">
                    <strong>Location:</strong>
                    <span>{visit.injury_location}</span>
                  </div>
                )}
                {visit.follow_up_date && (
                  <div className="detail-item">
                    <strong>Follow-up Date:</strong>
                    <span>{formatDate(visit.follow_up_date)}</span>
                  </div>
                )}
              </div>
              {visit.treatment && (
                <div className="detail-item">
                  <strong>Treatment:</strong>
                  <p>{visit.treatment}</p>
                </div>
              )}
            </div>
          )}

          {visit.visit_type === 'vision' && (
            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Vision Information</h3>
              <div className="detail-grid">
                {visit.vision_prescription && (
                  <div className="detail-item">
                    <strong>Prescription:</strong>
                    <p>{visit.vision_prescription}</p>
                  </div>
                )}
                <div className="detail-item">
                  <strong>Needs Glasses:</strong>
                  <span>{visit.needs_glasses ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Measurements Section */}
          {(visit.weight_value || visit.height_value || visit.head_circumference_value || visit.bmi_value || visit.blood_pressure || visit.heart_rate) && (
            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Measurements</h3>
              <div className="measurements-grid">
                {visit.weight_value && (
                  <div className="measurement-item">
                    <div className="measurement-label">Weight</div>
                    <div className="measurement-value">
                      {visit.weight_value} {visit.weight_ounces ? `+ ${visit.weight_ounces} oz` : 'lbs'}
                    </div>
                    {visit.weight_percentile && (
                      <div className="measurement-percentile">{visit.weight_percentile}th %ile</div>
                    )}
                  </div>
                )}
                {visit.height_value && (
                  <div className="measurement-item">
                    <div className="measurement-label">Height</div>
                    <div className="measurement-value">{visit.height_value}"</div>
                    {visit.height_percentile && (
                      <div className="measurement-percentile">{visit.height_percentile}th %ile</div>
                    )}
                  </div>
                )}
                {visit.head_circumference_value && (
                  <div className="measurement-item">
                    <div className="measurement-label">Head Circ.</div>
                    <div className="measurement-value">{visit.head_circumference_value}"</div>
                    {visit.head_circumference_percentile && (
                      <div className="measurement-percentile">{visit.head_circumference_percentile}th %ile</div>
                    )}
                  </div>
                )}
                {visit.bmi_value && (
                  <div className="measurement-item">
                    <div className="measurement-label">BMI</div>
                    <div className="measurement-value">{visit.bmi_value}</div>
                    {visit.bmi_percentile && (
                      <div className="measurement-percentile">{visit.bmi_percentile}th %ile</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vaccines Section */}
          {visit.vaccines_administered && visit.vaccines_administered.length > 0 && (
            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Vaccines Administered</h3>
              <div className="vaccines-list">
                {visit.vaccines_administered.map((vaccine, index) => (
                  <span key={index} className="vaccine-badge">
                    💉 {vaccine}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions Section */}
          {visit.prescriptions && visit.prescriptions.length > 0 && (
            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Prescriptions</h3>
              {visit.prescriptions.map((rx, index) => (
                <div key={index} className="prescription-detail">
                  <h4>{rx.medication}</h4>
                  <p><strong>Dosage:</strong> {rx.dosage}</p>
                  <p><strong>Duration:</strong> {rx.duration}</p>
                  {rx.notes && <p><strong>Notes:</strong> {rx.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Notes Section */}
          {visit.notes && (
            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Notes</h3>
              <p>{visit.notes}</p>
            </div>
          )}

          {/* Attachments Section */}
          <div className="visit-detail-section">
            <h3 className="visit-detail-section-title">Attachments</h3>
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

          {/* History Section */}
          <div className="visit-detail-section">
            <h3 className="visit-detail-section-title">History</h3>
            <VisitHistory visit={visit} attachments={attachments} />
          </div>
        </div>
      </Card>
    </div>
  );
}

interface VisitHistoryProps {
  visit: Visit;
  attachments: VisitAttachment[];
}

function VisitHistory({ visit, attachments }: VisitHistoryProps) {
  const historyEntries = useMemo(() => {
    const entries: Array<{ type: 'created' | 'updated' | 'attachment'; date: string; description: string }> = [];

    // Visit creation
    entries.push({
      type: 'created',
      date: visit.created_at,
      description: 'Visit created',
    });

    // Visit updates (if updated_at is different from created_at)
    if (visit.updated_at && visit.updated_at !== visit.created_at) {
      entries.push({
        type: 'updated',
        date: visit.updated_at,
        description: 'Visit updated',
      });
    }

    // Document uploads
    attachments.forEach(attachment => {
      entries.push({
        type: 'attachment',
        date: attachment.created_at,
        description: `Document uploaded: ${attachment.original_filename}`,
      });
    });

    // Sort by date (most recent first)
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visit, attachments]);

  if (historyEntries.length === 0) {
    return <div className="visit-history-empty">No history available</div>;
  }

  return (
    <div className="visit-history-list">
      {historyEntries.map((entry, index) => (
        <div key={index} className="visit-history-entry">
          <div className="visit-history-icon">
            {entry.type === 'created' ? '➕' : entry.type === 'updated' ? '✏️' : '📎'}
          </div>
          <div className="visit-history-content">
            <div className="visit-history-description">{entry.description}</div>
            <div className="visit-history-date">{formatDateTime(entry.date)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default VisitDetailPage;
