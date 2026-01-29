import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { illnessesApi, childrenApi, visitsApi, ApiClientError } from '../lib/api-client';
import type { Illness, Child, Visit } from '../types/api';
import { formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import Notification from '../components/Notification';

const SEVERITY_LABELS: Record<number, string> = {
  1: '1 - Barely noticeable',
  2: '2 - Mild discomfort',
  3: '3 - Slightly uncomfortable',
  4: '4 - Uncomfortable',
  5: '5 - Moderate discomfort',
  6: '6 - Noticeable pain',
  7: '7 - Significant pain',
  8: '8 - Severe pain',
  9: '9 - Very severe pain',
  10: '10 - Extreme pain',
};

function IllnessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [illness, setIllness] = useState<Illness | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [linkedVisit, setLinkedVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (id) {
      loadIllness();
    }
  }, [id]);

  const loadIllness = async () => {
    try {
      setLoading(true);
      setError(null);

      const illnessResponse = await illnessesApi.getById(parseInt(id!));
      const fetched = illnessResponse.data;
      setIllness(fetched);

      const childResponse = await childrenApi.getById(fetched.child_id);
      setChild(childResponse.data);

      if (fetched.visit_id) {
        try {
          const visitResponse = await visitsApi.getById(fetched.visit_id);
          setLinkedVisit(visitResponse.data);
        } catch {
          setLinkedVisit(null);
        }
      } else {
        setLinkedVisit(null);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load illness');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this illness record? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await illnessesApi.delete(parseInt(id!));
      setNotification({ message: 'Illness deleted successfully', type: 'success' });
      setTimeout(() => {
        navigate(child ? `/children/${child.id}` : '/', { state: { tab: 'illnesses' } });
      }, 1000);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to delete illness', type: 'error' });
      }
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading illness..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadIllness} />;
  }

  if (!illness || !child) {
    return <ErrorMessage message="Illness not found" />;
  }

  const illnessTypeLabel = illness.illness_type ? illness.illness_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Illness';

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
            <Link to={`/children/${illness.child_id}`} className="breadcrumb">
              ← Back to {child.name}
            </Link>
            <div className="visit-detail-actions">
              <Link to={`/illnesses/${illness.id}/edit`} state={{ childId: illness.child_id, fromChild: true }}>
                <Button variant="secondary" size="sm">Edit Illness</Button>
              </Link>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Illness'}
              </Button>
            </div>
          </div>

          {/* Illness Header */}
          <div>
            <h2 className="visit-header-title">{illnessTypeLabel}</h2>
            <p className="visit-header-date">{formatDate(illness.start_date)}</p>
          </div>

          {/* Illness details - same section style as visit detail */}
          <div className="visit-tab-content">
            <div className="visit-info-stacked">
              <div className="visit-info-item">
                <span className="visit-info-label">Child:</span>
                <span className="visit-info-value">{child.name}</span>
              </div>
              <div className="visit-info-item">
                <span className="visit-info-label">Illness type:</span>
                <span className="visit-info-value">{illnessTypeLabel}</span>
              </div>
              <div className="visit-info-item">
                <span className="visit-info-label">Start date:</span>
                <span className="visit-info-value">{formatDate(illness.start_date)}</span>
              </div>
              {illness.end_date && (
                <div className="visit-info-item">
                  <span className="visit-info-label">End date:</span>
                  <span className="visit-info-value">{formatDate(illness.end_date)}</span>
                </div>
              )}
              {illness.temperature != null && (
                <div className="visit-info-item">
                  <span className="visit-info-label">Temperature / Fever:</span>
                  <span className="visit-info-value">{illness.temperature}°F</span>
                </div>
              )}
              {illness.severity != null && (
                <div className="visit-info-item">
                  <span className="visit-info-label">Severity:</span>
                  <span className="visit-info-value">{SEVERITY_LABELS[illness.severity] ?? illness.severity}</span>
                </div>
              )}
              {linkedVisit && (
                <div className="visit-info-item">
                  <span className="visit-info-label">Linked visit:</span>
                  <Link to={`/visits/${linkedVisit.id}`} className="visit-info-value" style={{ textDecoration: 'underline' }}>
                    {formatDate(linkedVisit.visit_date)} — {linkedVisit.visit_type}
                  </Link>
                </div>
              )}
            </div>

            {illness.symptoms && (
              <div className="visit-notes-section">
                <h3 className="visit-section-header">Symptoms</h3>
                <p className="visit-notes-text">{illness.symptoms}</p>
              </div>
            )}

            {illness.notes && (
              <div className="visit-notes-section">
                <h3 className="visit-section-header">Notes</h3>
                <p className="visit-notes-text">{illness.notes}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default IllnessDetailPage;
